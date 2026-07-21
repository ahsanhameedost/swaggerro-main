import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  computeCouponDiscount,
  eligibleSubtotal,
  linesSubtotal,
  type CartLineForCoupon,
} from "./coupon-math";
import type { CreateCouponDto, ListCouponsQuery, UpdateCouponDto } from "./dto/coupon.dto";

type CouponRecord = Prisma.CouponGetPayload<{}>;

export type CheckoutCouponInput = {
  code: string;
  lines: CartLineForCoupon[];
  storeId?: string | null;
  userId?: string | null;
};

export type ResolvedCoupon = {
  couponId: string;
  code: string;
  discountAmount: number;
  // Which side funds the discount for THIS order: platform coupons (no storeId)
  // are absorbed by Swaggeroo; a seller's own store coupon comes out of the
  // seller's earnings.
  fundedBy: "PLATFORM" | "SELLER";
};

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private decimal(n: number | null | undefined) {
    return n == null ? null : Number(n);
  }

  private serialize(c: CouponRecord) {
    return {
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      storeId: c.storeId,
      scope: c.storeId ? ("store" as const) : ("platform" as const),
      assignedUserId: c.assignedUserId,
      productIds: c.productIds,
      minSubtotal: this.decimal(c.minSubtotal as unknown as number | null),
      maxDiscount: this.decimal(c.maxDiscount as unknown as number | null),
      usageLimit: c.usageLimit,
      usedCount: c.usedCount,
      startsAt: c.startsAt?.toISOString() ?? null,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      active: c.active,
      createdAt: c.createdAt.toISOString(),
    };
  }

  // ── Seller helper ──────────────────────────────────────────────────────────
  async getSellerStoreId(userId: string): Promise<string> {
    const store = await this.prisma.store.findFirst({
      where: { ownerUserId: userId },
      select: { id: true },
    });
    if (!store) throw new ForbiddenException("No store is linked to your account.");
    return store.id;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  async create(
    input: CreateCouponDto,
    opts: { createdByUserId: string; forcedStoreId?: string | null }
  ) {
    const code = input.code.trim().toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new BadRequestException("A coupon with that code already exists.");

    // Sellers can only make coupons for their own store and can't assign to a user.
    const storeId = opts.forcedStoreId !== undefined ? opts.forcedStoreId : input.storeId ?? null;
    const assignedUserId = opts.forcedStoreId !== undefined ? null : input.assignedUserId ?? null;

    const coupon = await this.prisma.coupon.create({
      data: {
        code,
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: new Prisma.Decimal(input.discountValue),
        storeId,
        createdByUserId: opts.createdByUserId,
        assignedUserId,
        productIds: input.productIds ?? [],
        minSubtotal: input.minSubtotal != null ? new Prisma.Decimal(input.minSubtotal) : null,
        maxDiscount: input.maxDiscount != null ? new Prisma.Decimal(input.maxDiscount) : null,
        usageLimit: input.usageLimit ?? null,
        startsAt: input.startsAt ?? null,
        expiresAt: input.expiresAt ?? null,
        active: input.active ?? true,
      },
    });
    return this.serialize(coupon);
  }

  async list(opts: { query: ListCouponsQuery; restrictStoreId?: string }) {
    const { query, restrictStoreId } = opts;
    const where: Prisma.CouponWhereInput = {};
    if (restrictStoreId) {
      where.storeId = restrictStoreId;
    } else if (query.scope === "platform") {
      where.storeId = null;
    } else if (query.scope === "store") {
      where.storeId = { not: null };
    }
    if (query.search) {
      where.code = { contains: query.search.toUpperCase() };
    }
    const coupons = await this.prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return { coupons: coupons.map((c) => this.serialize(c)) };
  }

  private async loadOwned(id: string, restrictStoreId?: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException("Coupon not found");
    if (restrictStoreId && coupon.storeId !== restrictStoreId) {
      throw new ForbiddenException("You can only manage your own store's coupons.");
    }
    return coupon;
  }

  async update(id: string, input: UpdateCouponDto, opts: { restrictStoreId?: string }) {
    await this.loadOwned(id, opts.restrictStoreId);

    const data: Prisma.CouponUpdateInput = {};
    if (input.code !== undefined) {
      const code = input.code.trim().toUpperCase();
      const clash = await this.prisma.coupon.findFirst({ where: { code, id: { not: id } } });
      if (clash) throw new BadRequestException("A coupon with that code already exists.");
      data.code = code;
    }
    if (input.description !== undefined) data.description = input.description ?? null;
    if (input.discountType !== undefined) data.discountType = input.discountType;
    if (input.discountValue !== undefined) data.discountValue = new Prisma.Decimal(input.discountValue);
    if (input.productIds !== undefined) data.productIds = input.productIds ?? [];
    if (input.minSubtotal !== undefined)
      data.minSubtotal = input.minSubtotal != null ? new Prisma.Decimal(input.minSubtotal) : null;
    if (input.maxDiscount !== undefined)
      data.maxDiscount = input.maxDiscount != null ? new Prisma.Decimal(input.maxDiscount) : null;
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit ?? null;
    if (input.startsAt !== undefined) data.startsAt = input.startsAt ?? null;
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ?? null;
    if (input.active !== undefined) data.active = input.active;
    // storeId / assignedUserId are only settable by admins (no restrictStoreId).
    if (!opts.restrictStoreId) {
      if (input.storeId !== undefined) data.store = input.storeId ? { connect: { id: input.storeId } } : { disconnect: true };
      if (input.assignedUserId !== undefined) data.assignedUserId = input.assignedUserId ?? null;
    }

    const coupon = await this.prisma.coupon.update({ where: { id }, data });
    return this.serialize(coupon);
  }

  async remove(id: string, opts: { restrictStoreId?: string }) {
    await this.loadOwned(id, opts.restrictStoreId);
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  // ── Checkout validation + redemption ───────────────────────────────────────
  /**
   * Validate a coupon for a specific cart/order and return the discount. Throws a
   * BadRequestException with a friendly message when the coupon can't be used.
   */
  async validateForCheckout(input: CheckoutCouponInput): Promise<ResolvedCoupon> {
    const code = input.code.trim().toUpperCase();
    if (!code) throw new BadRequestException("Enter a coupon code.");

    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active) throw new BadRequestException("This coupon code isn't valid.");

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now)
      throw new BadRequestException("This coupon isn't active yet.");
    if (coupon.expiresAt && coupon.expiresAt < now)
      throw new BadRequestException("This coupon has expired.");
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
      throw new BadRequestException("This coupon has reached its usage limit.");

    // Scope: a store coupon only works on that store; a platform coupon works
    // anywhere. (A store checkout may still use a platform coupon.)
    if (coupon.storeId && coupon.storeId !== (input.storeId ?? null))
      throw new BadRequestException("This coupon isn't valid on this store.");

    if (coupon.assignedUserId) {
      if (!input.userId) throw new BadRequestException("Sign in to use this coupon.");
      if (coupon.assignedUserId !== input.userId)
        throw new BadRequestException("This coupon is reserved for a different account.");
    }

    const subtotal = linesSubtotal(input.lines);
    if (coupon.minSubtotal != null && subtotal < Number(coupon.minSubtotal)) {
      throw new BadRequestException(
        `Add ${this.formatMoney(Number(coupon.minSubtotal))} of eligible items to use this coupon.`
      );
    }

    const eligible = eligibleSubtotal(coupon.productIds, input.lines);
    if (eligible <= 0)
      throw new BadRequestException("This coupon doesn't apply to the items in your cart.");

    const discountAmount = computeCouponDiscount(
      {
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null,
        productIds: coupon.productIds,
      },
      eligible
    );
    if (discountAmount <= 0)
      throw new BadRequestException("This coupon doesn't reduce your total.");

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountAmount,
      fundedBy: coupon.storeId ? "SELLER" : "PLATFORM",
    };
  }

  /** Increment usage. Best-effort — a failure must never fail a paid order. */
  async redeem(couponId: string) {
    try {
      await this.prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    } catch {
      /* ignore — the payment already succeeded */
    }
  }

  private formatMoney(n: number) {
    return "$" + n.toFixed(2);
  }
}
