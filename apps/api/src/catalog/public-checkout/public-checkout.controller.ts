import { BadRequestException, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard, type AuthUser } from "../../common/guards/auth.guard";
import {
  confirmPublicCheckoutSchema,
  createPublicCheckoutSchema
} from "./public-checkout.dto";
import { PublicCheckoutService } from "./public-checkout.service";

@Controller("catalog/public-checkout")
@UseGuards(AuthGuard)
export class PublicCheckoutController {
  constructor(private readonly publicCheckout: PublicCheckoutService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    const parsed = createPublicCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid checkout");
    }
    return this.publicCheckout.createCheckout(req.user!.sub, parsed.data);
  }

  @Post("confirm")
  async confirm(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    const parsed = confirmPublicCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid confirmation");
    }
    return this.publicCheckout.confirmCheckout(req.user!.sub, parsed.data);
  }
}
