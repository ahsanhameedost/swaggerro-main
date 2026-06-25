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
  Req,
  UseGuards
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard, type AuthUser } from "../common/guards/auth.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import {
  createStoreSchema,
  listStoresQuerySchema,
  updateOwnStoreSchema,
  updateStoreSchema
} from "./dto/store.dto";
import { StoresService } from "./stores.service";

const ADMIN_READ = "partners.stores.read";
const ADMIN_WRITE = "partners.stores.write";

@Controller("stores")
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  // Public storefront — no auth.
  @Get("/public/:slug")
  async publicStore(@Param("slug") slug: string) {
    return { store: await this.storesService.getPublicStoreBySlug(slug) };
  }

  // Seller self-service — manage their own store.
  @Get("/me")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("seller.store.read")
  async myStore(@Req() req: FastifyRequest & { user?: AuthUser }) {
    return { store: await this.storesService.getOwnStore(req.user!.sub) };
  }

  @Patch("/me")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("seller.store.write")
  async updateMyStore(@Body() body: unknown, @Req() req: FastifyRequest & { user?: AuthUser }) {
    const parsed = updateOwnStoreSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid store update");
    }
    return { store: await this.storesService.updateOwnStore(req.user!.sub, parsed.data) };
  }

  // Admin store management.
  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_READ)
  async list(@Query() query: unknown) {
    const parsed = listStoresQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    return this.storesService.listStores(parsed.data);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_WRITE)
  async create(@Body() body: unknown) {
    const parsed = createStoreSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid store");
    }
    return { store: await this.storesService.createStore(parsed.data) };
  }

  @Get("/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_READ)
  async getOne(@Param("id") id: string) {
    return { store: await this.storesService.getStoreById(id) };
  }

  @Patch("/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_WRITE)
  async update(@Param("id") id: string, @Body() body: unknown) {
    const parsed = updateStoreSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid store update");
    }
    return { store: await this.storesService.updateStore(id, parsed.data) };
  }

  @Delete("/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_WRITE)
  async remove(@Param("id") id: string) {
    return this.storesService.deleteStore(id);
  }
}
