import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { EMAIL_QUEUE } from "../email/email.constants";
import { StoresController } from "./stores.controller";
import { StoresService } from "./stores.service";

@Module({
  imports: [AuthModule, PrismaModule, BullModule.registerQueue({ name: EMAIL_QUEUE })],
  controllers: [StoresController],
  providers: [StoresService, PermissionsGuard],
  exports: [StoresService]
})
export class StoresModule {}
