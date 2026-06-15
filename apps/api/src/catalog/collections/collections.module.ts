
import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CatalogCoreModule } from "../common/catalog-core.module";
import { CatalogCollectionsController } from "./collections.controller";
import { CatalogCollectionsService } from "./collections.service";

@Module({
  imports: [CatalogCoreModule],
  controllers: [CatalogCollectionsController],
  providers: [CatalogCollectionsService, PermissionsGuard],
  exports: [CatalogCollectionsService]
})
export class CatalogCollectionsModule {}
