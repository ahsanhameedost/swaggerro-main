import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { EMAIL_QUEUE } from "../email/email.constants";
import { StoresModule } from "../stores/stores.module";
import { PartnersController } from "./partners.controller";
import { PartnersService } from "./partners.service";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    StoresModule,
    BullModule.registerQueue({ name: EMAIL_QUEUE })
  ],
  controllers: [PartnersController],
  providers: [PartnersService, PermissionsGuard]
})
export class PartnersModule {}
