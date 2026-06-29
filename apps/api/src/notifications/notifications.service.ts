import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  data?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Fire-and-forget create — a failed notification must never break the action
  // that triggered it.
  async notify(input: NotificationInput) {
    try {
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          link: input.link ?? null,
          data: input.data ?? Prisma.JsonNull
        }
      });
    } catch (error) {
      this.logger.error(
        `failed to create notification for user=${input.userId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async notifyMany(userIds: string[], input: Omit<NotificationInput, "userId">) {
    await Promise.all(userIds.map((userId) => this.notify({ ...input, userId })));
  }

  // Notify every super admin (used for platform-wide events like new orders /
  // seller applications).
  async notifyAdmins(input: Omit<NotificationInput, "userId">) {
    const admins = await this.prisma.user.findMany({
      where: { role: { name: "SUPER_ADMIN" } },
      select: { id: true }
    });
    await this.notifyMany(
      admins.map((a) => a.id),
      input
    );
  }

  async list(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    const items = await this.prisma.notification.findMany({
      where: { userId, ...(opts.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: Math.min(opts.limit ?? 30, 100)
    });
    return items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.readAt != null,
      createdAt: n.createdAt.toISOString()
    }));
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { count };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() }
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() }
    });
    return { ok: true };
  }
}
