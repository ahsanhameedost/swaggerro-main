
import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CatalogCoreModule } from "../common/catalog-core.module";
import { CatalogBrandsController } from "./brands.controller";
import { CatalogBrandsService } from "./brands.service";

@Module({
  imports: [CatalogCoreModule],
  controllers: [CatalogBrandsController],
  providers: [CatalogBrandsService, PermissionsGuard],
  exports: [CatalogBrandsService]
})
export class CatalogBrandsModule {}
