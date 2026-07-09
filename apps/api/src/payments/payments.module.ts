import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PermissionsGuard]
})
export class PaymentsModule {}
