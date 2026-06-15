import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { RequireAnyPermissions } from "../common/decorators/permissions.decorator";
import { AuthGuard, type AuthUser } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { parseOrThrow } from "../catalog/common/parse-or-throw";
import {
  createRecipientSchema,
  listRecipientsQuerySchema,
  updateRecipientSchema
} from "./recipient.dto";
import { RecipientsService } from "./recipients.service";

@Controller("recipients")
@UseGuards(AuthGuard, PermissionsGuard)
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Get()
  @RequireAnyPermissions("recipients.read", "recipients.self.read")
  async list(
    @Query() query: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      recipients: await this.recipientsService.list(
        parseOrThrow(listRecipientsQuerySchema.safeParse(query), "Invalid recipient query"),
        req.user!
      )
    };
  }

  @Post()
  @RequireAnyPermissions("recipients.write", "recipients.self.write")
  async create(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      recipient: await this.recipientsService.create(
        parseOrThrow(createRecipientSchema.safeParse(body), "Invalid recipient payload"),
        req.user!
      )
    };
  }

  @Patch(":id")
  @RequireAnyPermissions("recipients.write", "recipients.self.write")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      recipient: await this.recipientsService.update(
        id,
        parseOrThrow(updateRecipientSchema.safeParse(body), "Invalid recipient payload"),
        req.user!
      )
    };
  }

  @Delete(":id")
  @RequireAnyPermissions("recipients.write", "recipients.self.write")
  async delete(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.recipientsService.delete(id, req.user!);
  }
}
