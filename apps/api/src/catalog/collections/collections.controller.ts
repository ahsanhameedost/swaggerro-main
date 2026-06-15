
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthGuard } from "../../common/guards/auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { parseOrThrow } from "../common/parse-or-throw";
import { CatalogCollectionsService } from "./collections.service";
import {
  createCollectionSchema,
  listCollectionsQuerySchema,
  updateCollectionSchema
} from "../dto/collection.dto";
import { createCatalogImageUploadSchema } from "../dto/category.dto";

@Controller("catalog")
export class CatalogCollectionsController {
  constructor(private readonly collectionsService: CatalogCollectionsService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("collections")
  @RequirePermissions("catalog.collections.read")
  async listCollections(@Query() query: unknown) {
    return await this.collectionsService.listCollections(
      parseOrThrow(listCollectionsQuerySchema.safeParse(query), "Invalid collection query")
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("collections/:id")
  @RequirePermissions("catalog.collections.read")
  async getCollectionById(@Param("id") id: string) {
    return { collection: await this.collectionsService.getCollectionById(id) };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("collections/upload-url")
  @RequirePermissions("catalog.collections.write")
  async createCollectionUploadUrl(@Body() body: unknown) {
    return await this.collectionsService.createCatalogImageUpload(
      parseOrThrow(createCatalogImageUploadSchema.safeParse(body), "Invalid image upload request"),
      "catalog/collections"
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("collections")
  @RequirePermissions("catalog.collections.write")
  async createCollection(@Body() body: unknown) {
    return {
      collection: await this.collectionsService.createCollection(
        parseOrThrow(createCollectionSchema.safeParse(body), "Invalid collection payload")
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Patch("collections/:id")
  @RequirePermissions("catalog.collections.write")
  async updateCollection(@Param("id") id: string, @Body() body: unknown) {
    return {
      collection: await this.collectionsService.updateCollection(
        id,
        parseOrThrow(updateCollectionSchema.safeParse(body), "Invalid collection payload")
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Delete("collections/:id")
  @RequirePermissions("catalog.collections.write")
  async deleteCollection(@Param("id") id: string) {
    return await this.collectionsService.deleteCollection(id);
  }
}
