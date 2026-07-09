import {
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
  type RawBodyRequest
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard, type AuthUser } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // Public Stripe webhook. No auth guard — authenticity is proven by the
  // signature header verified against the raw body.
  @Post("webhook")
  @HttpCode(200)
  async webhook(@Req() req: RawBodyRequest<FastifyRequest>) {
    const signature = req.headers["stripe-signature"] as string | undefined;
    const event = this.payments.constructEvent(req.rawBody, signature);
    return this.payments.handleEvent(event);
  }

  // Admin-initiated refund of a paid order.
  @Post("orders/:id/refund")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalog.orders.update")
  async refund(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return this.payments.refundOrder(id, req.user!);
  }
}
