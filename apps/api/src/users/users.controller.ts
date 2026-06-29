import {
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
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthGuard, type AuthUser } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { parseOrThrow } from "../catalog/common/parse-or-throw";
import {
  createEmployeeSchema,
  listUsersQuerySchema,
  resetUserPasswordSchema,
  updateEmployeeSchema
} from "./user.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(AuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions("admin.users.read")
  async list(@Query() query: unknown, @Req() req: FastifyRequest & { user?: AuthUser }) {
    return {
      users: await this.users.listUsers(
        parseOrThrow(listUsersQuerySchema.safeParse(query), "Invalid user query"),
        req.user!
      )
    };
  }

  @Post(":id/reset-password")
  @RequirePermissions("admin.users.write")
  async resetPassword(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    const dto = parseOrThrow(resetUserPasswordSchema.safeParse(body), "Invalid password");
    return this.users.resetUserPassword(id, dto.newPassword, req.user!);
  }

  @Get("employee-roles")
  @RequirePermissions("admin.users.read")
  async employeeRoles(@Req() req: FastifyRequest & { user?: AuthUser }) {
    return { roles: await this.users.listAssignableRoles(req.user!) };
  }

  @Get("employees")
  @RequirePermissions("admin.users.read")
  async listEmployees(@Query("search") search?: string) {
    return { users: await this.users.listEmployees(search) };
  }

  @Post("employees")
  @RequirePermissions("admin.users.write")
  async createEmployee(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      user: await this.users.createEmployee(
        parseOrThrow(createEmployeeSchema.safeParse(body), "Invalid employee payload"),
        req.user!
      )
    };
  }

  @Patch("employees/:id")
  @RequirePermissions("admin.users.write")
  async updateEmployee(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      user: await this.users.updateEmployee(
        id,
        parseOrThrow(updateEmployeeSchema.safeParse(body), "Invalid employee payload"),
        req.user!
      )
    };
  }

  @Delete("employees/:id")
  @RequirePermissions("admin.users.write")
  async deleteEmployee(@Param("id") id: string) {
    return await this.users.deleteEmployee(id);
  }
}
