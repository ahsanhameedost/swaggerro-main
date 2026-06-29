import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { env } from "../../env";
import { NotificationsService } from "../../notifications/notifications.service";
import type {
  ConfirmStoreCheckoutInput,
  CreateStoreCheckoutInput
} from "./store-checkout.dto";

@Injectable()
export class StoreCheckoutService {
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private getStripeClient() {
    const secret = env.STRIPE_SECRET_KEY?.trim();
    if (!secret) throw new ServiceUnavailableException("Stripe is not configured.");
    if (!this.stripeClient) this.stripeClient = new Stripe(secret);
    return this.stripeClient;
  }

  // Mirrors the web resolveUnitPrice (volume tiers) so the charged amount matches
  // what the storefront displays.
  private resolveUnitPrice(
    basePrice: number,
    quantity: number,
    options: { qtyFrom: number; qtyTo: number | null; price: Prisma.Decimal; isOnward: boolean }[]
  ) {
    const sorted = [...options].sort((a, b) => a.qtyFrom - b.qtyFrom);
    for (const o of sorted) {
      if (quantity < o.qtyFrom) continue;
      if (o.isOnward) return Math.max(0, Number(o.price));
      if (o.qtyTo != null && quantity <= o.qtyTo) return Math.max(0, Number(o.price));
    }
    return Math.max(0, basePrice);
  }

  // Step 1: validate the cart against the store, create a PENDING order (tagged
  // with storeId, items already READY_TO_ORDER so they skip the design flow),
  // then create a Stripe PaymentIntent for the buyer to confirm.
  async createCheckout(buyerUserId: string, input: CreateStoreCheckoutInput) {
    const store = await this.prisma.store.findFirst({
      where: { slug: input.storeSlug, status: "ACTIVE" },
      include: { products: { select: { productId: true } } }
    });
    if (!store) throw new NotFoundException("Store not found");

    const allowed = new Set(store.products.map((p) => p.productId));
    const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
    const products = await this.prisma.catalogProduct.findMany({
      where: { id: { in: productIds } },
      include: {
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 },
        productCatalogVariants: { include: { pricingOptions: true } },
        pricingOptions: { where: { productCatalogVariantId: null } }
      }
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const orderItems: {
      productId: string;
      productCatalogVariantId: string | null;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      imageUrl: string | null;
    }[] = [];
    let totalCents = 0;

    for (const item of input.items) {
      if (!allowed.has(item.productId)) {
        throw new BadRequestException("An item is not available in this store");
      }
      const product = byId.get(item.productId);
      if (!product) throw new BadRequestException("Product not found");

      let baseUnit = product.basePrice != null ? Number(product.basePrice) : 0;
      let variantId: string | null = null;
      let variantName: string | null = null;
      let pricingOptions = product.pricingOptions;
      if (item.productCatalogVariantId) {
        const variant = product.productCatalogVariants.find(
          (v) => v.id === item.productCatalogVariantId
        );
        if (!variant) throw new BadRequestException("Selected variant not found");
        baseUnit = Number(variant.price);
        variantId = variant.id;
        variantName = variant.title ?? null;
        if (variant.pricingOptions?.length) pricingOptions = variant.pricingOptions;
      }
      // Apply volume tiers unless bulk pricing is disabled for this product.
      const unit =
        product.bulkPricingEnabled === false
          ? baseUnit
          : this.resolveUnitPrice(baseUnit, item.quantity, pricingOptions);
      if (!Number.isFinite(unit) || unit <= 0) {
        throw new BadRequestException(`"${product.name}" is not purchasable`);
      }
      const lineTotal = unit * item.quantity;
      totalCents += Math.round(unit * 100) * item.quantity;
      orderItems.push({
        productId: product.id,
        productCatalogVariantId: variantId,
        productName: product.name,
        variantName,
        quantity: item.quantity,
        unitPrice: unit,
        totalPrice: lineTotal,
        imageUrl: product.images[0]?.url ?? null
      });
    }

    if (totalCents <= 0) throw new BadRequestException("Invalid order total");
    const total = totalCents / 100;

    const noteParts = [
      input.notes?.trim() || null,
      input.shippingAddress?.trim() ? `Ship to: ${input.shippingAddress.trim()}` : null
    ].filter(Boolean) as string[];

    const order = await this.prisma.$transaction(async (tx) => {
      for (const oi of orderItems) {
        if (oi.productCatalogVariantId) {
          await tx.catalogVariant.update({
            where: { id: oi.productCatalogVariantId },
            data: { stock: { decrement: oi.quantity } }
          });
        } else {
          await tx.catalogProduct.update({
            where: { id: oi.productId },
            data: { baseStock: { decrement: oi.quantity } }
          });
        }
      }
      return tx.catalogOrder.create({
        data: {
          userId: buyerUserId,
          storeId: store.id,
          type: "BULK",
          status: "APPROVED",
          paymentStatus: "PENDING",
          email: input.email.trim().toLowerCase(),
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          notes: noteParts.join(" | ") || null,
          packQuantity: 1,
          totalPrice: new Prisma.Decimal(total),
          currency: "USD",
          stockReserved: true,
          items: {
            create: orderItems.map((oi, index) => ({
              product: { connect: { id: oi.productId } },
              ...(oi.productCatalogVariantId
                ? { productCatalogVariant: { connect: { id: oi.productCatalogVariantId } } }
                : {}),
              productName: oi.productName,
              variantName: oi.variantName,
              itemType: "BULK" as const,
              designPhase: "READY_TO_ORDER" as const,
              quantity: oi.quantity,
              unitPrice: new Prisma.Decimal(oi.unitPrice),
              totalPrice: new Prisma.Decimal(oi.totalPrice),
              imageUrl: oi.imageUrl,
              sortOrder: index
            }))
          }
        }
      });
    });

    if (env.PAYMENTS_TEST_MODE) {
      return {
        orderId: order.id,
        testMode: true as const,
        clientSecret: null,
        publishableKey: null,
        amount: total,
        currency: "USD"
      };
    }

    const stripe = this.getStripeClient();
    const intent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "usd",
      metadata: { orderId: order.id, storeId: store.id, kind: "store_checkout" },
      receipt_email: input.email.trim(),
      description: `Store order ${order.id} (${store.name})`,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" }
    });

    return {
      orderId: order.id,
      testMode: false as const,
      clientSecret: intent.client_secret,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY ?? null,
      amount: total,
      currency: "USD"
    };
  }

  // Step 2: verify the confirmed PaymentIntent, mark the order PAID, and snapshot
  // the seller's earning (total − commission) for the payout ledger.
  async confirmCheckout(buyerUserId: string, input: ConfirmStoreCheckoutInput) {
    const order = await this.prisma.catalogOrder.findFirst({
      where: { id: input.orderId, userId: buyerUserId, storeId: { not: null } },
      include: { store: true }
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentStatus === "PAID") {
      return { orderId: order.id, paymentStatus: "PAID" as const, alreadyPaid: true };
    }

    const totalCents = Math.round(Number(order.totalPrice) * 100);
    let paymentId = input.paymentIntentId;

    if (env.PAYMENTS_TEST_MODE) {
      paymentId = `TEST-${randomUUID()}`;
    } else {
      const stripe = this.getStripeClient();
      const intent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
      if (intent.metadata?.orderId !== order.id) {
        throw new BadRequestException("This payment does not match the order.");
      }
      if (intent.amount !== totalCents) {
        throw new BadRequestException("The paid amount does not match the order total.");
      }
      if (intent.status !== "succeeded") {
        throw new BadRequestException("Your payment was not completed.");
      }
    }

    const commissionPercent = order.store ? Number(order.store.commissionPercent) : 0;
    const sellerEarningCents = Math.round(totalCents * (1 - commissionPercent / 100));

    await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        squarePaymentId: paymentId,
        commissionPercent: new Prisma.Decimal(commissionPercent),
        sellerEarningCents
      }
    });

    const amountLabel = `$${(totalCents / 100).toFixed(2)}`;
    if (order.store?.ownerUserId) {
      await this.notifications.notify({
        userId: order.store.ownerUserId,
        type: "store.order.paid",
        title: "New paid order",
        body: `${order.name} placed a ${amountLabel} order on your store.`,
        link: "/seller"
      });
    }
    await this.notifications.notifyAdmins({
      type: "store.order.paid",
      title: "Store order paid",
      body: `${amountLabel} order on ${order.store?.name ?? "a store"}.`,
      link: `/dashboard/orders/${order.id}`
    });

    return { orderId: order.id, paymentStatus: "PAID" as const, alreadyPaid: false };
  }
}
