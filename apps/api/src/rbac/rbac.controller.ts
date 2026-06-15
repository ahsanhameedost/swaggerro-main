import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { RbacService } from "./rbac.service";
import { z } from "zod";

const replaceSchema = z.object({
  permissionKeys: z.array(z.string().min(1)).default([])
});

const roleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional().nullable()
});

@Controller("rbac")
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions("rbac.manage")
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get("permissions")
  async permissions() {
    return { permissions: await this.rbac.listPermissions() };
  }

  @Get("roles")
  async roles() {
    return { roles: await this.rbac.listRolesExceptSuperAdmin() };
  }

  @Post("roles")
  async createRole(@Body() body: unknown) {
    return { role: await this.rbac.createRole(roleSchema.parse(body)) };
  }

  @Patch("roles/:roleId")
  async updateRole(@Param("roleId") roleId: string, @Body() body: unknown) {
    return { role: await this.rbac.updateRole(roleId, roleSchema.parse(body)) };
  }

  @Delete("roles/:roleId")
  async deleteRole(@Param("roleId") roleId: string) {
    return await this.rbac.deleteRole(roleId);
  }

  @Put("roles/:roleId/permissions")
  async replace(@Param("roleId") roleId: string, @Body() body: unknown) {
    const dto = replaceSchema.parse(body);
    return await this.rbac.replaceRolePermissions(roleId, dto.permissionKeys);
  }
}
