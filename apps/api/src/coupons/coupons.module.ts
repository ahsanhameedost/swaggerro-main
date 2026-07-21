import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { CouponsController } from "./coupons.controller";
import { CouponsService } from "./coupons.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CouponsController],
  providers: [CouponsService, PermissionsGuard],
  // Exported so the checkout services (public / store / orders) can validate and
  // redeem coupons through the same single source of truth.
  exports: [CouponsService],
})
export class CouponsModule {}
