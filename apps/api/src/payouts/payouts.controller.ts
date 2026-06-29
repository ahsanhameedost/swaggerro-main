import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard, type AuthUser } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import {
  createPayoutSchema,
  setCommissionSchema,
  updatePayoutDetailsSchema
} from "./payouts.dto";
import { PayoutsService } from "./payouts.service";

const ADMIN_READ = "partners.stores.read";
const ADMIN_WRITE = "partners.stores.write";

@Controller("payouts")
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  // ---- seller self-service ----
  @Get("me")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("seller.store.read")
  async mySummary(@Req() req: FastifyRequest & { user?: AuthUser }) {
    return this.payouts.sellerSummary(req.user!.sub);
  }

  @Patch("me/details")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("seller.store.write")
  async updateMyDetails(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    const parsed = updatePayoutDetailsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid details");
    }
    return this.payouts.sellerUpdateDetails(req.user!.sub, parsed.data);
  }

  // ---- admin ----
  @Get("admin/stores")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_READ)
  async listStores() {
    return this.payouts.adminListStores();
  }

  @Get("admin/stores/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_READ)
  async getStore(@Param("id") id: string) {
    return this.payouts.adminGetStore(id);
  }

  @Patch("admin/stores/:id/commission")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_WRITE)
  async setCommission(@Param("id") id: string, @Body() body: unknown) {
    const parsed = setCommissionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid commission");
    }
    return this.payouts.setCommission(id, parsed.data);
  }

  @Post("admin/stores/:id/pay")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(ADMIN_WRITE)
  async pay(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    const parsed = createPayoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid payout");
    }
    return this.payouts.createPayout(req.user!.sub, id, parsed.data);
  }
}
