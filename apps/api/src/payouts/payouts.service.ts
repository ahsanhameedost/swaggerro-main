import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  CreatePayoutInput,
  SetCommissionInput,
  UpdatePayoutDetailsInput
} from "./payouts.dto";

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  // Earnings ledger for a store: balance = paid-order earnings − settled payouts.
  private async ledger(storeId: string) {
    const [earned, paidOut] = await this.prisma.$transaction([
      this.prisma.catalogOrder.aggregate({
        where: { storeId, paymentStatus: "PAID" },
        _sum: { sellerEarningCents: true },
        _count: true
      }),
      this.prisma.sellerPayout.aggregate({
        where: { storeId, status: "PAID" },
        _sum: { amountCents: true }
      })
    ]);
    const earnedCents = earned._sum.sellerEarningCents ?? 0;
    const paidOutCents = paidOut._sum.amountCents ?? 0;
    return {
      paidOrders: earned._count,
      earnedCents,
      paidOutCents,
      balanceCents: Math.max(0, earnedCents - paidOutCents)
    };
  }

  private payoutDetails(store: {
    payoutMethod: string | null;
    payoutBankName: string | null;
    payoutAccountName: string | null;
    payoutAccountNumber: string | null;
    payoutRoutingNumber: string | null;
    payoutDetails: string | null;
  }) {
    return {
      payoutMethod: store.payoutMethod,
      payoutBankName: store.payoutBankName,
      payoutAccountName: store.payoutAccountName,
      payoutAccountNumber: store.payoutAccountNumber,
      payoutRoutingNumber: store.payoutRoutingNumber,
      payoutDetails: store.payoutDetails,
      hasDetails: Boolean(
        store.payoutMethod ||
          store.payoutBankName ||
          store.payoutAccountNumber ||
          store.payoutDetails
      )
    };
  }

  // ---- admin ---------------------------------------------------------------

  async adminListStores() {
    const stores = await this.prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { id: true, email: true, firstName: true, lastName: true } } }
    });
    const rows = await Promise.all(
      stores.map(async (store) => {
        const ledger = await this.ledger(store.id);
        return {
          id: store.id,
          slug: store.slug,
          name: store.name,
          status: store.status,
          commissionPercent: Number(store.commissionPercent),
          owner: store.owner,
          ...ledger,
          ...this.payoutDetails(store)
        };
      })
    );
    return { stores: rows };
  }

  async adminGetStore(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: { select: { id: true, email: true, firstName: true, lastName: true } } }
    });
    if (!store) throw new NotFoundException("Store not found");
    const ledger = await this.ledger(store.id);
    const payouts = await this.prisma.sellerPayout.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    const orders = await this.prisma.catalogOrder.findMany({
      where: { storeId, paymentStatus: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        name: true,
        totalPrice: true,
        sellerEarningCents: true,
        commissionPercent: true,
        paidAt: true
      }
    });
    return {
      store: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        status: store.status,
        commissionPercent: Number(store.commissionPercent),
        owner: store.owner,
        ...ledger,
        ...this.payoutDetails(store)
      },
      payouts: payouts.map((p) => this.serializePayout(p)),
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        name: o.name,
        totalCents: Math.round(Number(o.totalPrice) * 100),
        sellerEarningCents: o.sellerEarningCents ?? 0,
        commissionPercent: o.commissionPercent != null ? Number(o.commissionPercent) : null,
        paidAt: o.paidAt ? o.paidAt.toISOString() : null
      }))
    };
  }

  async setCommission(storeId: string, input: SetCommissionInput) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!store) throw new NotFoundException("Store not found");
    await this.prisma.store.update({
      where: { id: storeId },
      data: { commissionPercent: new Prisma.Decimal(input.commissionPercent) }
    });
    return { ok: true };
  }

  // Admin records a settlement to the seller (the actual bank transfer is manual).
  async createPayout(adminId: string, storeId: string, input: CreatePayoutInput) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, ownerUserId: true, payoutMethod: true }
    });
    if (!store) throw new NotFoundException("Store not found");

    const ledger = await this.ledger(storeId);
    const amountCents = input.amountCents ?? ledger.balanceCents;
    if (amountCents <= 0) throw new BadRequestException("Nothing to pay out");
    if (amountCents > ledger.balanceCents) {
      throw new BadRequestException("Amount exceeds the seller's available balance");
    }

    const payout = await this.prisma.sellerPayout.create({
      data: {
        storeId,
        amountCents,
        status: "PAID",
        method: store.payoutMethod,
        note: input.note?.trim() || null,
        createdById: adminId,
        paidAt: new Date()
      }
    });

    if (store.ownerUserId) {
      await this.notifications.notify({
        userId: store.ownerUserId,
        type: "payout.paid",
        title: "Payout sent",
        body: `A payout of $${(amountCents / 100).toFixed(2)} was sent for ${store.name}.`,
        link: "/seller/payouts"
      });
    }
    return { payout: this.serializePayout(payout) };
  }

  // ---- seller --------------------------------------------------------------

  async sellerSummary(userId: string) {
    const store = await this.prisma.store.findUnique({ where: { ownerUserId: userId } });
    if (!store) throw new NotFoundException("You do not have a store yet");
    const ledger = await this.ledger(store.id);
    const payouts = await this.prisma.sellerPayout.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return {
      store: {
        id: store.id,
        name: store.name,
        commissionPercent: Number(store.commissionPercent),
        ...ledger,
        ...this.payoutDetails(store)
      },
      payouts: payouts.map((p) => this.serializePayout(p))
    };
  }

  async sellerUpdateDetails(userId: string, input: UpdatePayoutDetailsInput) {
    const store = await this.prisma.store.findUnique({ where: { ownerUserId: userId }, select: { id: true } });
    if (!store) throw new NotFoundException("You do not have a store yet");
    await this.prisma.store.update({
      where: { id: store.id },
      data: {
        payoutMethod: input.payoutMethod,
        payoutBankName: input.payoutBankName,
        payoutAccountName: input.payoutAccountName,
        payoutAccountNumber: input.payoutAccountNumber,
        payoutRoutingNumber: input.payoutRoutingNumber,
        payoutDetails: input.payoutDetails
      }
    });
    return { ok: true };
  }

  private serializePayout(p: {
    id: string;
    amountCents: number;
    status: string;
    method: string | null;
    reference: string | null;
    note: string | null;
    paidAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: p.id,
      amountCents: p.amountCents,
      status: p.status,
      method: p.method,
      reference: p.reference,
      note: p.note,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      createdAt: p.createdAt.toISOString()
    };
  }
}
