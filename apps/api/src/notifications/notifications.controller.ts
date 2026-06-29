import { Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../common/guards/auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @Req() req: FastifyRequest & { user?: { sub: string } },
    @Query("unread") unread?: string,
    @Query("limit") limit?: string
  ) {
    return {
      notifications: await this.notifications.list(req.user!.sub, {
        unreadOnly: unread === "true" || unread === "1",
        limit: limit ? Number(limit) : undefined
      })
    };
  }

  @Get("unread-count")
  async unreadCount(@Req() req: FastifyRequest & { user?: { sub: string } }) {
    return this.notifications.unreadCount(req.user!.sub);
  }

  @Post(":id/read")
  async markRead(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: { sub: string } }
  ) {
    return this.notifications.markRead(req.user!.sub, id);
  }

  @Post("read-all")
  async markAllRead(@Req() req: FastifyRequest & { user?: { sub: string } }) {
    return this.notifications.markAllRead(req.user!.sub);
  }
}
