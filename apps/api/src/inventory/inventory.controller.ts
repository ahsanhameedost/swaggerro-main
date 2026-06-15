import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { RequireAnyPermissions, RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthGuard, type AuthUser } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { parseOrThrow } from "../catalog/common/parse-or-throw";
import { InventoryService } from "./inventory.service";
import {
  adjustInventorySchema,
  listInventoryLedgerQuerySchema,
  listInventoryQuerySchema,
  receiveInventorySchema
} from "./inventory.dto";

@Controller("inventory")
@UseGuards(AuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequireAnyPermissions("inventory.read", "inventory.assigned.read", "inventory.self.read")
  async listInventory(
    @Query() query: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.inventoryService.listInventory(
      parseOrThrow(listInventoryQuerySchema.safeParse(query), "Invalid inventory query"),
      req.user!
    );
  }

  @Get("ledger")
  @RequireAnyPermissions("inventory.read", "inventory.assigned.read", "inventory.self.read")
  async listInventoryLedger(
    @Query() query: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.inventoryService.listInventoryLedger(
      parseOrThrow(listInventoryLedgerQuerySchema.safeParse(query), "Invalid inventory ledger query"),
      req.user!
    );
  }

  @Post("receive")
  @RequirePermissions("inventory.adjust")
  async receiveInventory(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.inventoryService.receiveInventory(
      parseOrThrow(receiveInventorySchema.safeParse(body), "Invalid inventory receipt payload"),
      req.user!
    );
  }

  @Post("adjust")
  @RequirePermissions("inventory.adjust")
  async adjustInventory(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.inventoryService.adjustInventory(
      parseOrThrow(adjustInventorySchema.safeParse(body), "Invalid inventory adjustment payload"),
      req.user!
    );
  }
}
