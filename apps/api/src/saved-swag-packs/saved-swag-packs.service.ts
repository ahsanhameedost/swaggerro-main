import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SavedSwagPacksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const packs = await this.prisma.savedSwagPack.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return { packs };
  }

  async save(userId: string, input: { name: string; snapshot: unknown }) {
    const pack = await this.prisma.savedSwagPack.create({
      data: {
        userId,
        name: input.name.trim(),
        snapshot: input.snapshot as Prisma.InputJsonValue
      }
    });
    return { pack };
  }

  async remove(userId: string, id: string) {
    // Scoped delete — a user can only remove their own saved packs.
    await this.prisma.savedSwagPack.deleteMany({ where: { id, userId } });
    return { ok: true as const };
  }
}
