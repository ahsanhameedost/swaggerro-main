import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard, type AuthUser } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { parseOrThrow } from "../catalog/common/parse-or-throw";
import { CouponsService } from "./coupons.service";
import {
  createCouponSchema,
  listCouponsQuerySchema,
  updateCouponSchema,
  validateCouponSchema,
} from "./dto/coupon.dto";

const ADMIN_READ = "coupons.read";
const ADMIN_WRITE = "coupons.write";
const SELLER_READ = "seller.store.read";
const SELLER_WRITE = "seller.store.write";

@Controller("coupons")
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  // Public preview used by checkout UIs to show the discount before paying. The
  // authoritative re-check (with the signed-in user) happens inside each
  // checkout service when the order is created / paid.
  @Post("validate")
  async validate(@Body() body: unknown, @Req() req: FastifyRequest & { user?: AuthUser }) {
    const input = parseOrThrow(validateCouponSchema.safeParse(body), "Invalid coupon request");
    const result = await this.coupons.validateForCheckout({
      code: input.code,
      lines: input.lines,
      storeId: input.storeId ?? null,
      userId: req.user?.sub ?? null,
    });
    return {
      valid: true,
      code: result.code,
      discountAmount: result.discountAmount,
    };
  }

  // ── Seller (scoped to their own store) ─────────────────────────────────────
  @Get("mine")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(SELLER_READ)
  async listMine(@Query() query: unknown, @Req() req: FastifyRequest & { user?: AuthUser }) {
    const parsed = parseOrThrow(listCouponsQuerySchema.safeParse(query), "Invalid query");
    const storeId = await this.coupons.getSellerStoreId(req.user!.sub);
    return this.coupons.list({ query: parsed, restrictStoreId: storeId });
  }

  @Post("mine")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(SELLER_WRITE)
  async createMine(@Body() body: unknown, @Req() req: FastifyRequest & { user?: AuthUser }) {
    const input = parseOrThrow(createCouponSchema.safeParse(body), "Invalid coupon");
    const storeId = await this.coupons.getSellerStoreId(req.user!.sub);
    return { coupon: await this.coupons.create(input, { createdByUserId: req.user!.sub, forcedStoreId: storeId }) };
  }

  @Patch("mine/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(SELLER_WRITE)
  async updateMine(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    const input = parseOrThrow(updateCouponSchema.safeParse(body), "Invalid coupon");
    const storeId = await this.coupons.getSellerStoreId(req.user!.sub);
    return { coupon: await this.coupons.update(id, input, { restrictStoreId: storeId }) };
  }

  @Delete("mine/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(SELLER_WRITE)
  async removeMine(@Param("id") id: string, @Req() req: FastifyRequest & { user?: AuthUser }) {
    const storeId = await this.coupons.getSellerStoreId(req.user!.sub);
    return this.coupons.remove(id, { restrictStoreId: storeId });
  }

  // ── Admin (all coupons) ────────────────────────────────────────────────────
  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_READ)
  async list(@Query() query: unknown) {
    const parsed = parseOrThrow(listCouponsQuerySchema.safeParse(query), "Invalid query");
    return this.coupons.list({ query: parsed });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_WRITE)
  async create(@Body() body: unknown, @Req() req: FastifyRequest & { user?: AuthUser }) {
    const input = parseOrThrow(createCouponSchema.safeParse(body), "Invalid coupon");
    return { coupon: await this.coupons.create(input, { createdByUserId: req.user!.sub }) };
  }

  @Patch(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_WRITE)
  async update(@Param("id") id: string, @Body() body: unknown) {
    const input = parseOrThrow(updateCouponSchema.safeParse(body), "Invalid coupon");
    return { coupon: await this.coupons.update(id, input, {}) };
  }

  @Delete(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_WRITE)
  async remove(@Param("id") id: string) {
    return this.coupons.remove(id, {});
  }
}
