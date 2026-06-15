
import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { EmailModule } from "../../email/email.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { StorageModule } from "../../storage/storage.module";

@Module({
  imports: [AuthModule, PrismaModule, StorageModule, EmailModule],
  exports: [AuthModule, PrismaModule, StorageModule, EmailModule]
})
export class CatalogCoreModule {}
