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
import { NotificationsModule } from "./notifications/notifications.module";
import { StoreCheckoutModule } from "./catalog/store-checkout/store-checkout.module";
import { PublicCheckoutModule } from "./catalog/public-checkout/public-checkout.module";
import { PayoutsModule } from "./payouts/payouts.module";
import { PaymentsModule } from "./payments/payments.module";
import { SavedSwagPacksModule } from "./saved-swag-packs/saved-swag-packs.module";
import { SettingsModule } from "./settings/settings.module";

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        // Fail fast instead of buffering commands when Redis is unreachable, so a
        // queue.add() (email dispatch) can never hang the HTTP request — callers
        // treat email as best-effort and continue. (maxRetriesPerRequest: null is
        // BullMQ's required setting for its blocking worker connection.)
        enableOfflineQueue: false,
        maxRetriesPerRequest: null
      }
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
    StoresModule,
    NotificationsModule,
    StoreCheckoutModule,
    PublicCheckoutModule,
    PayoutsModule,
    PaymentsModule,
    SavedSwagPacksModule,
    SettingsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
