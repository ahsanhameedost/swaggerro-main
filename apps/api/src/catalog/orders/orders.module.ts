
import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CatalogCoreModule } from "../common/catalog-core.module";
import { CatalogOrdersController } from "./orders.controller";
import { CatalogOrdersService } from "./orders.service";

@Module({
  imports: [CatalogCoreModule],
  controllers: [CatalogOrdersController],
  providers: [CatalogOrdersService, PermissionsGuard],
  exports: [CatalogOrdersService]
})
export class CatalogOrdersModule {}
