
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthGuard } from "../../common/guards/auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { parseOrThrow } from "../common/parse-or-throw";
import { CatalogBrandsService } from "./brands.service";
import {
  createBrandSchema,
  listBrandsQuerySchema,
  updateBrandSchema
} from "../dto/brand.dto";
import { createCatalogImageUploadSchema } from "../dto/category.dto";

@Controller("catalog")
export class CatalogBrandsController {
  constructor(private readonly brandsService: CatalogBrandsService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("brands")
  @RequirePermissions("catalog.brands.read")
  async listBrands(@Query() query: unknown) {
    return await this.brandsService.listBrands(
      parseOrThrow(listBrandsQuerySchema.safeParse(query), "Invalid brand query")
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("brands/:id")
  @RequirePermissions("catalog.brands.read")
  async getBrandById(@Param("id") id: string) {
    return { brand: await this.brandsService.getBrandById(id) };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("brands/upload-url")
  @RequirePermissions("catalog.brands.write")
  async createBrandUploadUrl(@Body() body: unknown) {
    return await this.brandsService.createCatalogImageUpload(
      parseOrThrow(createCatalogImageUploadSchema.safeParse(body), "Invalid image upload request"),
      "catalog/brands"
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("brands")
  @RequirePermissions("catalog.brands.write")
  async createBrand(@Body() body: unknown) {
    return {
      brand: await this.brandsService.createBrand(
        parseOrThrow(createBrandSchema.safeParse(body), "Invalid brand payload")
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Patch("brands/:id")
  @RequirePermissions("catalog.brands.write")
  async updateBrand(@Param("id") id: string, @Body() body: unknown) {
    return {
      brand: await this.brandsService.updateBrand(
        id,
        parseOrThrow(updateBrandSchema.safeParse(body), "Invalid brand payload")
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Delete("brands/:id")
  @RequirePermissions("catalog.brands.write")
  async deleteBrand(@Param("id") id: string) {
    return await this.brandsService.deleteBrand(id);
  }
}
