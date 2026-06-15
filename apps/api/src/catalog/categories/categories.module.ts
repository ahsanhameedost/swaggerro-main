
import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CatalogCoreModule } from "../common/catalog-core.module";
import { CatalogCategoriesController } from "./categories.controller";
import { CatalogCategoriesService } from "./categories.service";

@Module({
  imports: [CatalogCoreModule],
  controllers: [CatalogCategoriesController],
  providers: [CatalogCategoriesService, PermissionsGuard],
  exports: [CatalogCategoriesService]
})
export class CatalogCategoriesModule {}
