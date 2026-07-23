import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import {
  confirmPublicCheckoutSchema,
  createPublicCheckoutSchema
} from "./public-checkout.dto";
import { PublicCheckoutService } from "./public-checkout.service";

// Guest checkout: NOT auth-guarded. The B2C pay-now flow (1–5 units) is open to
// signed-out shoppers — the buyer is resolved by the email on the order, and a
// passwordless account is created for them on payment (see the service). Bulk /
// Pack Studio / seller checkouts remain behind their own authenticated routes.
@Controller("catalog/public-checkout")
export class PublicCheckoutController {
  constructor(private readonly publicCheckout: PublicCheckoutService) {}

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createPublicCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid checkout");
    }
    return this.publicCheckout.createCheckout(parsed.data);
  }

  @Post("confirm")
  async confirm(@Body() body: unknown) {
    const parsed = confirmPublicCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid confirmation");
    }
    return this.publicCheckout.confirmCheckout(parsed.data);
  }
}
