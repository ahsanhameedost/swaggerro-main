import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SavedSwagPacksController } from "./saved-swag-packs.controller";
import { SavedSwagPacksService } from "./saved-swag-packs.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [SavedSwagPacksController],
  providers: [SavedSwagPacksService]
})
export class SavedSwagPacksModule {}
