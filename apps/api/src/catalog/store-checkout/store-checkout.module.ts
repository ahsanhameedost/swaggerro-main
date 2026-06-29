import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationsModule } from "../../notifications/notifications.module";
import { StoreCheckoutController } from "./store-checkout.controller";
import { StoreCheckoutService } from "./store-checkout.service";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [StoreCheckoutController],
  providers: [StoreCheckoutService]
})
export class StoreCheckoutModule {}
