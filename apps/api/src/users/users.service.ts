import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { isBusinessEmail } from "../common/utils/business-email";
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
    // The self-signup Customer role is never manually assignable. SUPER_ADMIN is
    // only assignable by an existing SUPER_ADMIN — lower admins (e.g. ADMIN /
    // MANAGER) can create staff but cannot mint super admins.
    const excluded = [CUSTOMER_ROLE_NAME];
    if (authUser.role !== SUPER_ADMIN_ROLE_NAME) {
      excluded.push(SUPER_ADMIN_ROLE_NAME);
    }

    return this.prisma.role.findMany({
      where: { name: { notIn: excluded } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true
      }
    });
  }

  async createEmployee(input: CreateEmployeeDto, authUser: AuthUser) {
    const email = input.email.trim().toLowerCase();

    if (!isBusinessEmail(email)) {
      throw new BadRequestException("Employee email must be a business email address");
    }

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

    if (!employee || SYSTEM_ROLE_NAMES.has(employee.role.name)) {
      throw new NotFoundException("Employee not found");
    }

    const email = input.email.trim().toLowerCase();

    if (!isBusinessEmail(email)) {
      throw new BadRequestException("Employee email must be a business email address");
    }

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

  async listUsers(query: ListUsersQueryDto = {}) {
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
        role: { select: { id: true, name: true } }
      }
    });

    return users;
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

    if (!role || role.name === CUSTOMER_ROLE_NAME) {
      throw new BadRequestException("Select a valid internal role");
    }

    // Only an existing super admin may create/assign the SUPER_ADMIN role.
    if (role.name === SUPER_ADMIN_ROLE_NAME && authUser.role !== SUPER_ADMIN_ROLE_NAME) {
      throw new ForbiddenException("Only a super admin can assign the super admin role");
    }

    return role;
  }
}
