import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const SYSTEM_ROLE_NAMES = new Set(["SUPER_ADMIN", "Customer"]);

function normalizeRoleName(input: string) {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { key: "asc" },
      select: { id: true, key: true, description: true }
    });
  }

  async listRolesExceptSuperAdmin() {
    const roles = await this.prisma.role.findMany({
      where: { name: { not: "SUPER_ADMIN" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { users: true } },
        permissions: { select: { permission: { select: { key: true } } } }
      }
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.users,
      isSystem: SYSTEM_ROLE_NAMES.has(role.name),
      permissionKeys: role.permissions.map((rp) => rp.permission.key).sort()
    }));
  }

  async createRole(input: { name: string; description?: string | null }) {
    const name = normalizeRoleName(input.name);

    if (!name) {
      throw new BadRequestException("Role name is required");
    }

    if (SYSTEM_ROLE_NAMES.has(name)) {
      throw new BadRequestException("That role name is reserved");
    }

    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException("Role name already exists");
    }

    return this.prisma.role.create({
      data: {
        name,
        description: input.description?.trim() || null
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { users: true } },
        permissions: { select: { permission: { select: { key: true } } } }
      }
    }).then((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.users,
      isSystem: false,
      permissionKeys: role.permissions.map((rp) => rp.permission.key).sort()
    }));
  }

  async updateRole(roleId: string, input: { name: string; description?: string | null }) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true }
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    if (SYSTEM_ROLE_NAMES.has(role.name)) {
      throw new BadRequestException("System roles cannot be renamed");
    }

    const name = normalizeRoleName(input.name);

    if (!name) {
      throw new BadRequestException("Role name is required");
    }

    if (SYSTEM_ROLE_NAMES.has(name)) {
      throw new BadRequestException("That role name is reserved");
    }

    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing && existing.id !== roleId) {
      throw new ConflictException("Role name already exists");
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name,
        description: input.description?.trim() || null
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { users: true } },
        permissions: { select: { permission: { select: { key: true } } } }
      }
    }).then((updatedRole) => ({
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      userCount: updatedRole._count.users,
      isSystem: false,
      permissionKeys: updatedRole.permissions.map((rp) => rp.permission.key).sort()
    }));
  }

  async deleteRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        _count: { select: { users: true } }
      }
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    if (SYSTEM_ROLE_NAMES.has(role.name)) {
      throw new BadRequestException("System roles cannot be deleted");
    }

    if (role._count.users > 0) {
      throw new BadRequestException("Reassign users before deleting this role");
    }

    await this.prisma.role.delete({ where: { id: roleId } });
    return { ok: true };
  }

  async replaceRolePermissions(roleId: string, permissionKeys: string[]) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true }
    });

    if (!role) throw new NotFoundException("Role not found");
    if (role.name === "SUPER_ADMIN") throw new BadRequestException("Cannot edit SUPER_ADMIN role");

    const perms = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true, key: true }
    });

    const found = new Set(perms.map((p) => p.key));
    const missing = permissionKeys.filter((key) => !found.has(key));
    if (missing.length) throw new BadRequestException("Unknown permission keys: " + missing.join(", "));

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (perms.length) {
        await tx.rolePermission.createMany({
          data: perms.map((permission) => ({ roleId: role.id, permissionId: permission.id }))
        });
      }
    });

    return { ok: true };
  }
}
