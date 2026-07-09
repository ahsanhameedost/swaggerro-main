import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { env } from "../env";
import type { AuthUser } from "../common/guards/auth.guard";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private getStripeClient() {
    const secret = env.STRIPE_SECRET_KEY;
    if (!secret) throw new BadRequestException("Stripe is not configured");
    if (!this.stripeClient) this.stripeClient = new Stripe(secret);
    return this.stripeClient;
  }

  // Verify the webhook signature against the raw payload bytes. Throws 400 on any
  // mismatch so Stripe will retry / surface the failure.
  constructEvent(payload: Buffer | undefined, signature: string | undefined) {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new BadRequestException("Stripe webhook secret is not configured");
    }
    if (!payload || !signature) {
      throw new BadRequestException("Missing webhook payload or signature");
    }
    try {
      return this.getStripeClient().webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${(err as Error).message}`
      );
    }
  }

  async handleEvent(event: Stripe.Event) {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.markOrderPaid(pi.metadata?.orderId, pi.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.markOrderFailed(pi.metadata?.orderId);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        await this.markOrderRefundedByPaymentId(piId);
        break;
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
    return { received: true };
  }

  // Safety net: if the browser confirm step didn't complete but the payment
  // actually succeeded, this marks the order paid. Idempotent.
  private async markOrderPaid(orderId: string | undefined, paymentIntentId: string) {
    if (!orderId) return;
    const order = await this.prisma.catalogOrder.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus === "PAID") return;

    await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", paidAt: new Date(), squarePaymentId: paymentIntentId }
    });

    if (order.userId) {
      await this.notifications.notify({
        userId: order.userId,
        type: "catalog.order.paid",
        title: "Payment received",
        body: `We received payment for order SW-${String(order.orderNumber).padStart(3, "0")}.`,
        link: `/dashboard/orders/${order.id}`
      });
    }
  }

  private async markOrderFailed(orderId: string | undefined) {
    if (!orderId) return;
    const order = await this.prisma.catalogOrder.findUnique({ where: { id: orderId } });
    // Never override a completed payment on a late/duplicate failure event.
    if (!order || order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED") return;

    await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" }
    });

    if (order.userId) {
      await this.notifications.notify({
        userId: order.userId,
        type: "catalog.order.payment_failed",
        title: "Payment failed",
        body: `Payment for order SW-${String(order.orderNumber).padStart(3, "0")} didn't go through. Please try again.`,
        link: `/dashboard/orders/${order.id}`
      });
    }
  }

  private async markOrderRefundedByPaymentId(paymentIntentId: string | undefined) {
    if (!paymentIntentId) return;
    const order = await this.prisma.catalogOrder.findFirst({
      where: { squarePaymentId: paymentIntentId }
    });
    if (!order || order.paymentStatus === "REFUNDED") return;

    await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "REFUNDED" }
    });
    await this.notifyRefunded(order.userId, order.orderNumber, order.id);
  }

  // Admin-initiated refund: refund the PaymentIntent in Stripe and mark the order.
  async refundOrder(orderId: string, _authUser: AuthUser) {
    const order = await this.prisma.catalogOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentStatus === "REFUNDED") {
      throw new BadRequestException("This order has already been refunded");
    }
    if (order.paymentStatus !== "PAID") {
      throw new BadRequestException("Only paid orders can be refunded");
    }

    if (env.PAYMENTS_TEST_MODE) {
      // Mock mode — no real PaymentIntent to refund.
      await this.prisma.catalogOrder.update({
        where: { id: order.id },
        data: { paymentStatus: "REFUNDED" }
      });
      await this.notifyRefunded(order.userId, order.orderNumber, order.id);
      return { orderId: order.id, paymentStatus: "REFUNDED" as const, testMode: true };
    }

    if (!order.squarePaymentId) {
      throw new BadRequestException("No payment on file to refund for this order");
    }

    const stripe = this.getStripeClient();
    await stripe.refunds.create({ payment_intent: order.squarePaymentId });

    await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "REFUNDED" }
    });
    await this.notifyRefunded(order.userId, order.orderNumber, order.id);
    return { orderId: order.id, paymentStatus: "REFUNDED" as const };
  }

  private async notifyRefunded(
    userId: string | null,
    orderNumber: number,
    orderId: string
  ) {
    if (!userId) return;
    await this.notifications.notify({
      userId,
      type: "catalog.order.refunded",
      title: "Order refunded",
      body: `Order SW-${String(orderNumber).padStart(3, "0")} has been refunded.`,
      link: `/dashboard/orders/${orderId}`
    });
  }
}
