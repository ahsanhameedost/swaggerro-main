import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";
import { EMAIL_QUEUE } from "../email/email.constants";

@Module({
  imports: [AuthModule, PrismaModule, BullModule.registerQueue({ name: EMAIL_QUEUE })],
  controllers: [ContactController],
  providers: [ContactService, PermissionsGuard]
})
export class ContactModule {}
