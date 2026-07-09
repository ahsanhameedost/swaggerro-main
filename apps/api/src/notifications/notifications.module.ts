import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationEventsService } from "./notification-events.service";
import { EMAIL_QUEUE } from "../email/email.constants";

@Module({
  imports: [AuthModule, PrismaModule, BullModule.registerQueue({ name: EMAIL_QUEUE })],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEventsService],
  exports: [NotificationsService, NotificationEventsService]
})
export class NotificationsModule {}
