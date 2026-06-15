import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthUser } from "../common/guards/auth.guard";
import { hasAnyPermission, hasPermission } from "../common/utils/permissions";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AdjustInventoryDto,
  ListInventoryLedgerQueryDto,
  ListInventoryQueryDto,
  ReceiveInventoryDto
} from "./inventory.dto";

type AccessibleScope = "ALL" | "ASSIGNED" | "SELF";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listInventory(query: ListInventoryQueryDto, authUser: AuthUser) {
    const where = this.buildAccessibleOrderWhere(query, authUser);

    const orders = await this.prisma.catalogOrder.findMany({
      where: {
        ...where,
        paymentStatus: "PAID",
        status: {
          notIn: ["CANCELLED", "REJECTED"]
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            inventoryLedgerEntries: {
              orderBy: [{ createdAt: "desc" }]
            }
          }
        },
        shipments: {
          where: {
            status: {
              not: "CANCELLED"
            }
          },
          include: {
            items: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });

    const items = orders
      .flatMap((order) => {
        const includedShipmentQuantities = this.buildIncludedShipmentQuantityMap(order.shipments);

        return order.items
          .map((item) => {
            const availableQuantity = this.sumInventoryDelta(item.inventoryLedgerEntries);
            const receivedQuantity = item.inventoryLedgerEntries
              .filter((entry) => entry.entryType === "WAREHOUSE_RECEIPT")
              .reduce((sum, entry) => sum + entry.quantity, 0);
            const plannedStorageQuantity = Math.max(0, item.quantity - (includedShipmentQuantities.get(item.id) ?? 0));
            const pendingReceiptQuantity = Math.max(0, plannedStorageQuantity - receivedQuantity);

            if (availableQuantity <= 0 && pendingReceiptQuantity <= 0) {
              return null;
            }

            return {
              id: item.id,
              orderId: order.id,
              user: order.user
                ? {
                    id: order.user.id,
                    email: order.user.email,
                    firstName: order.user.firstName,
                    lastName: order.user.lastName
                  }
                : null,
              productName: item.productName,
              variantName: item.variantName,
              itemType: item.itemType,
              quantity: item.quantity,
              shippedQuantity: Math.max(0, plannedStorageQuantity - availableQuantity),
              storedQuantity: availableQuantity,
              pendingReceiptQuantity,
              storageCost: availableQuantity,
              currency: order.currency,
              imageUrl: item.mockupImageUrl ?? item.proofImageUrl ?? item.imageUrl ?? null,
              availableToShip: availableQuantity > 0,
              inventoryStatus: item.inventoryStatus,
              lastMovementAt: item.inventoryLedgerEntries[0]?.createdAt.toISOString() ?? item.updatedAt.toISOString(),
              createdAt: item.createdAt.toISOString(),
              updatedAt: item.updatedAt.toISOString()
            };
          })
          .filter(Boolean);
      })
      .filter(Boolean) as Array<{
      id: string;
      orderId: string;
      user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      } | null;
      productName: string;
      variantName: string | null;
      itemType: string;
      quantity: number;
      shippedQuantity: number;
      storedQuantity: number;
      pendingReceiptQuantity: number;
      storageCost: number;
      currency: string;
      imageUrl: string | null;
      availableToShip: boolean;
      inventoryStatus: string;
      lastMovementAt: string;
      createdAt: string;
      updatedAt: string;
    }>;

    const filtered = items.filter((item) => {
      const search = query.search?.trim().toLowerCase();
      if (!search) {
        return true;
      }

      return [
        item.orderId,
        item.productName,
        item.variantName ?? "",
        item.user?.email ?? "",
        item.user?.firstName ?? "",
        item.user?.lastName ?? ""
      ].some((value) => value.toLowerCase().includes(search));
    });

    const recentMovements = await this.listInventoryLedger(
      {
        orderId: query.orderId,
        userId: query.userId,
        search: query.search,
        limit: 15
      },
      authUser
    );

    return {
      items: filtered,
      summary: {
        totalStoredQuantity: filtered.reduce((sum, item) => sum + item.storedQuantity, 0),
        totalStorageCost: filtered.reduce((sum, item) => sum + item.storageCost, 0),
        orderCount: new Set(filtered.map((item) => item.orderId)).size,
        skuCount: filtered.length
      },
      recentMovements: recentMovements.items
    };
  }

  async listInventoryLedger(query: ListInventoryLedgerQueryDto, authUser: AuthUser) {
    const where = this.buildAccessibleOrderWhere(query, authUser);

    const entries = await this.prisma.inventoryLedgerEntry.findMany({
      where: {
        order: where
      },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            email: true,
            name: true
          }
        },
        orderItem: {
          select: {
            id: true,
            productName: true,
            variantName: true
          }
        },
        shipment: {
          select: {
            id: true,
            billingType: true,
            paymentStatus: true
          }
        },
        performedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: query.limit
    });

    const filtered = entries.filter((entry) => {
      const search = query.search?.trim().toLowerCase();
      if (!search) {
        return true;
      }

      return [
        entry.order.id,
        entry.orderItem.productName,
        entry.orderItem.variantName ?? "",
        entry.order.email,
        entry.order.name,
        entry.notes ?? "",
        entry.shipment?.id ?? ""
      ].some((value) => value.toLowerCase().includes(search));
    });

    return {
      items: filtered.map((entry) => ({
        id: entry.id,
        orderId: entry.orderId,
        orderItemId: entry.orderItemId,
        shipmentId: entry.shipmentId ?? null,
        type: entry.entryType,
        quantityDelta: entry.quantity,
        note: entry.notes ?? null,
        metadata: entry.metadata ?? null,
        order: {
          id: entry.order.id,
          userId: entry.order.userId ?? null,
          email: entry.order.email,
          name: entry.order.name
        },
        orderItem: {
          id: entry.orderItem.id,
          productName: entry.orderItem.productName,
          variantName: entry.orderItem.variantName ?? null
        },
        shipment: entry.shipment
          ? {
              id: entry.shipment.id,
              billingType: entry.shipment.billingType,
              paymentStatus: entry.shipment.paymentStatus
            }
          : null,
        performedBy: entry.performedBy
          ? {
              id: entry.performedBy.id,
              email: entry.performedBy.email,
              firstName: entry.performedBy.firstName,
              lastName: entry.performedBy.lastName
            }
          : null,
        createdAt: entry.createdAt.toISOString()
      }))
    };
  }

  async receiveInventory(input: ReceiveInventoryDto, authUser: AuthUser) {
    if (!hasPermission(authUser, "inventory.adjust")) {
      throw new ForbiddenException("You do not have permission to receive inventory");
    }

    const order = await this.prisma.catalogOrder.findUnique({
      where: { id: input.orderId },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            inventoryLedgerEntries: true
          }
        },
        shipments: {
          where: {
            status: {
              not: "CANCELLED"
            }
          },
          include: {
            items: true
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.paymentStatus !== "PAID") {
      throw new BadRequestException("Only paid orders can be received into warehouse inventory");
    }

    if (["CANCELLED", "REJECTED"].includes(order.status)) {
      throw new BadRequestException("This order cannot be received in its current status");
    }

    const includedShipmentQuantities = this.buildIncludedShipmentQuantityMap(order.shipments);
    const requestedItems = input.items.length
      ? input.items
      : order.items
          .map((item) => {
            const pendingReceiptQuantity = this.getPendingReceiptQuantity(item, includedShipmentQuantities.get(item.id) ?? 0);
            return pendingReceiptQuantity > 0
              ? {
                  orderItemId: item.id,
                  quantity: pendingReceiptQuantity
                }
              : null;
          })
          .filter(Boolean) as Array<{ orderItemId: string; quantity: number }>;

    if (!requestedItems.length) {
      throw new BadRequestException("There is no pending inventory to receive");
    }

    const itemsById = new Map(order.items.map((item) => [item.id, item]));

    for (const requested of requestedItems) {
      const item = itemsById.get(requested.orderItemId);
      if (!item) {
        throw new NotFoundException(`Order item ${requested.orderItemId} not found`);
      }

      const pendingReceiptQuantity = this.getPendingReceiptQuantity(item, includedShipmentQuantities.get(item.id) ?? 0);
      if (requested.quantity > pendingReceiptQuantity) {
        throw new BadRequestException(
          `${item.productName}: only ${pendingReceiptQuantity} unit(s) are still pending warehouse receipt`
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const requested of requestedItems) {
        const item = itemsById.get(requested.orderItemId)!;
        const plannedStorageQuantity = Math.max(0, item.quantity - (includedShipmentQuantities.get(item.id) ?? 0));
        const receivedQuantity = item.inventoryLedgerEntries
          .filter((entry) => entry.entryType === "WAREHOUSE_RECEIPT")
          .reduce((sum, entry) => sum + entry.quantity, 0);
        const nextReceivedQuantity = receivedQuantity + requested.quantity;
        const nextStatus =
          nextReceivedQuantity <= 0
            ? "PENDING_RECEIPT"
            : nextReceivedQuantity < plannedStorageQuantity
              ? "PARTIALLY_RECEIVED"
              : "AVAILABLE";

        await tx.inventoryLedgerEntry.create({
          data: {
            orderId: order.id,
            orderItemId: item.id,
            performedById: authUser.sub,
            entryType: "WAREHOUSE_RECEIPT",
            quantity: requested.quantity,
            notes: "Warehouse receipt"
          }
        });

        await tx.catalogOrderItem.update({
          where: { id: item.id },
          data: {
            inventoryStatus: nextStatus,
            inventoryReadyAt: nextReceivedQuantity > 0 ? new Date() : null
          }
        });
      }
    });

    return {
      ok: true,
      inventory: await this.listInventory({ orderId: input.orderId }, authUser)
    };
  }

  async adjustInventory(input: AdjustInventoryDto, authUser: AuthUser) {
    if (!hasPermission(authUser, "inventory.adjust")) {
      throw new ForbiddenException("You do not have permission to adjust inventory");
    }

    const orderItem = await this.prisma.catalogOrderItem.findUnique({
      where: { id: input.orderItemId },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            assignedEmployeeId: true
          }
        },
        inventoryLedgerEntries: true
      }
    });

    if (!orderItem) {
      throw new NotFoundException("Inventory item not found");
    }

    const currentAvailableQuantity = this.sumInventoryDelta(orderItem.inventoryLedgerEntries);
    const nextAvailableQuantity = currentAvailableQuantity + input.quantityDelta;

    if (nextAvailableQuantity < 0) {
      throw new BadRequestException("Inventory adjustment would reduce this item below zero");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryLedgerEntry.create({
        data: {
          orderId: orderItem.orderId,
          orderItemId: orderItem.id,
          performedById: authUser.sub,
          entryType: "MANUAL_ADJUSTMENT",
          quantity: input.quantityDelta,
          notes: input.note?.trim() || "Manual inventory adjustment"
        }
      });

      await tx.catalogOrderItem.update({
        where: { id: orderItem.id },
        data: {
          inventoryStatus: nextAvailableQuantity > 0 ? "AVAILABLE" : orderItem.inventoryStatus
        }
      });
    });

    return {
      ok: true,
      inventory: await this.listInventory({ orderId: orderItem.orderId }, authUser)
    };
  }

  private buildAccessibleOrderWhere(
    query: Pick<ListInventoryQueryDto | ListInventoryLedgerQueryDto, "orderId" | "userId">,
    authUser: AuthUser
  ): Prisma.CatalogOrderWhereInput {
    const baseWhere: Prisma.CatalogOrderWhereInput = {
      ...(query.orderId ? { id: query.orderId } : {})
    };

    const scope = this.resolveInventoryScope(authUser);

    if (scope === "SELF") {
      return {
        ...baseWhere,
        userId: authUser.sub
      };
    }

    if (scope === "ASSIGNED") {
      if (query.userId) {
        throw new ForbiddenException("Assigned inventory access cannot be filtered by customer");
      }

      return {
        ...baseWhere,
        assignedEmployeeId: authUser.sub
      };
    }

    return {
      ...baseWhere,
      ...(query.userId ? { userId: query.userId } : {})
    };
  }

  private resolveInventoryScope(authUser: AuthUser): AccessibleScope {
    if (hasPermission(authUser, "inventory.read")) {
      return "ALL";
    }

    if (hasPermission(authUser, "inventory.assigned.read")) {
      return "ASSIGNED";
    }

    if (hasPermission(authUser, "inventory.self.read")) {
      return "SELF";
    }

    throw new ForbiddenException("You do not have permission to view inventory");
  }

  private buildIncludedShipmentQuantityMap(
    shipments: Array<{
      billingType: string;
      paymentStatus: string;
      items: Array<{ orderItemId: string; quantity: number }>;
    }>
  ) {
    const quantities = new Map<string, number>();

    for (const shipment of shipments) {
      if (shipment.billingType !== "INCLUDED_IN_ORDER") {
        continue;
      }

      if (!["PAID", "UNPAID", "PENDING"].includes(shipment.paymentStatus)) {
        continue;
      }

      for (const item of shipment.items) {
        quantities.set(item.orderItemId, (quantities.get(item.orderItemId) ?? 0) + item.quantity);
      }
    }

    return quantities;
  }

  private getPendingReceiptQuantity(
    item: {
      quantity: number;
      inventoryLedgerEntries: Array<{ entryType: string; quantity: number }>;
    },
    includedShipmentQuantity: number
  ) {
    const plannedStorageQuantity = Math.max(0, item.quantity - includedShipmentQuantity);
    const receivedQuantity = item.inventoryLedgerEntries
      .filter((entry) => entry.entryType === "WAREHOUSE_RECEIPT")
      .reduce((sum, entry) => sum + entry.quantity, 0);

    return Math.max(0, plannedStorageQuantity - receivedQuantity);
  }

  private sumInventoryDelta(entries: Array<{ quantity: number }>) {
    return entries.reduce((sum, entry) => sum + entry.quantity, 0);
  }
}
