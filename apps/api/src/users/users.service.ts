import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../common/guards/auth.guard";
import type {
  CreateEmployeeDto,
  ListUsersQueryDto,
  UpdateEmployeeDto,
  UpdateProfileDto
} from "./user.dto";

type CreateUserInput = {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

// The role assigned to self-registering customers (was "USER"). It is the only
// role NOT manually assignable to staff in the employee-creation flow.
const CUSTOMER_ROLE_NAME = "Customer";
const SUPER_ADMIN_ROLE_NAME = "SUPER_ADMIN";
const SYSTEM_ROLE_NAMES = new Set(["SUPER_ADMIN", CUSTOMER_ROLE_NAME]);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(input: CreateUserInput) {
    const role = await this.prisma.role.findUnique({ where: { name: CUSTOMER_ROLE_NAME } });

    if (!role) {
      throw new Error("Missing Customer role. Run db:seed.");
    }

    return this.prisma.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        phone: input.phone?.trim() || null,
        roleId: role.id
      }
    });
  }

  async listAssignableRoles(authUser: AuthUser) {
    // Customer (the self-signup role) IS assignable so an admin can create
    // customers and change anyone's role to/from Customer. SUPER_ADMIN stays
    // gated: only an existing SUPER_ADMIN can assign it.
    const excluded: string[] = [];
    if (authUser.role !== SUPER_ADMIN_ROLE_NAME) {
      excluded.push(SUPER_ADMIN_ROLE_NAME);
    }

    const roles = await this.prisma.role.findMany({
      where: excluded.length ? { name: { notIn: excluded } } : {},
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { users: true } }
      }
    });

    // Collapse roles that render to the same display name (e.g. legacy duplicates
    // "DESIGNER" and "Designer"), so the assignable-role dropdown never shows the
    // same role twice. Prefer the copy that actually has users attached.
    const canonical = new Map<string, (typeof roles)[number]>();
    for (const role of roles) {
      const key = role.name.trim().toUpperCase();
      const current = canonical.get(key);
      if (!current || role._count.users > current._count.users) {
        canonical.set(key, role);
      }
    }

    return Array.from(canonical.values())
      .map(({ _count, ...role }) => role)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createEmployee(input: CreateEmployeeDto, authUser: AuthUser) {
    const email = input.email.trim().toLowerCase();

    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const role = await this.assertAssignableRole(input.roleId, authUser);
    const passwordHash = bcrypt.hashSync(input.password, 12);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        roleId: role.id
      }
    });
  }

  async updateEmployee(id: string, input: UpdateEmployeeDto, authUser: AuthUser) {
    const employee = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: { select: { name: true } } }
    });

    if (!employee) {
      throw new NotFoundException("User not found");
    }
    // Only a super admin may edit a super admin account. Everyone else with
    // write access can edit any other user (including customers) — e.g. to
    // change their role.
    if (employee.role.name === SUPER_ADMIN_ROLE_NAME && authUser.role !== SUPER_ADMIN_ROLE_NAME) {
      throw new ForbiddenException("Only a super admin can edit a super admin.");
    }

    const email = input.email.trim().toLowerCase();

    const emailOwner = await this.findByEmail(email);
    if (emailOwner && emailOwner.id !== id) {
      throw new ConflictException("Email already in use");
    }

    const role = await this.assertAssignableRole(input.roleId, authUser);

    return this.prisma.user.update({
      where: { id },
      data: {
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        roleId: role.id,
        ...(input.password?.trim()
          ? {
              passwordHash: bcrypt.hashSync(input.password.trim(), 12)
            }
          : {})
      }
    });
  }

  async deleteEmployee(id: string) {
    const employee = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: { select: { name: true } } }
    });

    if (!employee || SYSTEM_ROLE_NAMES.has(employee.role.name)) {
      throw new NotFoundException("Employee not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.catalogOrder.updateMany({
        where: { assignedEmployeeId: id },
        data: { assignedEmployeeId: null }
      });

      await tx.user.delete({
        where: { id }
      });
    });

    return { ok: true };
  }

  // Delete ANY user (customer, staff, seller, …) from the Users admin. Guards
  // against removing yourself or the last super admin, and surfaces a clear error
  // when the account is still linked to records that block deletion.
  async deleteUser(id: string, authUser: AuthUser) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: { select: { name: true } } }
    });
    if (!target) {
      throw new NotFoundException("User not found");
    }
    if (target.id === authUser.sub) {
      throw new BadRequestException("You can't delete your own account.");
    }
    if (target.role.name === SUPER_ADMIN_ROLE_NAME) {
      if (authUser.role !== SUPER_ADMIN_ROLE_NAME) {
        throw new ForbiddenException("Only a super admin can delete a super admin.");
      }
      const superAdmins = await this.prisma.user.count({
        where: { role: { name: SUPER_ADMIN_ROLE_NAME } }
      });
      if (superAdmins <= 1) {
        throw new BadRequestException("You can't delete the last super admin.");
      }
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Detach nullable references that don't cascade so the row can be removed.
        await tx.catalogOrder.updateMany({
          where: { assignedEmployeeId: id },
          data: { assignedEmployeeId: null }
        });
        await tx.user.delete({ where: { id } });
      });
    } catch (error) {
      // FK constraint (e.g. the user created shipments, which are Restrict).
      if ((error as { code?: string }).code === "P2003") {
        throw new ConflictException(
          "This user is linked to records that can't be removed (e.g. shipments they created), so the account can't be deleted."
        );
      }
      throw error;
    }

    return { ok: true };
  }

  async updateProfile(userId: string, input: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const email = input.email.trim().toLowerCase();

    const emailOwner = await this.findByEmail(email);
    if (emailOwner && emailOwner.id !== userId) {
      throw new ConflictException("Email already in use");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        // Only touch avatar fields when the client explicitly sends them.
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl || null } : {}),
        ...(input.avatarKey !== undefined ? { avatarKey: input.avatarKey || null } : {})
      }
    });

    return this.findByIdWithPermissions(userId);
  }

  async updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }

  async findByIdWithPermissions(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: {
          select: {
            name: true,
            permissions: { select: { permission: { select: { key: true } } } }
          }
        }
      }
    });

    if (!user) return null;

    const permissions = user.role.permissions.map((rp) => rp.permission.key).sort();

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role.name,
      permissions
    };
  }

  async listUsers(query: ListUsersQueryDto = {}, authUser?: AuthUser) {
    // Only a super admin may see the encrypted password hash + username.
    const isSuperAdmin = authUser?.role === SUPER_ADMIN_ROLE_NAME;
    const users = await this.prisma.user.findMany({
      where: {
        ...(query.role ? { role: { name: query.role } } : {}),
        ...(query.search?.trim()
          ? {
              OR: [
                { email: { contains: query.search.trim(), mode: "insensitive" } },
                { firstName: { contains: query.search.trim(), mode: "insensitive" } },
                { lastName: { contains: query.search.trim(), mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
        ...(isSuperAdmin
          ? { username: true, passwordHash: true, emailVerifiedAt: true, mustSetPassword: true }
          : {})
      }
    });

    return users;
  }

  // Super admin / admin.users.write can set a new password for any user. A
  // non-super-admin cannot reset a super admin's password.
  async resetUserPassword(targetId: string, newPassword: string, authUser: AuthUser) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: { select: { name: true } } }
    });
    if (!target) {
      throw new NotFoundException("User not found");
    }
    if (target.role.name === SUPER_ADMIN_ROLE_NAME && authUser.role !== SUPER_ADMIN_ROLE_NAME) {
      throw new ForbiddenException("Only a super admin can reset a super admin's password");
    }
    await this.prisma.user.update({
      where: { id: targetId },
      data: { passwordHash: bcrypt.hashSync(newPassword, 12), mustSetPassword: false }
    });
    return { ok: true };
  }

  async listEmployees(search?: string) {
    return this.prisma.user.findMany({
      where: {
        role: { name: { notIn: Array.from(SYSTEM_ROLE_NAMES) } },
        ...(search?.trim()
          ? {
              OR: [
                { email: { contains: search.trim(), mode: "insensitive" } },
                { firstName: { contains: search.trim(), mode: "insensitive" } },
                { lastName: { contains: search.trim(), mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        role: { select: { id: true, name: true } }
      }
    });
  }

  private async assertAssignableRole(roleId: string, authUser: AuthUser) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true }
    });

    if (!role) {
      throw new BadRequestException("Select a valid role");
    }

    // Only an existing super admin may create/assign the SUPER_ADMIN role.
    if (role.name === SUPER_ADMIN_ROLE_NAME && authUser.role !== SUPER_ADMIN_ROLE_NAME) {
      throw new ForbiddenException("Only a super admin can assign the super admin role");
    }

    return role;
  }
}
