
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthGuard } from "../../common/guards/auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { parseOrThrow } from "../common/parse-or-throw";
import { CatalogCategoriesService } from "./categories.service";
import {
  createCatalogImageUploadSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema
} from "../dto/category.dto";

@Controller("catalog")
export class CatalogCategoriesController {
  constructor(private readonly categoriesService: CatalogCategoriesService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("categories")
  @RequirePermissions("catalog.categories.read")
  async listCategories(@Query() query: unknown) {
    return await this.categoriesService.listCategories(
      parseOrThrow(listCategoriesQuerySchema.safeParse(query), "Invalid category query")
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("categories/:id")
  @RequirePermissions("catalog.categories.read")
  async getCategoryById(@Param("id") id: string) {
    return { category: await this.categoriesService.getCategoryById(id) };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("categories/upload-url")
  @RequirePermissions("catalog.categories.write")
  async createCategoryUploadUrl(@Body() body: unknown) {
    return await this.categoriesService.createCatalogImageUpload(
      parseOrThrow(createCatalogImageUploadSchema.safeParse(body), "Invalid image upload request"),
      "catalog/categories"
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("categories")
  @RequirePermissions("catalog.categories.write")
  async createCategory(@Body() body: unknown) {
    return {
      category: await this.categoriesService.createCategory(
        parseOrThrow(createCategorySchema.safeParse(body), "Invalid category payload")
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Patch("categories/:id")
  @RequirePermissions("catalog.categories.write")
  async updateCategory(@Param("id") id: string, @Body() body: unknown) {
    return {
      category: await this.categoriesService.updateCategory(
        id,
        parseOrThrow(updateCategorySchema.safeParse(body), "Invalid category payload")
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Delete("categories/:id")
  @RequirePermissions("catalog.categories.write")
  async deleteCategory(@Param("id") id: string) {
    return await this.categoriesService.deleteCategory(id);
  }
}
