import { BadRequestException, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard, type AuthUser } from "../../common/guards/auth.guard";
import {
  confirmStoreCheckoutSchema,
  createStoreCheckoutSchema
} from "./store-checkout.dto";
import { StoreCheckoutService } from "./store-checkout.service";

@Controller("catalog/store-checkout")
@UseGuards(AuthGuard)
export class StoreCheckoutController {
  constructor(private readonly storeCheckout: StoreCheckoutService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    const parsed = createStoreCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid checkout");
    }
    return this.storeCheckout.createCheckout(req.user!.sub, parsed.data);
  }

  @Post("confirm")
  async confirm(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    const parsed = confirmStoreCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid confirmation");
    }
    return this.storeCheckout.confirmCheckout(req.user!.sub, parsed.data);
  }
}
