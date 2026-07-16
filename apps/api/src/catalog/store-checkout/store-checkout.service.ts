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
import { NotificationEventsService } from "../../notifications/notification-events.service";
import { renderOrderSummaryHtml } from "../../email/email-layout";
import { computeCommission } from "../common/commission";
import type {
  ConfirmStoreCheckoutInput,
  CreateStoreCheckoutInput
} from "./store-checkout.dto";

@Injectable()
export class StoreCheckoutService {
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: NotificationEventsService
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
      include: { products: { select: { productId: true, customPrice: true } } }
    });
    if (!store) throw new NotFoundException("Store not found");

    const allowed = new Set(store.products.map((p) => p.productId));
    // The seller's chosen sale price per product (null => sell at catalog price).
    const customPriceById = new Map(
      store.products.map((p) => [p.productId, p.customPrice != null ? Number(p.customPrice) : null])
    );
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
      const tierUnit =
        product.bulkPricingEnabled === false
          ? baseUnit
          : this.resolveUnitPrice(baseUnit, item.quantity, pricingOptions);
      // If the seller set a custom price it becomes the flat sale price (the
      // markup above base is split with the seller — see confirmCheckout). It is
      // always kept at or above base so it never undercuts the catalog price.
      const custom = customPriceById.get(item.productId);
      const unit = custom != null && custom > 0 ? Math.max(custom, baseUnit) : tierUnit;
      if (!Number.isFinite(unit) || unit <= 0) {
        throw new BadRequestException(`"${product.name}" is not purchasable`);
      }
      // One-time setup/imprint fee for this line. It is a platform decoration
      // charge, so it is added to the order total but NOT to the seller earning
      // split (which is computed from unitPrice at confirm time).
      const setup = Math.max(0, item.setupFee ?? 0);
      const lineTotal = unit * item.quantity + setup;
      totalCents += Math.round(unit * 100) * item.quantity + Math.round(setup * 100);
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
  // the seller's earning for the payout ledger. For Swaggeroo-owned products the
  // seller earns ONLY the commission (Swaggeroo keeps the product price); for
  // seller-owned products the seller keeps the price and Swaggeroo takes the cut.
  async confirmCheckout(buyerUserId: string, input: ConfirmStoreCheckoutInput) {
    const order = await this.prisma.catalogOrder.findFirst({
      where: { id: input.orderId, userId: buyerUserId, storeId: { not: null } },
      include: {
        store: true,
        items: {
          include: {
            product: {
              select: {
                basePrice: true,
                ownerStoreId: true
              }
            },
            productCatalogVariant: { select: { price: true } }
          }
        }
      }
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

    // Sum the seller's earning per line item under the markup-split model: the
    // seller earns 50% of whatever they charged above the catalog base price (0
    // when sold at base). The base reference is the variant's price when the item
    // is a variant, otherwise the product's base price. Rounds per unit, then
    // multiplies by quantity.
    let sellerEarningCents = 0;
    for (const item of order.items) {
      const chargedUnit = Number(item.unitPrice);
      const baseRef =
        item.productCatalogVariant?.price != null
          ? Number(item.productCatalogVariant.price)
          : item.product.basePrice != null
            ? Number(item.product.basePrice)
            : chargedUnit;
      const split = computeCommission(chargedUnit, {
        basePrice: baseRef,
        ownership: item.product.ownerStoreId ? "SELLER" : "PLATFORM"
      });
      sellerEarningCents += Math.round(split.sellerEarning * 100) * item.quantity;
    }
    sellerEarningCents = Math.max(0, Math.min(sellerEarningCents, totalCents));
    // Snapshot the seller's effective take as a percentage (for payout display).
    const effectiveSellerPercent =
      totalCents > 0 ? Math.round((sellerEarningCents / totalCents) * 10000) / 100 : 0;

    await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        squarePaymentId: paymentId,
        commissionPercent: new Prisma.Decimal(effectiveSellerPercent),
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

    // Customer order-confirmation with the item breakdown + a tracking link (#26).
    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
    const summaryItems = order.items.map((item) => ({
      name: item.productName,
      variant: item.variantName,
      quantity: item.quantity,
      lineTotal: Number(item.totalPrice),
      image: item.mockupImageUrl ?? item.imageUrl ?? null
    }));
    const itemsSubtotal = summaryItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const grandTotal = Number(order.totalPrice);
    const summaryRows: { label: string; value: number; strong?: boolean }[] = [
      { label: "Products subtotal", value: itemsSubtotal }
    ];
    if (grandTotal - itemsSubtotal > 0.005) {
      summaryRows.push({ label: "Shipping, storage & fees", value: grandTotal - itemsSubtotal });
    }
    summaryRows.push({ label: "Total paid", value: grandTotal, strong: true });
    const orderSummaryHtml = renderOrderSummaryHtml({ items: summaryItems, rows: summaryRows });

    await this.events.dispatchToUser({
      userId: buyerUserId,
      type: "catalog.order.confirmed",
      title: "Order confirmed",
      body: `Your order ${orderLabel} (${amountLabel}) is confirmed.`,
      link: `/dashboard/orders/${order.id}`,
      email: {
        subject: `Order confirmed · ${orderLabel}`,
        heading: "Your order is confirmed",
        paragraphs: [
          `We received your payment of ${amountLabel} for order ${orderLabel}. Here's what you ordered:`
        ],
        bodyHtml: orderSummaryHtml,
        ctaPath: `/dashboard/orders/${order.id}`,
        ctaLabel: "Track your order",
        secondaryCtaPath: "/dashboard",
        secondaryCtaLabel: "Go to dashboard"
      }
    });

    return { orderId: order.id, paymentStatus: "PAID" as const, alreadyPaid: false };
  }
}
