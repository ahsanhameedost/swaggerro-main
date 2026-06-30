
import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CatalogCoreModule } from "../common/catalog-core.module";
import { NotificationsModule } from "../../notifications/notifications.module";
import { CatalogOrdersController } from "./orders.controller";
import { CatalogOrdersService } from "./orders.service";

@Module({
  imports: [CatalogCoreModule, NotificationsModule],
  controllers: [CatalogOrdersController],
  providers: [CatalogOrdersService, PermissionsGuard],
  exports: [CatalogOrdersService]
})
export class CatalogOrdersModule {}
