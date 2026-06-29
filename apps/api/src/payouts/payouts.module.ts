import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PayoutsController } from "./payouts.controller";
import { PayoutsService } from "./payouts.service";
import { PermissionsGuard } from "../common/guards/permissions.guard";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [PayoutsController],
  providers: [PayoutsService, PermissionsGuard]
})
export class PayoutsModule {}
