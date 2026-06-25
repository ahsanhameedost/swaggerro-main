import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { AuthGuard } from "../common/guards/auth.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import {
  createSellerApplicationSchema,
  listSellerApplicationsQuerySchema,
  updateSellerApplicationStatusSchema
} from "./dto/partner.dto";
import { PartnersService } from "./partners.service";

const READ_PERMISSION = "partners.applications.read";
const WRITE_PERMISSION = "partners.applications.write";

function csvCell(value: unknown) {
  const str = value == null ? "" : String(value);
  // Always quote and escape embedded quotes; prevents injection/comma breakage.
  return `"${str.replace(/"/g, '""')}"`;
}

@Controller("partners")
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  // Public — prospective sellers/partners submit without an account.
  @Post("/applications")
  async create(@Body() body: unknown) {
    const parsed = createSellerApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid application");
    }
    const { id } = await this.partnersService.createApplication(parsed.data);
    return { ok: true, id };
  }

  @Get("/applications")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(READ_PERMISSION)
  async list(@Query() query: unknown) {
    const parsed = listSellerApplicationsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    return this.partnersService.listApplications(parsed.data);
  }

  // Declared before :id so the literal route wins.
  @Get("/applications/export")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(READ_PERMISSION)
  async export(@Query() query: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const parsed = listSellerApplicationsQuerySchema.partial().safeParse(query);
    const rows = await this.partnersService.listAllForExport({
      search: parsed.success ? parsed.data.search : undefined,
      status: parsed.success ? parsed.data.status : undefined
    });

    const headers = [
      "ID",
      "Company",
      "Contact",
      "Email",
      "Phone",
      "Industry",
      "Country",
      "Website",
      "Status",
      "Address",
      "Business Description",
      "Additional Info",
      "Submitted At"
    ];

    const lines = [headers.map(csvCell).join(",")];
    for (const row of rows) {
      lines.push(
        [
          row.id,
          row.companyName,
          row.contactName,
          row.email,
          row.phone,
          row.industry,
          row.country,
          row.website ?? "",
          row.status,
          row.companyAddress,
          row.businessDescription,
          row.additionalInfo ?? "",
          row.createdAt
        ]
          .map(csvCell)
          .join(",")
      );
    }

    const csv = "﻿" + lines.join("\r\n");
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header(
      "content-disposition",
      `attachment; filename="seller-applications-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return csv;
  }

  @Get("/applications/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(READ_PERMISSION)
  async getOne(@Param("id") id: string) {
    return { application: await this.partnersService.getApplicationById(id) };
  }

  @Patch("/applications/:id/status")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions(WRITE_PERMISSION)
  async updateStatus(@Param("id") id: string, @Body() body: unknown) {
    const parsed = updateSellerApplicationStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid status update");
    }
    return { application: await this.partnersService.updateStatus(id, parsed.data) };
  }
}
