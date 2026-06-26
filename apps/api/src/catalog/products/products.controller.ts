
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthGuard } from "../../common/guards/auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { parseOrThrow } from "../common/parse-or-throw";
import { createCatalogImageUploadSchema } from "../dto/category.dto";
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema
} from "../dto/product.dto";
import { CatalogProductsService } from "./products.service";

@Controller("catalog")
export class CatalogProductsController {
  constructor(private readonly productsService: CatalogProductsService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("products")
  @RequirePermissions("catalog.products.read")
  async listProducts(@Query() query: unknown) {
    return await this.productsService.listProducts(
      parseOrThrow(listProductsQuerySchema.safeParse(query), "Invalid product query")
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("products/export")
  @RequirePermissions("catalog.products.read")
  async exportProducts(@Res({ passthrough: true }) reply: FastifyReply) {
    const csv = await this.productsService.exportProductsCsv();
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header(
      "content-disposition",
      `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return csv;
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("products/import-template")
  @RequirePermissions("catalog.products.write")
  async importTemplate(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", `attachment; filename="products-template.csv"`);
    return this.productsService.templateCsv();
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("products/import")
  @RequirePermissions("catalog.products.write")
  async importProducts(@Body() body: unknown) {
    const csv = (body as { csv?: unknown })?.csv;
    if (typeof csv !== "string" || !csv.trim()) {
      throw new BadRequestException("A non-empty CSV string is required");
    }
    return this.productsService.importProductsCsv(csv);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("products/:id")
  @RequirePermissions("catalog.products.read")
  async getProductById(@Param("id") id: string) {
    return { product: await this.productsService.getProductById(id) };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("products/upload-url")
  @RequirePermissions("catalog.products.write")
  async createProductUploadUrl(@Body() body: unknown) {
    return await this.productsService.createCatalogImageUpload(
      parseOrThrow(createCatalogImageUploadSchema.safeParse(body), "Invalid image upload request"),
      "catalog/products"
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("products")
  @RequirePermissions("catalog.products.write")
  async createProduct(@Body() body: unknown) {
    return {
      product: await this.productsService.createProduct(
        parseOrThrow(createProductSchema.safeParse(body), "Invalid product payload")
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Patch("products/:id")
  @RequirePermissions("catalog.products.write")
  async updateProduct(@Param("id") id: string, @Body() body: unknown) {
    return {
      product: await this.productsService.updateProduct(
        id,
        parseOrThrow(updateProductSchema.safeParse(body), "Invalid product payload")
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Delete("products/:id")
  @RequirePermissions("catalog.products.write")
  async deleteProduct(@Param("id") id: string) {
    return await this.productsService.deleteProduct(id);
  }
}
