import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { isBusinessEmail } from "../common/utils/business-email";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateEmployeeDto,
  ListUsersQueryDto,
  UpdateEmployeeDto
} from "./user.dto";

type CreateUserInput = {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

const SYSTEM_ROLE_NAMES = new Set(["SUPER_ADMIN", "USER"]);

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
    const role = await this.prisma.role.findUnique({ where: { name: "USER" } });

    if (!role) {
      throw new Error("Missing USER role. Run db:seed.");
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

  async listAssignableRoles() {
    return this.prisma.role.findMany({
      where: { name: { notIn: Array.from(SYSTEM_ROLE_NAMES) } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true
      }
    });
  }

  async createEmployee(input: CreateEmployeeDto) {
    const email = input.email.trim().toLowerCase();

    if (!isBusinessEmail(email)) {
      throw new BadRequestException("Employee email must be a business email address");
    }

    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const role = await this.assertAssignableRole(input.roleId);
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

  async updateEmployee(id: string, input: UpdateEmployeeDto) {
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

    const role = await this.assertAssignableRole(input.roleId);

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

  private async assertAssignableRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true }
    });

    if (!role || SYSTEM_ROLE_NAMES.has(role.name)) {
      throw new BadRequestException("Select a valid internal role");
    }

    return role;
  }
}
