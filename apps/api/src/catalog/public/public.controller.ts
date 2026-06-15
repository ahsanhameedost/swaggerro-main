import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { AuthUser } from "../../common/guards/auth.guard";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";
import { parseOrThrow } from "../common/parse-or-throw";
import {
  createPublicOrderSchema,
  createPublicProjectUploadSchema,
  listPublicProductsQuerySchema
} from "../dto/public.dto";
import { CatalogPublicService } from "./public.service";

@Controller("catalog")
export class CatalogPublicController {
  constructor(private readonly publicService: CatalogPublicService) {}

  @Get("public/categories")
  async listPublicCategories() {
    return { items: await this.publicService.listPublicCategories() };
  }

  @Get("public/collections")
  async listPublicCollections() {
    return { items: await this.publicService.listPublicCollections() };
  }

  @Get("public/products")
  async listPublicProducts(@Query() query: unknown) {
    return await this.publicService.listPublicProducts(
      parseOrThrow(listPublicProductsQuerySchema.safeParse(query), "Invalid public catalog query")
    );
  }

  @Get("public/products/:slug")
  async getPublicProductBySlug(@Param("slug") slug: string) {
    return { product: await this.publicService.getPublicProductBySlug(slug) };
  }

  @Post("public/projects/upload-url")
  async createProjectUploadUrl(@Body() body: unknown) {
    return await this.publicService.createCatalogImageUpload(
      parseOrThrow(createPublicProjectUploadSchema.safeParse(body), "Invalid project upload request"),
      "catalog/projects"
    );
  }

  @UseGuards(OptionalAuthGuard)
  @Post("public/orders")
  async createPublicOrder(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      order: await this.publicService.createPublicOrder(
        parseOrThrow(createPublicOrderSchema.safeParse(body), "Invalid order payload"),
        req.user?.sub ?? null
      )
    };
  }
}
