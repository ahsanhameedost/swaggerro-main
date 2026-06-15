import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../common/guards/auth.guard";
import { randomUUID } from "crypto";
import { slugify } from "../common/utils/slug";
import { hasPermission } from "../common/utils/permissions";
import type {
  CreateShipmentPaymentDto,
  CreateShippingProfileDto,
  CreateShippingRateDto,
  CreateShippingShipmentDto,
  CreateShippingZoneDto,
  EstimateOrderShipmentDto,
  ListShipmentsQueryDto,
  ListShippingRatesQuery,
  UpdateShipmentTrackingDto,
  UpdateShippingProfileDto,
  UpdateShippingRateDto,
  UpdateShippingShipmentStatusDto,
  UpdateShippingZoneDto
} from "./shipping.dto";

type ShipmentDraftLine = {
  orderItemId: string;
  productId: string;
  productCatalogVariantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitWeightOz: number;
  lineWeightOz: number;
  packageType: "BULK_ITEM" | "PACK" | "MAILER_PACK";
  shippingProfileName: string | null;
  packageCount: number;
};

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  async listShippingProfiles() {
    const items = await this.prisma.shippingProfile.findMany({
      include: {
        countryRules: {
          orderBy: [{ countryCode: "asc" }]
        },
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: [{ name: "asc" }]
    });

    return { items: items.map((item) => this.serializeShippingProfile(item)) };
  }

  async createShippingProfile(input: CreateShippingProfileDto) {
    const slug = await this.ensureUniqueProfileSlug(input.name);

    const created = await this.prisma.shippingProfile.create({
      data: {
        slug,
        name: input.name.trim(),
        packageType: input.packageType,
        shippingScope: input.shippingScope,
        isHazmat: input.isHazmat,
        containsBattery: input.containsBattery,
        containsFood: input.containsFood,
        containsCosmetic: input.containsCosmetic,
        containsLiquid: input.containsLiquid,
        containsWood: input.containsWood,
        isOversized: input.isOversized,
        requiresPhoneForInternational: input.requiresPhoneForInternational,
        requiresEmailForInternational: input.requiresEmailForInternational,
        maxUnitsPerPackage: input.maxUnitsPerPackage ?? null,
        countryRules: {
          create: [
            ...input.allowCountries.map((country) => ({
              countryCode: country.code,
              countryName: country.name,
              ruleType: "ALLOW" as const
            })),
            ...input.blockCountries.map((country) => ({
              countryCode: country.code,
              countryName: country.name,
              ruleType: "BLOCK" as const
            }))
          ]
        }
      },
      include: {
        countryRules: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    return this.serializeShippingProfile(created);
  }

  async updateShippingProfile(id: string, input: UpdateShippingProfileDto) {
    const existing = await this.prisma.shippingProfile.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Shipping profile not found");
    }

    const slug =
      input.name && input.name.trim() !== existing.name
        ? await this.ensureUniqueProfileSlug(input.name, existing.id)
        : existing.slug;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.shippingProfileCountryRule.deleteMany({ where: { profileId: id } });

      return tx.shippingProfile.update({
        where: { id },
        data: {
          slug,
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.packageType !== undefined ? { packageType: input.packageType } : {}),
          ...(input.shippingScope !== undefined ? { shippingScope: input.shippingScope } : {}),
          ...(input.isHazmat !== undefined ? { isHazmat: input.isHazmat } : {}),
          ...(input.containsBattery !== undefined ? { containsBattery: input.containsBattery } : {}),
          ...(input.containsFood !== undefined ? { containsFood: input.containsFood } : {}),
          ...(input.containsCosmetic !== undefined ? { containsCosmetic: input.containsCosmetic } : {}),
          ...(input.containsLiquid !== undefined ? { containsLiquid: input.containsLiquid } : {}),
          ...(input.containsWood !== undefined ? { containsWood: input.containsWood } : {}),
          ...(input.isOversized !== undefined ? { isOversized: input.isOversized } : {}),
          ...(input.requiresPhoneForInternational !== undefined
            ? { requiresPhoneForInternational: input.requiresPhoneForInternational }
            : {}),
          ...(input.requiresEmailForInternational !== undefined
            ? { requiresEmailForInternational: input.requiresEmailForInternational }
            : {}),
          ...(input.maxUnitsPerPackage !== undefined
            ? { maxUnitsPerPackage: input.maxUnitsPerPackage ?? null }
            : {}),
          countryRules: {
            create: [
              ...(input.allowCountries ?? []).map((country) => ({
                countryCode: country.code,
                countryName: country.name,
                ruleType: "ALLOW" as const
              })),
              ...(input.blockCountries ?? []).map((country) => ({
                countryCode: country.code,
                countryName: country.name,
                ruleType: "BLOCK" as const
              }))
            ]
          }
        },
        include: {
          countryRules: true,
          _count: {
            select: {
              products: true
            }
          }
        }
      });
    });

    return this.serializeShippingProfile(updated);
  }

  async deleteShippingProfile(id: string) {
    const productsCount = await this.prisma.catalogProduct.count({
      where: { shippingProfileId: id }
    });

    if (productsCount > 0) {
      throw new BadRequestException("Remove this shipping profile from products before deleting it");
    }

    await this.prisma.shippingProfile.delete({ where: { id } });
    return { ok: true };
  }

  async listShippingZones() {
    const items = await this.prisma.shippingZone.findMany({
      include: {
        countries: {
          orderBy: [{ countryName: "asc" }]
        },
        _count: {
          select: {
            rates: true
          }
        }
      },
      orderBy: [{ isDomestic: "desc" }, { name: "asc" }]
    });

    return { items: items.map((item) => this.serializeShippingZone(item)) };
  }

  async createShippingZone(input: CreateShippingZoneDto) {
    const created = await this.prisma.shippingZone.create({
      data: {
        code: input.code,
        name: input.name.trim(),
        description: this.toNullableString(input.description),
        isDomestic: input.isDomestic,
        isActive: input.isActive,
        countries: {
          create: input.countries.map((country) => ({
            countryCode: country.code,
            countryName: country.name
          }))
        }
      },
      include: {
        countries: true,
        _count: {
          select: {
            rates: true
          }
        }
      }
    });

    return this.serializeShippingZone(created);
  }

  async updateShippingZone(id: string, input: UpdateShippingZoneDto) {
    const existing = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Shipping zone not found");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.countries !== undefined) {
        await tx.shippingZoneCountry.deleteMany({ where: { zoneId: id } });
      }

      return tx.shippingZone.update({
        where: { id },
        data: {
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: this.toNullableString(input.description) } : {}),
          ...(input.isDomestic !== undefined ? { isDomestic: input.isDomestic } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.countries !== undefined
            ? {
                countries: {
                  create: input.countries.map((country) => ({
                    countryCode: country.code,
                    countryName: country.name
                  }))
                }
              }
            : {})
        },
        include: {
          countries: true,
          _count: {
            select: {
              rates: true
            }
          }
        }
      });
    });

    return this.serializeShippingZone(updated);
  }

  async deleteShippingZone(id: string) {
    const ratesCount = await this.prisma.shippingRate.count({ where: { zoneId: id } });
    if (ratesCount > 0) {
      throw new BadRequestException("Delete shipping rates for this zone before deleting it");
    }

    await this.prisma.shippingZone.delete({ where: { id } });
    return { ok: true };
  }

  async listShippingRates(query: ListShippingRatesQuery) {
    const where: Prisma.ShippingRateWhereInput = {
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.serviceLevel ? { serviceLevel: query.serviceLevel } : {}),
      ...(query.packageType ? { packageType: query.packageType } : {})
    };

    const items = await this.prisma.shippingRate.findMany({
      where,
      include: {
        zone: true
      },
      orderBy: [
        { zone: { name: "asc" } },
        { serviceLevel: "asc" },
        { packageType: "asc" },
        { weightFromOz: "asc" }
      ]
    });

    return { items: items.map((item) => this.serializeShippingRate(item)) };
  }

  async listShipments(query: ListShipmentsQueryDto, authUser: AuthUser) {
    const where = await this.buildAccessibleShipmentWhere(query, authUser);

    const shipments = await this.prisma.shippingShipment.findMany({
      where,
      include: {
        recipient: true,
        order: {
          select: {
            id: true,
            userId: true,
            assignedEmployeeId: true,
            name: true,
            email: true
          }
        },
        items: {
          orderBy: [{ createdAt: "asc" }]
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });

    const filtered = shipments.filter((shipment) => {
      const search = query.search?.trim().toLowerCase();
      if (!search) {
        return true;
      }

      return [
        shipment.id,
        shipment.orderId,
        shipment.recipientName ?? "",
        shipment.recipientEmail ?? "",
        shipment.destinationCountryName ?? "",
        shipment.trackingNumber ?? "",
        shipment.order?.name ?? "",
        shipment.order?.email ?? ""
      ].some((value) => value.toLowerCase().includes(search));
    });

    return { items: filtered.map((shipment) => this.serializeShipment(shipment)) };
  }


  async createShippingRate(input: CreateShippingRateDto) {
    const zone = await this.prisma.shippingZone.findUnique({ where: { id: input.zoneId } });
    if (!zone) {
      throw new NotFoundException("Shipping zone not found");
    }

    const created = await this.prisma.shippingRate.create({
      data: {
        zoneId: input.zoneId,
        serviceLevel: input.serviceLevel,
        packageType: input.packageType,
        pricingModel: input.pricingModel,
        weightFromOz: new Prisma.Decimal(input.weightFromOz),
        weightToOz: input.weightToOz != null ? new Prisma.Decimal(input.weightToOz) : null,
        baseRate: new Prisma.Decimal(input.baseRate),
        perItemRate: input.perItemRate != null ? new Prisma.Decimal(input.perItemRate) : null,
        perPoundRate: input.perPoundRate != null ? new Prisma.Decimal(input.perPoundRate) : null,
        handlingFee: input.handlingFee != null ? new Prisma.Decimal(input.handlingFee) : null,
        fuelSurcharge: input.fuelSurcharge != null ? new Prisma.Decimal(input.fuelSurcharge) : null,
        currency: input.currency,
        isActive: input.isActive
      },
      include: {
        zone: true
      }
    });

    return this.serializeShippingRate(created);
  }

  async updateShippingRate(id: string, input: UpdateShippingRateDto) {
    const existing = await this.prisma.shippingRate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Shipping rate not found");
    }

    const updated = await this.prisma.shippingRate.update({
      where: { id },
      data: {
        ...(input.zoneId !== undefined ? { zoneId: input.zoneId } : {}),
        ...(input.serviceLevel !== undefined ? { serviceLevel: input.serviceLevel } : {}),
        ...(input.packageType !== undefined ? { packageType: input.packageType } : {}),
        ...(input.pricingModel !== undefined ? { pricingModel: input.pricingModel } : {}),
        ...(input.weightFromOz !== undefined ? { weightFromOz: new Prisma.Decimal(input.weightFromOz) } : {}),
        ...(input.weightToOz !== undefined
          ? { weightToOz: input.weightToOz != null ? new Prisma.Decimal(input.weightToOz) : null }
          : {}),
        ...(input.baseRate !== undefined ? { baseRate: new Prisma.Decimal(input.baseRate) } : {}),
        ...(input.perItemRate !== undefined
          ? { perItemRate: input.perItemRate != null ? new Prisma.Decimal(input.perItemRate) : null }
          : {}),
        ...(input.perPoundRate !== undefined
          ? { perPoundRate: input.perPoundRate != null ? new Prisma.Decimal(input.perPoundRate) : null }
          : {}),
        ...(input.handlingFee !== undefined
          ? { handlingFee: input.handlingFee != null ? new Prisma.Decimal(input.handlingFee) : null }
          : {}),
        ...(input.fuelSurcharge !== undefined
          ? { fuelSurcharge: input.fuelSurcharge != null ? new Prisma.Decimal(input.fuelSurcharge) : null }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      },
      include: {
        zone: true
      }
    });

    return this.serializeShippingRate(updated);
  }

  async deleteShippingRate(id: string) {
    await this.prisma.shippingRate.delete({ where: { id } });
    return { ok: true };
  }

  async getOrderShippingPlanner(orderId: string, authUser: AuthUser) {
    const order = await this.requireAccessibleOrderForShipping(orderId, authUser);
    const shipments = await this.prisma.shippingShipment.findMany({
      where: { orderId },
      include: {
        recipient: true,
        items: {
          orderBy: [{ createdAt: "asc" }]
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });

    const allocatedByOrderItemId = this.buildAllocatedQuantityMap(shipments as any[]);
    const includedShipmentQuantityByOrderItemId = this.getIncludedShipmentQuantityByOrderItemId(shipments as any[]);

    return {
      order: {
        id: order.id,
        userId: order.userId,
        name: order.name,
        email: order.email,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        totalPrice: this.decimalToNumber(order.totalPrice),
        createdAt: order.createdAt.toISOString()
      },
      items: order.items.map((item: any) => {
        const allocated = allocatedByOrderItemId.get(item.id) ?? 0;
        const weightOz = this.decimalToNumber(item.product.weightOz) ?? 0;
        const inventory = this.getInventorySnapshot(item);
        const includedShipmentQuantity = includedShipmentQuantityByOrderItemId.get(item.id) ?? 0;
        const pendingWarehouseQuantity = Math.max(0, item.quantity - includedShipmentQuantity - inventory.receivedQuantity);
        const remainingQuantity =
          order.paymentStatus === "PAID"
            ? inventory.availableQuantity
            : Math.max(0, item.quantity - allocated);

        return {
          orderItemId: item.id,
          productId: item.productId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          allocatedQuantity: allocated,
          remainingQuantity,
          availableInventoryQuantity: inventory.availableQuantity,
          receivedInventoryQuantity: inventory.receivedQuantity,
          pendingWarehouseQuantity,
          inventoryStatus: item.inventoryStatus,
          imageUrl: item.imageUrl,
          weightOz,
          shipping: this.serializeProductShipping(item.product)
        };
      }),
      shipments: shipments.map((shipment) => this.serializeShipment(shipment))
    };
  }

  async estimateOrderShipment(input: EstimateOrderShipmentDto, authUser: AuthUser) {
    const order = await this.requireAccessibleOrderForShipping(input.orderId, authUser);
    const shipments = await this.prisma.shippingShipment.findMany({
      where: {
        orderId: input.orderId,
        status: {
          not: "CANCELLED"
        }
      },
      include: {
        items: true
      }
    });

    const recipient = input.recipientId
      ? await this.resolveShipmentRecipient(input.recipientId, order.userId ?? null, authUser)
      : null;

    const recipientName = recipient ? this.buildRecipientName(recipient) : input.recipientName ?? null;
    const recipientEmail = recipient ? recipient.email : input.recipientEmail ?? null;
    const recipientPhone = recipient ? recipient.phone : input.recipientPhone ?? null;
    const destinationCountryCode = recipient ? recipient.countryCode : input.destinationCountryCode;
    const destinationCountryName =
      recipient ? recipient.countryName : input.destinationCountryName ?? input.destinationCountryCode;
    const addressLine1 = recipient ? recipient.addressLine1 : input.addressLine1 ?? null;
    const addressLine2 = recipient ? recipient.addressLine2 : input.addressLine2 ?? null;
    const city = recipient ? recipient.city : input.city ?? null;
    const state = recipient ? recipient.state : input.state ?? null;
    const postalCode = recipient ? recipient.postalCode : input.postalCode ?? null;

    const allocatedByOrderItemId = this.buildAllocatedQuantityMap(shipments);
    const zone = await this.resolveZoneForCountry(destinationCountryCode);

    const requestedItems = input.items
      .map((item) => ({
        ...item,
        quantity: Math.max(0, item.quantity)
      }))
      .filter((item) => item.quantity > 0);

    if (!requestedItems.length) {
      throw new BadRequestException("Select at least one shipment item");
    }

    const orderItemsById = new Map<string, any>(order.items.map((item: any) => [item.id, item] as const));
    const issues: string[] = [];
    const lines: ShipmentDraftLine[] = [];

    if (!addressLine1 || !city || !postalCode) {
      issues.push("A complete recipient shipping address is required");
    }

    for (const requested of requestedItems) {
      const orderItem = orderItemsById.get(requested.orderItemId);

      if (!orderItem) {
        issues.push(`Order item ${requested.orderItemId} was not found`);
        continue;
      }

      const allocated = allocatedByOrderItemId.get(orderItem.id) ?? 0;
      const inventory = this.getInventorySnapshot(orderItem);
      const remainingQuantity =
        order.paymentStatus === "PAID"
          ? inventory.availableQuantity
          : Math.max(0, orderItem.quantity - allocated);

      if (requested.quantity > remainingQuantity) {
        issues.push(
          `${orderItem.productName}: only ${remainingQuantity} unit(s) remain available for shipment`
        );
        continue;
      }

      const eligibilityIssue = this.validateProductDestination({
        product: orderItem.product,
        destinationCountryCode,
        recipientEmail,
        recipientPhone
      });

      if (eligibilityIssue) {
        issues.push(`${orderItem.productName}: ${eligibilityIssue}`);
        continue;
      }

      const unitWeightOz = this.decimalToNumber(orderItem.product.weightOz) ?? 0;
      const lineWeightOz = unitWeightOz * requested.quantity;
      const packageType =
        orderItem.product.shippingProfile?.packageType ??
        (orderItem.itemType === "SWAG_PACK" ? "PACK" : "BULK_ITEM");
      const maxUnitsPerPackage = orderItem.product.shippingProfile?.maxUnitsPerPackage ?? null;
      const packageCount = this.resolvePackageCount(requested.quantity, maxUnitsPerPackage);

      lines.push({
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        productCatalogVariantId: orderItem.productCatalogVariantId,
        productName: orderItem.productName,
        variantName: orderItem.variantName,
        quantity: requested.quantity,
        unitWeightOz,
        lineWeightOz,
        packageType,
        shippingProfileName: orderItem.product.shippingProfile?.name ?? null,
        packageCount
      });
    }

    const grouped = new Map<string, ShipmentDraftLine[]>();

    for (const line of lines) {
      const key = line.packageType;
      const current = grouped.get(key) ?? [];
      current.push(line);
      grouped.set(key, current);
    }

    const rateBreakdown = Array.from(grouped.entries()).map(([packageType, groupLines]) => {
      const totalWeightOz = groupLines.reduce((sum, line) => sum + line.lineWeightOz, 0);
      const rate = zone.rates.find((candidate) => {
        const weightFrom = this.decimalToNumber(candidate.weightFromOz) ?? 0;
        const weightTo = this.decimalToNumber(candidate.weightToOz);

        if (candidate.packageType !== packageType) {
          return false;
        }

        if (totalWeightOz < weightFrom) {
          return false;
        }

        if (weightTo != null && totalWeightOz > weightTo) {
          return false;
        }

        return true;
      });

      if (!rate) {
        issues.push(
          `No ${input.serviceLevel.toLowerCase()} rate matches ${packageType.toLowerCase()} for ${zone.name}`
        );
        return null;
      }

      return this.calculateRateBreakdown({
        packageType: packageType as "BULK_ITEM" | "PACK" | "MAILER_PACK",
        lines: groupLines,
        rate
      });
    });

    const validRateBreakdown = rateBreakdown.filter((item): item is NonNullable<typeof item> => item !== null);
    const subtotal = validRateBreakdown.reduce((sum, item) => sum + item.subtotal, 0);
    const fuelSurchargeTotal = validRateBreakdown.reduce((sum, item) => sum + item.fuelSurchargeTotal, 0);
    const handlingFeeTotal = validRateBreakdown.reduce((sum, item) => sum + item.handlingFeeTotal, 0);
    const totalCost = subtotal + fuelSurchargeTotal + handlingFeeTotal;
    const totalWeightOz = lines.reduce((sum, line) => sum + line.lineWeightOz, 0);
    const packageCount = validRateBreakdown.reduce((sum, item) => sum + item.packageCount, 0);

    return {
      orderId: input.orderId,
      recipientId: recipient?.id ?? null,
      recipient: recipient ? this.serializeRecipient(recipient) : null,
      destinationCountryCode,
      destinationCountryName: destinationCountryName ?? zone.countries[0]?.countryName ?? destinationCountryCode,
      recipientName,
      recipientEmail,
      recipientPhone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      zone: {
        id: zone.id,
        code: zone.code,
        name: zone.name,
        isDomestic: zone.isDomestic
      },
      serviceLevel: input.serviceLevel,
      eligible: issues.length === 0,
      issues,
      currency: validRateBreakdown[0]?.currency ?? "USD",
      isInternational: !zone.isDomestic,
      packageCount,
      totalWeightOz,
      totalWeightLb: Number((totalWeightOz / 16).toFixed(2)),
      subtotal,
      fuelSurchargeTotal,
      handlingFeeTotal,
      totalCost,
      lines,
      rateBreakdown: validRateBreakdown
    };
  }

  async createShipment(input: CreateShippingShipmentDto, authUser: AuthUser) {
    const order = await this.requireAccessibleOrderForShipping(input.orderId, authUser);
    const estimate = await this.estimateOrderShipment(input, authUser);

    if (estimate.issues.length > 0 || !estimate.lines.length) {
      throw new BadRequestException(estimate.issues[0] ?? "This shipment cannot be created");
    }

    const billingType = order.paymentStatus === "PAID" ? "SEPARATE_PAYMENT" : "INCLUDED_IN_ORDER";
    const paymentStatus = billingType === "INCLUDED_IN_ORDER" && order.paymentStatus === "PAID" ? "PAID" : "UNPAID";
    const paidAt = paymentStatus === "PAID" ? new Date() : null;

    const created = await this.prisma.shippingShipment.create({
      data: {
        orderId: input.orderId,
        createdById: authUser.sub,
        recipientId: estimate.recipientId,
        destinationCountryCode: estimate.destinationCountryCode,
        destinationCountryName: estimate.destinationCountryName,
        recipientName: this.toNullableString(estimate.recipientName),
        recipientEmail: this.toNullableString(estimate.recipientEmail),
        recipientPhone: this.toNullableString(estimate.recipientPhone),
        addressLine1: this.toNullableString(estimate.addressLine1),
        addressLine2: this.toNullableString(estimate.addressLine2),
        city: this.toNullableString(estimate.city),
        state: this.toNullableString(estimate.state),
        postalCode: this.toNullableString(estimate.postalCode),
        serviceLevel: input.serviceLevel,
        status: "ESTIMATED",
        billingType,
        paymentStatus,
        paidAt,
        currency: estimate.currency,
        totalWeightOz: new Prisma.Decimal(estimate.totalWeightOz),
        subtotal: new Prisma.Decimal(estimate.subtotal),
        fuelSurchargeTotal: new Prisma.Decimal(estimate.fuelSurchargeTotal),
        handlingFeeTotal: new Prisma.Decimal(estimate.handlingFeeTotal),
        totalCost: new Prisma.Decimal(estimate.totalCost),
        packageCount: estimate.packageCount,
        isInternational: estimate.isInternational,
        notes: this.toNullableString(input.notes),
        estimateBreakdown: estimate.rateBreakdown as Prisma.JsonArray,
        items: {
          create: estimate.lines.map((line) => ({
            orderItemId: line.orderItemId,
            productId: line.productId,
            productCatalogVariantId: line.productCatalogVariantId,
            productName: line.productName,
            variantName: line.variantName,
            quantity: line.quantity,
            unitWeightOz: new Prisma.Decimal(line.unitWeightOz),
            lineWeightOz: new Prisma.Decimal(line.lineWeightOz),
            packageType: line.packageType,
            shippingProfileName: line.shippingProfileName
          }))
        }
      },
      include: {
        recipient: true,
        order: {
          select: {
            id: true,
            userId: true,
            assignedEmployeeId: true,
            name: true,
            email: true
          }
        },
        items: true
      }
    });

    return this.serializeShipment(created);
  }

  async createShipmentPayment(id: string, input: CreateShipmentPaymentDto, authUser: AuthUser) {
    if (!hasPermission(authUser, "shipping.shipments.self.write")) {
      throw new ForbiddenException("Only customers can pay for shipment charges");
    }

    const existingShipment = await this.prisma.shippingShipment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            assignedEmployeeId: true,
            email: true,
            phone: true,
            currency: true
          }
        },
        recipient: true,
        items: {
          orderBy: [{ createdAt: "asc" }]
        }
      }
    });

    if (!existingShipment) {
      throw new NotFoundException("Shipment not found");
    }

    this.assertOrderAccess(existingShipment.order, authUser);

    if (existingShipment.billingType !== "SEPARATE_PAYMENT") {
      throw new BadRequestException("This shipment does not require a separate payment");
    }

    if (existingShipment.paymentStatus === "PAID") {
      throw new BadRequestException("This shipment has already been paid");
    }

    const relatedOrderItems = await this.prisma.catalogOrderItem.findMany({
      where: {
        id: {
          in: existingShipment.items.map((item) => item.orderItemId)
        }
      },
      include: {
        inventoryLedgerEntries: true
      }
    });

    const orderItemsById = new Map(relatedOrderItems.map((item) => [item.id, item]));

    for (const shipmentItem of existingShipment.items) {
      const orderItem = orderItemsById.get(shipmentItem.orderItemId);
      if (!orderItem) {
        throw new NotFoundException(`Order item ${shipmentItem.orderItemId} not found`);
      }

      const availableQuantity = this.getInventorySnapshot(orderItem as any).availableQuantity;
      if (shipmentItem.quantity > availableQuantity) {
        throw new BadRequestException(
          `${shipmentItem.productName}: only ${availableQuantity} unit(s) are still available to fulfill this shipment`
        );
      }
    }

    const payment = await this.createSquarePaymentForShipment(existingShipment, input.sourceId);
    const paymentStatus = this.mapSquarePaymentStatus(payment?.status);
    const paidAt = paymentStatus === "PAID" ? new Date() : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shippingShipment.update({
        where: { id: existingShipment.id },
        data: {
          paymentStatus,
          squarePaymentId: payment?.id ?? null,
          paidAt,
          inventoryCommittedAt: paymentStatus === "PAID" ? new Date() : null
        },
        include: {
          recipient: true,
          order: {
            select: {
              id: true,
              userId: true,
              assignedEmployeeId: true,
              name: true,
              email: true
            }
          },
          items: {
            orderBy: [{ createdAt: "asc" }]
          }
        }
      });

      if (paymentStatus === "PAID") {
        for (const shipmentItem of existingShipment.items) {
          await tx.inventoryLedgerEntry.create({
            data: {
              orderId: existingShipment.orderId,
              orderItemId: shipmentItem.orderItemId,
              shipmentId: existingShipment.id,
              entryType: "SHIPMENT_ALLOCATION",
              quantity: shipmentItem.quantity,
              notes: `Shipment payment captured for ${existingShipment.id}`,
              performedById: authUser.sub
            }
          });
        }
      }

      return shipment;
    });

    return this.serializeShipment(updated);
  }

  async getShipmentById(id: string, authUser: AuthUser) {
    const shipment = await this.prisma.shippingShipment.findUnique({
      where: { id },
      include: {
        recipient: true,
        order: {
          select: {
            id: true,
            userId: true,
            assignedEmployeeId: true,
            name: true,
            email: true
          }
        },
        items: {
          orderBy: [{ createdAt: "asc" }]
        }
      }
    });

    if (!shipment) {
      throw new NotFoundException("Shipment not found");
    }

    await this.ensureOrderAccess(shipment.orderId, authUser);
    return this.serializeShipment(shipment);
  }

  async updateShipmentStatus(id: string, input: UpdateShippingShipmentStatusDto, authUser: AuthUser) {
    const existingShipment = await this.prisma.shippingShipment.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ createdAt: "asc" }]
        },
        order: {
          select: {
            id: true,
            userId: true,
            assignedEmployeeId: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!existingShipment) {
      throw new NotFoundException("Shipment not found");
    }

    await this.ensureOrderAccess(existingShipment.orderId, authUser);

    const shouldReleaseInventory =
      input.status === "CANCELLED" &&
      existingShipment.status !== "CANCELLED" &&
      existingShipment.billingType === "SEPARATE_PAYMENT" &&
      existingShipment.paymentStatus === "PAID" &&
      existingShipment.inventoryCommittedAt;

    const shipment = await this.prisma.$transaction(async (tx) => {
      if (shouldReleaseInventory) {
        for (const shipmentItem of existingShipment.items) {
          await tx.inventoryLedgerEntry.create({
            data: {
              orderId: existingShipment.orderId,
              orderItemId: shipmentItem.orderItemId,
              shipmentId: existingShipment.id,
              entryType: "SHIPMENT_ALLOCATION_RELEASE",
              quantity: shipmentItem.quantity,
              notes: `Shipment ${existingShipment.id} cancelled`,
              performedById: authUser.sub
            }
          });
        }
      }

      return tx.shippingShipment.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.status === "ON_THE_WAY" ? { shippedAt: new Date() } : {}),
          ...(input.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
          ...(shouldReleaseInventory ? { inventoryCommittedAt: null } : {})
        },
        include: {
          recipient: true,
          order: {
            select: {
              id: true,
              userId: true,
              assignedEmployeeId: true,
              name: true,
              email: true
            }
          },
          items: {
            orderBy: [{ createdAt: "asc" }]
          }
        }
      });
    });

    return this.serializeShipment(shipment);
  }

  async updateShipmentTracking(id: string, input: UpdateShipmentTrackingDto, authUser: AuthUser) {
    const existingShipment = await this.prisma.shippingShipment.findUnique({
      where: { id },
      select: { id: true, orderId: true }
    });

    if (!existingShipment) {
      throw new NotFoundException("Shipment not found");
    }

    await this.ensureOrderAccess(existingShipment.orderId, authUser);

    const shipment = await this.prisma.shippingShipment.update({
      where: { id },
      data: {
        ...(input.carrier !== undefined ? { carrier: this.toNullableString(input.carrier) } : {}),
        ...(input.trackingNumber !== undefined ? { trackingNumber: this.toNullableString(input.trackingNumber) } : {}),
        ...(input.trackingUrl !== undefined ? { trackingUrl: this.toNullableString(input.trackingUrl) } : {}),
        ...(input.statusNotes !== undefined ? { statusNotes: this.toNullableString(input.statusNotes) } : {}),
        ...(input.scheduledFor !== undefined ? { scheduledFor: input.scheduledFor ?? null } : {}),
        ...(input.shippedAt !== undefined ? { shippedAt: input.shippedAt ?? null } : {}),
        ...(input.deliveredAt !== undefined ? { deliveredAt: input.deliveredAt ?? null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      },
      include: {
        recipient: true,
        order: {
          select: {
            id: true,
            userId: true,
            assignedEmployeeId: true,
            name: true,
            email: true
          }
        },
        items: {
          orderBy: [{ createdAt: "asc" }]
        }
      }
    });

    return this.serializeShipment(shipment);
  }


  private async buildAccessibleShipmentWhere(query: ListShipmentsQueryDto, authUser: AuthUser) {
    const baseWhere: Prisma.ShippingShipmentWhereInput = {
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.recipientId ? { recipientId: query.recipientId } : {})
    };

    if (hasPermission(authUser, "shipping.shipments.read")) {
      return query.userId
        ? {
            ...baseWhere,
            order: {
              userId: query.userId
            }
          }
        : baseWhere;
    }

    if (hasPermission(authUser, "shipping.shipments.assigned.read")) {
      return {
        ...baseWhere,
        order: {
          assignedEmployeeId: authUser.sub,
          ...(query.userId ? { userId: query.userId } : {})
        }
      };
    }

    if (hasPermission(authUser, "shipping.shipments.self.read")) {
      return {
        ...baseWhere,
        order: {
          userId: authUser.sub
        }
      };
    }

    throw new ForbiddenException("You do not have access to shipments");
  }

  private async requireAccessibleOrderForShipping(orderId: string, authUser: AuthUser) {
    const order = await this.prisma.catalogOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            inventoryLedgerEntries: {
              orderBy: [{ createdAt: "desc" }]
            },
            product: {
              include: {
                shippingProfile: {
                  include: {
                    countryRules: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    this.assertOrderAccess(order, authUser);
    return order;
  }

  private async ensureOrderAccess(orderId: string, authUser: AuthUser) {
    const order = await this.prisma.catalogOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        assignedEmployeeId: true
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    this.assertOrderAccess(order, authUser);
    return order;
  }

  private assertOrderAccess(
    order: {
      id: string;
      userId?: string | null;
      assignedEmployeeId?: string | null;
    },
    authUser: AuthUser
  ) {
    if (
      hasPermission(authUser, "catalog.orders.read") ||
      hasPermission(authUser, "shipping.shipments.read") ||
      hasPermission(authUser, "shipping.shipments.write") ||
      hasPermission(authUser, "shipping.estimate")
    ) {
      return;
    }

    if (
      (hasPermission(authUser, "orders.assigned.read") ||
        hasPermission(authUser, "shipping.shipments.assigned.read") ||
        hasPermission(authUser, "shipping.shipments.assigned.write") ||
        hasPermission(authUser, "shipping.assigned.estimate")) &&
      order.assignedEmployeeId === authUser.sub
    ) {
      return;
    }

    if (
      (hasPermission(authUser, "orders.self.read") ||
        hasPermission(authUser, "shipping.shipments.self.read") ||
        hasPermission(authUser, "shipping.shipments.self.write") ||
        hasPermission(authUser, "shipping.self.estimate")) &&
      order.userId === authUser.sub
    ) {
      return;
    }

    throw new ForbiddenException("You do not have access to this order");
  }


  private getInventorySnapshot(item: any) {
    const ledgerEntries = item.inventoryLedgerEntries ?? [];
    let availableQuantity = 0;
    let receivedQuantity = 0;

    for (const entry of ledgerEntries) {
      const qty = Number(entry.quantity ?? 0);
      if (entry.entryType === "WAREHOUSE_RECEIPT" || entry.entryType === "MANUAL_ADJUSTMENT") {
        availableQuantity += qty;
        if (entry.entryType === "WAREHOUSE_RECEIPT" && qty > 0) {
          receivedQuantity += qty;
        }
      } else if (entry.entryType === "SHIPMENT_ALLOCATION") {
        availableQuantity -= qty;
      } else if (entry.entryType === "SHIPMENT_ALLOCATION_RELEASE") {
        availableQuantity += qty;
      }
    }

    return {
      availableQuantity: Math.max(0, availableQuantity),
      receivedQuantity: Math.max(0, receivedQuantity)
    };
  }

  private getIncludedShipmentQuantityByOrderItemId(shipments: any[]) {
    const includedQuantity = new Map<string, number>();

    for (const shipment of shipments ?? []) {
      if (shipment.status === "CANCELLED" || shipment.billingType !== "INCLUDED_IN_ORDER") {
        continue;
      }

      for (const item of shipment.items ?? []) {
        includedQuantity.set(
          item.orderItemId,
          (includedQuantity.get(item.orderItemId) ?? 0) + item.quantity
        );
      }
    }

    return includedQuantity;
  }

  private buildAllocatedQuantityMap(
    shipments: Array<{
      status?: string;
      billingType?: string | null;
      paymentStatus?: string | null;
      items: Array<{
        orderItemId: string;
        quantity: number;
      }>;
    }>
  ) {
    const allocatedByOrderItemId = new Map<string, number>();

    for (const shipment of shipments) {
      if (shipment.status === "CANCELLED") {
        continue;
      }

      if (shipment.billingType === "SEPARATE_PAYMENT" && shipment.paymentStatus !== "PAID") {
        continue;
      }

      for (const item of shipment.items) {
        allocatedByOrderItemId.set(
          item.orderItemId,
          (allocatedByOrderItemId.get(item.orderItemId) ?? 0) + item.quantity
        );
      }
    }

    return allocatedByOrderItemId;
  }

  private async resolveZoneForCountry(countryCode: string) {
    const zone = await this.prisma.shippingZone.findFirst({
      where: {
        isActive: true,
        countries: {
          some: {
            countryCode
          }
        }
      },
      include: {
        countries: true,
        rates: {
          where: {
            isActive: true
          },
          orderBy: [{ weightFromOz: "desc" }]
        }
      }
    });

    if (!zone) {
      throw new BadRequestException(`No shipping zone is configured for ${countryCode}`);
    }

    return zone;
  }

  private validateProductDestination(args: {
    product: {
      shippingProfile: any | null;
    };
    destinationCountryCode: string;
    recipientEmail: string | null;
    recipientPhone: string | null;
  }) {
    const profile = args.product.shippingProfile;
    const isInternational = args.destinationCountryCode !== "US";

    if (!profile) {
      return "missing shipping profile";
    }

    if (profile.shippingScope === "DOMESTIC_ONLY" && isInternational) {
      return "US shipping only";
    }

    if (profile.shippingScope === "INTERNATIONAL_REVIEW_REQUIRED" && isInternational) {
      return "international shipping requires manual review";
    }

    const allowRules = (profile.countryRules ?? []).filter((rule: any) => rule.ruleType === "ALLOW");
    const blockRules = (profile.countryRules ?? []).filter((rule: any) => rule.ruleType === "BLOCK");

    if (allowRules.length && !allowRules.some((rule: any) => rule.countryCode === args.destinationCountryCode)) {
      return "cannot ship to the selected country";
    }

    if (blockRules.some((rule: any) => rule.countryCode === args.destinationCountryCode)) {
      return "cannot ship to the selected country";
    }

    if (isInternational) {
      if (
        profile.isHazmat ||
        profile.containsBattery ||
        profile.containsFood ||
        profile.containsCosmetic ||
        profile.containsLiquid ||
        profile.containsWood
      ) {
        return "internationally restricted product";
      }

      if (profile.requiresEmailForInternational && !args.recipientEmail?.trim()) {
        return "recipient email is required for international shipping";
      }

      if (profile.requiresPhoneForInternational && !args.recipientPhone?.trim()) {
        return "recipient phone is required for international shipping";
      }
    }

    return null;
  }

  private calculateRateBreakdown(args: {
    packageType: "BULK_ITEM" | "PACK" | "MAILER_PACK";
    lines: ShipmentDraftLine[];
    rate: any;
  }) {
    const totalWeightOz = args.lines.reduce((sum, line) => sum + line.lineWeightOz, 0);
    const totalQuantity = args.lines.reduce((sum, line) => sum + line.quantity, 0);
    const packageCount = args.lines.reduce((sum, line) => sum + line.packageCount, 0);
    const baseRate = this.decimalToNumber(args.rate.baseRate) ?? 0;
    const perItemRate = this.decimalToNumber(args.rate.perItemRate) ?? 0;
    const perPoundRate = this.decimalToNumber(args.rate.perPoundRate) ?? 0;
    const handlingFee = this.decimalToNumber(args.rate.handlingFee) ?? 0;
    const fuelSurcharge = this.decimalToNumber(args.rate.fuelSurcharge) ?? 0;
    const totalWeightLb = totalWeightOz / 16;

    let subtotal = 0;
    let fuelSurchargeTotal = 0;
    let handlingFeeTotal = 0;

    if (args.rate.pricingModel === "FLAT_PER_PACKAGE") {
      subtotal = baseRate * Math.max(packageCount, 1) + perItemRate * totalQuantity;
      fuelSurchargeTotal = fuelSurcharge * Math.max(packageCount, 1);
      handlingFeeTotal = handlingFee * Math.max(packageCount, 1);
    } else if (args.rate.pricingModel === "FLAT_PER_SHIPMENT") {
      subtotal = baseRate + perItemRate * totalQuantity;
      fuelSurchargeTotal = fuelSurcharge;
      handlingFeeTotal = handlingFee;
    } else {
      subtotal = baseRate + perItemRate * totalQuantity + perPoundRate * totalWeightLb;
      fuelSurchargeTotal = fuelSurcharge;
      handlingFeeTotal = handlingFee;
    }

    return {
      packageType: args.packageType,
      pricingModel: args.rate.pricingModel,
      zoneId: args.rate.zoneId,
      serviceLevel: args.rate.serviceLevel,
      currency: args.rate.currency,
      packageCount,
      totalQuantity,
      totalWeightOz,
      totalWeightLb: Number(totalWeightLb.toFixed(2)),
      baseRate,
      perItemRate,
      perPoundRate,
      handlingFee,
      fuelSurcharge,
      subtotal: Number(subtotal.toFixed(2)),
      fuelSurchargeTotal: Number(fuelSurchargeTotal.toFixed(2)),
      handlingFeeTotal: Number(handlingFeeTotal.toFixed(2)),
      totalCost: Number((subtotal + fuelSurchargeTotal + handlingFeeTotal).toFixed(2)),
      lines: args.lines.map((line) => ({
        orderItemId: line.orderItemId,
        productName: line.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        unitWeightOz: line.unitWeightOz,
        lineWeightOz: line.lineWeightOz,
        packageCount: line.packageCount
      }))
    };
  }


  private mapSquarePaymentStatus(status?: string | null) {
    switch (status) {
      case "COMPLETED":
        return "PAID" as const;
      case "APPROVED":
      case "PENDING":
        return "PENDING" as const;
      case "CANCELED":
      case "FAILED":
        return "FAILED" as const;
      default:
        return "FAILED" as const;
    }
  }

  private getSquareApiBaseUrl() {
    return process.env.SQUARE_ENVIRONMENT === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";
  }

  private assertSquareConfig() {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN?.trim();
    const locationId = process.env.SQUARE_LOCATION_ID?.trim();

    if (!accessToken || !locationId) {
      throw new ServiceUnavailableException(
        "Square is not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID."
      );
    }

    return {
      accessToken,
      locationId,
      apiVersion: process.env.SQUARE_API_VERSION?.trim() || "2026-01-22"
    };
  }

  private async createSquarePaymentForShipment(
    shipment: {
      id: string;
      currency: string;
      totalCost: Prisma.Decimal | number | string;
      order: {
        email?: string | null;
      } | null;
    },
    sourceId: string
  ) {
    const square = this.assertSquareConfig();
    const amount = Math.round((this.decimalToNumber(shipment.totalCost) ?? 0) * 100);

    const response = await fetch(`${this.getSquareApiBaseUrl()}/v2/payments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${square.accessToken}`,
        "content-type": "application/json",
        "square-version": square.apiVersion
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: randomUUID(),
        location_id: square.locationId,
        reference_id: shipment.id.slice(0, 40),
        buyer_email_address: shipment.order?.email ?? undefined,
        note: `Shipment charge ${shipment.id}`,
        autocomplete: true,
        amount_money: {
          amount,
          currency: shipment.currency
        }
      })
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          payment?: Record<string, any>;
          errors?: Array<{ detail?: string; code?: string }>;
        }
      | null;

    if (!response.ok || !payload?.payment) {
      const message =
        payload?.errors?.map((error) => error.detail || error.code).filter(Boolean).join(", ") ||
        "Square payment failed";
      throw new BadRequestException(message);
    }

    return payload.payment;
  }

  private serializeShippingProfile(profile: any) {
    const countryRules = Array.isArray(profile.countryRules) ? profile.countryRules : [];

    return {
      id: profile.id,
      slug: profile.slug,
      name: profile.name,
      packageType: profile.packageType,
      shippingScope: profile.shippingScope,
      isHazmat: Boolean(profile.isHazmat),
      containsBattery: Boolean(profile.containsBattery),
      containsFood: Boolean(profile.containsFood),
      containsCosmetic: Boolean(profile.containsCosmetic),
      containsLiquid: Boolean(profile.containsLiquid),
      containsWood: Boolean(profile.containsWood),
      isOversized: Boolean(profile.isOversized),
      requiresPhoneForInternational: Boolean(profile.requiresPhoneForInternational),
      requiresEmailForInternational: Boolean(profile.requiresEmailForInternational),
      maxUnitsPerPackage: profile.maxUnitsPerPackage ?? null,
      allowCountries: countryRules
        .filter((rule: any) => rule.ruleType === "ALLOW")
        .map((rule: any) => ({ code: rule.countryCode, name: rule.countryName })),
      blockCountries: countryRules
        .filter((rule: any) => rule.ruleType === "BLOCK")
        .map((rule: any) => ({ code: rule.countryCode, name: rule.countryName })),
      productCount: profile._count?.products ?? 0,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString()
    };
  }

  private serializeShippingZone(zone: any) {
    return {
      id: zone.id,
      code: zone.code,
      name: zone.name,
      description: zone.description,
      isDomestic: Boolean(zone.isDomestic),
      isActive: Boolean(zone.isActive),
      countries: (zone.countries ?? []).map((country: any) => ({
        code: country.countryCode,
        name: country.countryName
      })),
      rateCount: zone._count?.rates ?? 0,
      createdAt: zone.createdAt.toISOString(),
      updatedAt: zone.updatedAt.toISOString()
    };
  }

  private serializeShippingRate(rate: any) {
    return {
      id: rate.id,
      zoneId: rate.zoneId,
      zone: rate.zone
        ? {
            id: rate.zone.id,
            code: rate.zone.code,
            name: rate.zone.name
          }
        : null,
      serviceLevel: rate.serviceLevel,
      packageType: rate.packageType,
      pricingModel: rate.pricingModel,
      weightFromOz: this.decimalToNumber(rate.weightFromOz),
      weightToOz: this.decimalToNumber(rate.weightToOz),
      baseRate: this.decimalToNumber(rate.baseRate),
      perItemRate: this.decimalToNumber(rate.perItemRate),
      perPoundRate: this.decimalToNumber(rate.perPoundRate),
      handlingFee: this.decimalToNumber(rate.handlingFee),
      fuelSurcharge: this.decimalToNumber(rate.fuelSurcharge),
      currency: rate.currency,
      isActive: Boolean(rate.isActive),
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString()
    };
  }

  private async resolveShipmentRecipient(
    recipientId: string,
    orderUserId: string | null,
    authUser: AuthUser
  ) {
    if (!orderUserId) {
      throw new BadRequestException("This order does not support saved recipients");
    }

    const recipient = await this.prisma.recipient.findUnique({
      where: { id: recipientId }
    });

    if (!recipient) {
      throw new NotFoundException("Recipient not found");
    }

    if (recipient.userId !== orderUserId) {
      throw new ForbiddenException("You do not have access to this recipient");
    }

    if (hasPermission(authUser, "recipients.self.read") && recipient.userId !== authUser.sub) {
      throw new ForbiddenException("You do not have access to this recipient");
    }

    return recipient;
  }

  private buildRecipientName(recipient: {
    firstName: string;
    lastName: string;
  }) {
    return [recipient.firstName, recipient.lastName].filter(Boolean).join(" ").trim();
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

  private serializeShipment(shipment: any) {
    return {
      id: shipment.id,
      orderId: shipment.orderId,
      order: shipment.order
        ? {
            id: shipment.order.id,
            userId: shipment.order.userId ?? null,
            assignedEmployeeId: shipment.order.assignedEmployeeId ?? null,
            name: shipment.order.name ?? null,
            email: shipment.order.email ?? null
          }
        : null,
      recipientId: shipment.recipientId ?? null,
      recipient: shipment.recipient ? this.serializeRecipient(shipment.recipient) : null,
      destinationCountryCode: shipment.destinationCountryCode,
      destinationCountryName: shipment.destinationCountryName,
      recipientName: shipment.recipientName,
      recipientEmail: shipment.recipientEmail,
      recipientPhone: shipment.recipientPhone,
      addressLine1: shipment.addressLine1,
      addressLine2: shipment.addressLine2,
      city: shipment.city,
      state: shipment.state,
      postalCode: shipment.postalCode,
      serviceLevel: shipment.serviceLevel,
      status: shipment.status,
      billingType: shipment.billingType ?? "INCLUDED_IN_ORDER",
      paymentStatus: shipment.paymentStatus ?? "UNPAID",
      paidAt: shipment.paidAt ? shipment.paidAt.toISOString() : null,
      carrier: shipment.carrier ?? null,
      trackingNumber: shipment.trackingNumber ?? null,
      trackingUrl: shipment.trackingUrl ?? null,
      statusNotes: shipment.statusNotes ?? null,
      scheduledFor: shipment.scheduledFor ? shipment.scheduledFor.toISOString() : null,
      shippedAt: shipment.shippedAt ? shipment.shippedAt.toISOString() : null,
      deliveredAt: shipment.deliveredAt ? shipment.deliveredAt.toISOString() : null,
      currency: shipment.currency,
      totalWeightOz: this.decimalToNumber(shipment.totalWeightOz),
      totalWeightLb: Number(((this.decimalToNumber(shipment.totalWeightOz) ?? 0) / 16).toFixed(2)),
      subtotal: this.decimalToNumber(shipment.subtotal),
      fuelSurchargeTotal: this.decimalToNumber(shipment.fuelSurchargeTotal),
      handlingFeeTotal: this.decimalToNumber(shipment.handlingFeeTotal),
      totalCost: this.decimalToNumber(shipment.totalCost),
      packageCount: shipment.packageCount,
      isInternational: Boolean(shipment.isInternational),
      notes: shipment.notes,
      estimateBreakdown: shipment.estimateBreakdown ?? [],
      items: (shipment.items ?? []).map((item: any) => ({
        id: item.id,
        orderItemId: item.orderItemId,
        productId: item.productId,
        productCatalogVariantId: item.productCatalogVariantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitWeightOz: this.decimalToNumber(item.unitWeightOz),
        lineWeightOz: this.decimalToNumber(item.lineWeightOz),
        packageType: item.packageType,
        shippingProfileName: item.shippingProfileName
      })),
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString()
    };
  }

  private serializeProductShipping(product: any) {
    const profile = product.shippingProfile ?? null;

    return {
      shippingProfileId: profile?.id ?? null,
      profileName: profile?.name ?? null,
      packageType: profile?.packageType ?? null,
      shippingScope: profile?.shippingScope ?? null,
      weightOz: this.decimalToNumber(product.weightOz),
      dimensions: {
        lengthIn: this.decimalToNumber(product.lengthIn),
        widthIn: this.decimalToNumber(product.widthIn),
        heightIn: this.decimalToNumber(product.heightIn)
      },
      badges: [
        ...(profile?.shippingScope === "DOMESTIC_ONLY" ? ["US Shipping Only"] : []),
        ...(profile?.shippingScope === "INTERNATIONAL_REVIEW_REQUIRED"
          ? ["International Review Required"]
          : []),
        ...(profile?.containsBattery ? ["Battery Restricted"] : []),
        ...(profile?.containsFood ? ["Food Restricted"] : []),
        ...(profile?.containsCosmetic ? ["Cosmetic Restricted"] : []),
        ...(profile?.containsLiquid ? ["Liquid Restricted"] : []),
        ...(profile?.containsWood ? ["Wood Restricted"] : []),
        ...(profile?.isHazmat ? ["Hazmat"] : []),
        ...(profile?.isOversized ? ["Oversized"] : [])
      ]
    };
  }

  private resolvePackageCount(quantity: number, maxUnitsPerPackage: number | null | undefined) {
    if (!maxUnitsPerPackage || maxUnitsPerPackage <= 0) {
      return 1;
    }

    return Math.max(1, Math.ceil(quantity / maxUnitsPerPackage));
  }

  private decimalToNumber(
    value: Prisma.Decimal | number | string | null | undefined
  ): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return Number(value.toString());
  }

  private toNullableString(value: string | null | undefined) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private async ensureUniqueProfileSlug(name: string, excludeId?: string) {
    const base = slugify(name);

    if (!base) {
      throw new BadRequestException("Shipping profile name is invalid");
    }

    let slug = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.shippingProfile.findUnique({ where: { slug } });

      if (!existing || existing.id === excludeId) {
        return slug;
      }

      slug = `${base}-${counter}`;
      counter += 1;
    }
  }
}
