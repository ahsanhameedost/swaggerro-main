
import { Module } from "@nestjs/common";
import { CatalogCategoriesModule } from "./categories/categories.module";
import { CatalogCollectionsModule } from "./collections/collections.module";
import { CatalogOrdersModule } from "./orders/orders.module";
import { CatalogProductsModule } from "./products/products.module";
import { CatalogPublicModule } from "./public/public.module";

@Module({
  imports: [
    CatalogCategoriesModule,
    CatalogCollectionsModule,
    CatalogProductsModule,
    CatalogOrdersModule,
    CatalogPublicModule
  ]
})
export class CatalogModule {}
