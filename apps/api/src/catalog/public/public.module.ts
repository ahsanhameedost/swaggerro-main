import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";
import { CatalogCoreModule } from "../common/catalog-core.module";
import { CatalogPublicController } from "./public.controller";
import { CatalogPublicService } from "./public.service";

@Module({
  imports: [CatalogCoreModule],
  controllers: [CatalogPublicController],
  providers: [CatalogPublicService, PermissionsGuard, OptionalAuthGuard],
  exports: [CatalogPublicService]
})
export class CatalogPublicModule {}
