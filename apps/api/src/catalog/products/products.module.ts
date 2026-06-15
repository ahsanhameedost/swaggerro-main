
import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CatalogCoreModule } from "../common/catalog-core.module";
import { CatalogProductsController } from "./products.controller";
import { CatalogProductsService } from "./products.service";

@Module({
  imports: [CatalogCoreModule],
  controllers: [CatalogProductsController],
  providers: [CatalogProductsService, PermissionsGuard],
  exports: [CatalogProductsService]
})
export class CatalogProductsModule {}
