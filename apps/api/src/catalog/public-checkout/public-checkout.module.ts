import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationsModule } from "../../notifications/notifications.module";
import { CouponsModule } from "../../coupons/coupons.module";
import { EmailModule } from "../../email/email.module";
import { PublicCheckoutController } from "./public-checkout.controller";
import { PublicCheckoutService } from "./public-checkout.service";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule, CouponsModule, EmailModule],
  controllers: [PublicCheckoutController],
  providers: [PublicCheckoutService]
})
export class PublicCheckoutModule {}
