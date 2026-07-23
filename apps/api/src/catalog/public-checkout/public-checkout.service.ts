import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import * as bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { env } from "../../env";
import { NotificationsService } from "../../notifications/notifications.service";
import { NotificationEventsService } from "../../notifications/notification-events.service";
import { CouponsService } from "../../coupons/coupons.service";
import { EmailService } from "../../email/email.service";
import { recordOrderTimeline } from "../orders/order-timeline";
import { renderOrderSummaryHtml } from "../../email/email-layout";
import type {
  ConfirmPublicCheckoutInput,
  CreatePublicCheckoutInput
} from "./public-checkout.dto";

// The Customer role name (mirrors users.service). Guest checkout attaches the
// order to a Customer-role account.
const CUSTOMER_ROLE_NAME = "Customer";

/** Random throwaway password for an unclaimed account — replaced when the
 *  customer sets their own via the account-setup link. */
function randomPassword() {
  return randomBytes(24).toString("base64url");
}

@Injectable()
export class PublicCheckoutService {
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: NotificationEventsService,
    private readonly coupons: CouponsService,
    private readonly email: EmailService
  ) {}

  // Attach a paid guest order to a customer account, creating a passwordless
  // ("unclaimed") account if the email is new, and — when the account is
  // unclaimed — email a one-time "set your password" link so they can claim it.
  // Claimed accounts (already have a password) are silently linked, no email.
  private async attachCustomerAndInvite(order: {
    id: string;
    userId: string | null;
    email: string;
    name: string | null;
    phone: string | null;
  }) {
    const email = order.email.trim().toLowerCase();
    let user = order.userId
      ? await this.prisma.user.findUnique({ where: { id: order.userId } })
      : await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const role = await this.prisma.role.findUnique({ where: { name: CUSTOMER_ROLE_NAME } });
      if (!role) throw new ServiceUnavailableException("Customer role is not configured.");
      const [firstName, ...rest] = (order.name ?? "").trim().split(/\s+/).filter(Boolean);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: bcrypt.hashSync(randomPassword(), 12),
          firstName: firstName || null,
          lastName: rest.join(" ") || null,
          phone: order.phone || null,
          roleId: role.id,
          mustSetPassword: true
        }
      });
    }

    if (order.userId !== user.id) {
      await this.prisma.catalogOrder.update({
        where: { id: order.id },
        data: { userId: user.id }
      });
    }

    // Unclaimed account (new guest, or a prior guest who never set a password) →
    // send a fresh set-password link. A claimed account is left as-is.
    if (user.mustSetPassword) {
      await this.sendAccountSetupInvite(user.id, user.email, user.firstName);
    }

    return user;
  }

  private async sendAccountSetupInvite(userId: string, email: string, firstName: string | null) {
    try {
      const token = randomBytes(32).toString("hex");
      await this.prisma.accountSetupToken.create({
        data: {
          userId,
          email,
          token,
          // Generous window — a customer may claim their account days later.
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        }
      });
      const webBase = (env.CORS_ORIGIN || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");
      const setupUrl = `${webBase}/account-setup?token=${token}`;
      await this.email.sendCustomerAccountSetupEmail(email, firstName || "there", setupUrl);
    } catch {
      // Best effort — a failed invite never blocks the paid order.
    }
  }

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

  // Step 1: validate the cart against the live catalog, create a PENDING order
  // (no store, items READY_TO_ORDER so they skip the design flow), then create a
  // Stripe PaymentIntent for the buyer to confirm.
  async createCheckout(input: CreatePublicCheckoutInput) {
    // Link to an existing account if this email already has one (guest or not);
    // otherwise the order starts user-less and a customer account is created on
    // payment (see confirmCheckout → attachCustomerAndInvite).
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      select: { id: true }
    });
    const buyerUserId: string | null = existingUser?.id ?? null;

    const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
    const products = await this.prisma.catalogProduct.findMany({
      where: { id: { in: productIds }, status: "ACTIVE" },
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
      const product = byId.get(item.productId);
      if (!product) throw new BadRequestException("An item is no longer available");

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
      // One-time setup/imprint fee added on top of the units for this line.
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
    const subtotal = totalCents / 100;

    // Optional coupon. Validated against the live cart; discount is clamped to the
    // subtotal so the charge can never go negative. Platform (non-store) order →
    // Swaggeroo funds the discount.
    let discountCents = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    if (input.couponCode?.trim()) {
      const resolved = await this.coupons.validateForCheckout({
        code: input.couponCode,
        lines: orderItems.map((oi) => ({ productId: oi.productId, lineTotal: oi.totalPrice })),
        storeId: null,
        userId: buyerUserId
      });
      discountCents = Math.min(totalCents, Math.round(resolved.discountAmount * 100));
      couponId = resolved.couponId;
      couponCode = resolved.code;
    }
    const chargeCents = totalCents - discountCents;
    const total = chargeCents / 100; // amount actually charged (post-discount)
    const discountAmount = discountCents / 100;

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
          type: "BULK",
          status: "APPROVED",
          paymentStatus: "PENDING",
          email: input.email.trim().toLowerCase(),
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          notes: noteParts.join(" | ") || null,
          packQuantity: 1,
          totalPrice: new Prisma.Decimal(total),
          couponId,
          couponCode,
          discountAmount: new Prisma.Decimal(discountAmount),
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

    // Pay-now orders skip design and land straight on Approved — stamp it so the
    // tracking timeline shows a real time for the stage.
    await recordOrderTimeline(this.prisma.catalogOrderEvent, order.id, order.status, order.productionStage);

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
      amount: chargeCents,
      currency: "usd",
      metadata: { orderId: order.id, kind: "public_checkout" },
      receipt_email: input.email.trim(),
      description: `Shop order ${order.id}`,
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

  // Step 2: verify the confirmed PaymentIntent and mark the order PAID. No store,
  // so there is no seller earning/payout snapshot.
  async confirmCheckout(input: ConfirmPublicCheckoutInput) {
    // Guest-safe lookup: identified by the (unguessable) order id, not a user —
    // the real gate is the verified PaymentIntent below.
    const order = await this.prisma.catalogOrder.findFirst({
      where: { id: input.orderId, storeId: null }
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

    await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        squarePaymentId: paymentId
      }
    });

    // Count the coupon redemption now that the payment landed (best-effort).
    if (order.couponId) await this.coupons.redeem(order.couponId);

    // Now that payment succeeded, attach the order to a customer account
    // (creating a passwordless one for a brand-new guest email) and email an
    // account-setup link if it's unclaimed.
    const buyer = await this.attachCustomerAndInvite({
      id: order.id,
      userId: order.userId,
      email: order.email,
      name: order.name,
      phone: order.phone
    });

    const amountLabel = `$${(totalCents / 100).toFixed(2)}`;
    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
    await this.notifications.notifyAdmins({
      type: "catalog.order.paid",
      title: "Shop order paid",
      body: `${order.name} placed a ${amountLabel} order.`,
      link: `/dashboard/orders/${order.id}`
    });

    // Build a WooCommerce-style order breakdown + product thumbnails for the email.
    const orderItems = await this.prisma.catalogOrderItem.findMany({
      where: { orderId: order.id },
      orderBy: { sortOrder: "asc" },
      select: {
        productName: true,
        variantName: true,
        quantity: true,
        totalPrice: true,
        imageUrl: true,
        mockupImageUrl: true
      }
    });
    const summaryItems = orderItems.map((item) => ({
      name: item.productName,
      variant: item.variantName,
      quantity: item.quantity,
      lineTotal: Number(item.totalPrice),
      image: item.mockupImageUrl ?? item.imageUrl ?? null
    }));
    const itemsSubtotal = summaryItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const grandTotal = Number(order.totalPrice);
    const discount = Number(order.discountAmount ?? 0);
    const summaryRows: { label: string; value: number; strong?: boolean }[] = [
      { label: "Products subtotal", value: itemsSubtotal }
    ];
    if (discount > 0.005) {
      summaryRows.push({
        label: order.couponCode ? `Discount (${order.couponCode})` : "Discount",
        value: -discount
      });
    }
    // Any residual difference beyond the discount (shipping/fees) — usually none here.
    const feesLike = grandTotal - (itemsSubtotal - discount);
    if (feesLike > 0.005) {
      summaryRows.push({ label: "Shipping, storage & fees", value: feesLike });
    }
    summaryRows.push({ label: "Total paid", value: grandTotal, strong: true });
    const orderSummaryHtml = renderOrderSummaryHtml({ items: summaryItems, rows: summaryRows });

    // Customer order-confirmation: thumbnails, full breakdown, and both a
    // Track-order and a Go-to-dashboard button (the buyer has an account).
    await this.events.dispatchToUser({
      userId: buyer.id,
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
