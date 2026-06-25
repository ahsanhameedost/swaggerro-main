import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { env } from "./env";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { HealthController } from "./health.controller";
import { ContactModule } from "./contact/contact.module";
import { EmailModule } from "./email/email.module";
import { RbacModule } from "./rbac/rbac.module";
import { CatalogModule } from "./catalog/catalog.module";
import { StorageModule } from "./storage/storage.module";
import { ShippingModule } from "./shipping/shipping.module";
import { RecipientsModule } from "./recipients/recipients.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PartnersModule } from "./partners/partners.module";
import { StoresModule } from "./stores/stores.module";

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: { host: env.REDIS_HOST, port: env.REDIS_PORT }
    }),
    AuthModule,
    UsersModule,
    EmailModule,
    RbacModule,
    ContactModule,
    StorageModule,
    CatalogModule,
    ShippingModule,
    RecipientsModule,
    InventoryModule,
    PartnersModule,
    StoresModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
