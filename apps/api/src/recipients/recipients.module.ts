import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RecipientsController } from "./recipients.controller";
import { RecipientsService } from "./recipients.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RecipientsController],
  providers: [RecipientsService],
  exports: [RecipientsService]
})
export class RecipientsModule {}