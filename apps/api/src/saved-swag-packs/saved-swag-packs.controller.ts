import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthGuard, type AuthUser } from "../common/guards/auth.guard";
import { SavedSwagPacksService } from "./saved-swag-packs.service";

const saveSwagPackSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  snapshot: z.any()
});

@Controller("swag-packs")
export class SavedSwagPacksController {
  constructor(private readonly service: SavedSwagPacksService) {}

  @Get()
  @UseGuards(AuthGuard)
  async list(@Req() req: FastifyRequest & { user?: AuthUser }) {
    return this.service.list(req.user!.sub);
  }

  @Post()
  @UseGuards(AuthGuard)
  async save(@Body() body: unknown, @Req() req: FastifyRequest & { user?: AuthUser }) {
    const parsed = saveSwagPackSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid pack");
    }
    return this.service.save(req.user!.sub, parsed.data);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async remove(@Param("id") id: string, @Req() req: FastifyRequest & { user?: AuthUser }) {
    return this.service.remove(req.user!.sub, id);
  }
}
