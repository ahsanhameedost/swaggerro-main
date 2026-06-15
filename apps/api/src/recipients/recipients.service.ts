import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthUser } from "../common/guards/auth.guard";
import { hasPermission } from "../common/utils/permissions";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateRecipientDto,
  ListRecipientsQueryDto,
  UpdateRecipientDto
} from "./recipient.dto";

@Injectable()
export class RecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListRecipientsQueryDto, authUser: AuthUser) {
    const ownerId = this.resolveOwnerId(query.userId, authUser);

    const recipients = await this.prisma.recipient.findMany({
      where: {
        userId: ownerId,
        ...(query.countryCode ? { countryCode: query.countryCode } : {}),
        ...(query.search?.trim()
          ? {
              OR: [
                { firstName: { contains: query.search.trim(), mode: "insensitive" } },
                { lastName: { contains: query.search.trim(), mode: "insensitive" } },
                { email: { contains: query.search.trim(), mode: "insensitive" } },
                { companyName: { contains: query.search.trim(), mode: "insensitive" } },
                { city: { contains: query.search.trim(), mode: "insensitive" } },
                { countryName: { contains: query.search.trim(), mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: [{ isDefault: "desc" }, { firstName: "asc" }, { lastName: "asc" }, { createdAt: "desc" }]
    });

    return recipients.map((recipient) => this.serializeRecipient(recipient));
  }

  async create(input: CreateRecipientDto, authUser: AuthUser) {
    const ownerId = this.resolveOwnerId(undefined, authUser);

    const recipient = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.recipient.updateMany({
          where: { userId: ownerId, isDefault: true },
          data: { isDefault: false }
        });
      }

      return tx.recipient.create({
        data: {
          userId: ownerId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          companyName: this.toNullableString(input.companyName),
          email: this.toNullableString(input.email),
          phone: this.toNullableString(input.phone),
          addressLine1: input.addressLine1.trim(),
          addressLine2: this.toNullableString(input.addressLine2),
          city: input.city.trim(),
          state: this.toNullableString(input.state),
          postalCode: input.postalCode.trim(),
          countryCode: input.countryCode,
          countryName: input.countryName.trim(),
          notes: this.toNullableString(input.notes),
          isDefault: input.isDefault
        }
      });
    });

    return this.serializeRecipient(recipient);
  }

  async update(id: string, input: UpdateRecipientDto, authUser: AuthUser) {
    const existing = await this.findAccessibleRecipientOrThrow(id, authUser);

    const recipient = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.recipient.updateMany({
          where: { userId: existing.userId, isDefault: true, id: { not: existing.id } },
          data: { isDefault: false }
        });
      }

      return tx.recipient.update({
        where: { id: existing.id },
        data: {
          ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
          ...(input.companyName !== undefined ? { companyName: this.toNullableString(input.companyName) } : {}),
          ...(input.email !== undefined ? { email: this.toNullableString(input.email) } : {}),
          ...(input.phone !== undefined ? { phone: this.toNullableString(input.phone) } : {}),
          ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1.trim() } : {}),
          ...(input.addressLine2 !== undefined ? { addressLine2: this.toNullableString(input.addressLine2) } : {}),
          ...(input.city !== undefined ? { city: input.city.trim() } : {}),
          ...(input.state !== undefined ? { state: this.toNullableString(input.state) } : {}),
          ...(input.postalCode !== undefined ? { postalCode: input.postalCode.trim() } : {}),
          ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
          ...(input.countryName !== undefined ? { countryName: input.countryName.trim() } : {}),
          ...(input.notes !== undefined ? { notes: this.toNullableString(input.notes) } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {})
        }
      });
    });

    return this.serializeRecipient(recipient);
  }

  async delete(id: string, authUser: AuthUser) {
    const existing = await this.findAccessibleRecipientOrThrow(id, authUser);

    await this.prisma.$transaction(async (tx) => {
      await tx.shippingShipment.updateMany({
        where: { recipientId: existing.id },
        data: { recipientId: null }
      });

      await tx.recipient.delete({
        where: { id: existing.id }
      });
    });

    return { ok: true };
  }

  async findAccessibleRecipientOrThrow(id: string, authUser: AuthUser) {
    const recipient = await this.prisma.recipient.findUnique({ where: { id } });

    if (!recipient) {
      throw new NotFoundException("Recipient not found");
    }

    if (!hasPermission(authUser, "recipients.read") && recipient.userId !== authUser.sub) {
      throw new ForbiddenException("You do not have access to this recipient");
    }

    return recipient;
  }

  private resolveOwnerId(userId: string | undefined, authUser: AuthUser) {
    if (hasPermission(authUser, "recipients.read")) {
      if (userId?.trim()) {
        return userId.trim();
      }
      return authUser.sub;
    }

    return authUser.sub;
  }

  private toNullableString(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private serializeRecipient(recipient: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    countryCode: string;
    countryName: string;
    notes: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: recipient.id,
      userId: recipient.userId,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      companyName: recipient.companyName,
      email: recipient.email,
      phone: recipient.phone,
      addressLine1: recipient.addressLine1,
      addressLine2: recipient.addressLine2,
      city: recipient.city,
      state: recipient.state,
      postalCode: recipient.postalCode,
      countryCode: recipient.countryCode,
      countryName: recipient.countryName,
      notes: recipient.notes,
      isDefault: recipient.isDefault,
      createdAt: recipient.createdAt.toISOString(),
      updatedAt: recipient.updatedAt.toISOString()
    };
  }
}
