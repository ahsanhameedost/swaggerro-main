import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { Prisma, type CatalogOrderDesignPhase, type CatalogOrderRevisionStatus } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
// archiver is a CommonJS module whose export IS the factory function. The plain
// default import resolved to `.default` (undefined) under this tsconfig and threw
// "archiver_1.default is not a function". import-require binds the callable export.
import archiver = require("archiver");
// sharp ships ESM-style types (export default) but a CommonJS callable runtime
// export, so import-require types it as non-callable. Bind via require + a
// callable cast so it both typechecks and works at runtime.
import type { Sharp } from "sharp";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require("sharp") as (input: Buffer | Uint8Array) => Sharp;
import Stripe from "stripe";
import { randomUUID } from "crypto";
import type { AuthUser } from "../../common/guards/auth.guard";
import type {
  ApproveOrderItemDto,
  AssignOrderEmployeeDto,
  CreateOrderDesignUploadDto,
  CreateOrderPaymentDto,
  ListOrdersQuery,
  RequestOrderItemRevisionDto,
  UpdateOrderItemDesignDto,
  UpdateOrderStatusDto,
  UpdateProductionStageDto,
  RequestOrderAddOnsDto,
  ResolveOrderAddOnDto
} from "../dto/order.dto";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { buildOrderIdentifierWhere } from "./order-identifier";
import { NotificationEventsService } from "../../notifications/notification-events.service";
import { CouponsService } from "../../coupons/coupons.service";
import { CatalogSharedService } from "../common/catalog-shared.service";
import { hasPermission } from "../../common/utils/permissions";
import { env } from "../../env";

type OrderWithRelations = Prisma.CatalogOrderGetPayload<{
  include: {
    user: { select: { id: true; email: true; firstName: true; lastName: true } };
    assignedEmployee: { select: { id: true; email: true; firstName: true; lastName: true } };
    project: true;
    shipments: {
      include: {
        recipient: true;
        items: true;
      };
      orderBy: { createdAt: "desc" };
    };
    items: {
      include: {
        inventoryLedgerEntries: {
          orderBy: { createdAt: "desc" };
        };
        revisions: {
          include: {
            requestedByUser: {
              select: { id: true; email: true; firstName: true; lastName: true };
            };
          };
          orderBy: { createdAt: "desc" };
        };
      };
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }];
    };
  };
}>;

type OrderTotals = {
  subtotal: number;
  subtotalCents: number;
  storageQuantity: number;
  storageCost: number;
  storageCostCents: number;
  shippingCost: number;
  shippingCostCents: number;
  taxesAndFees: number;
  taxesAndFeesCents: number;
  discountAmount: number;
  discountCents: number;
  totalDue: number;
  totalDueCents: number;
  warehouseQuantity: number;
  itemCount: number;
  shipmentCount: number;
  allItemsReadyToOrder: boolean;
};

@Injectable()
export class CatalogOrdersService extends CatalogSharedService {
  constructor(
    prisma: PrismaService,
    storage: StorageService,
    emailService: EmailService,
    private readonly notifications: NotificationsService,
    private readonly events: NotificationEventsService,
    private readonly coupons: CouponsService
  ) {
    super(prisma, storage, emailService);
  }

  private readonly orderInclude = {
    user: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    },
    assignedEmployee: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    },
    project: true,
    shipments: {
      include: {
        recipient: true,
        items: true
      },
      orderBy: { createdAt: "desc" as const }
    },
    items: {
      include: {
        product: { select: { leadTimeDays: true, slug: true } },
        inventoryLedgerEntries: {
          orderBy: { createdAt: "desc" as const }
        },
        revisions: {
          include: {
            requestedByUser: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: "desc" as const }
        }
      },
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }]
    }
  } satisfies Prisma.CatalogOrderInclude;

  async listOrders(query: ListOrdersQuery, authUser: AuthUser) {
    const where = await this.buildAccessibleOrderWhere(query, authUser);

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.catalogOrder.count({ where }),
      this.prisma.catalogOrder.findMany({
        where,
        include: this.orderInclude,
        relationLoadStrategy: "join",
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);

    return {
      items: orders.map((order) => this.serializeOrderDetail(order)),
      pagination: this.makePagination(query.page, query.pageSize, total)
    };
  }

  /**
   * Lightweight dashboard aggregates. Avoids the deep `orderInclude` joins —
   * selects only the scalar columns plus each item's design phase — so it stays
   * fast even over the remote DB and across all accessible orders.
   */
  async getOrderStats(authUser: AuthUser) {
    const where = await this.buildAccessibleOrderWhere({} as ListOrdersQuery, authUser);

    const orders = await this.prisma.catalogOrder.findMany({
      where,
      select: {
        status: true,
        paymentStatus: true,
        paidAt: true,
        createdAt: true,
        totalPrice: true,
        items: {
          select: { designPhase: true, quantity: true, product: { select: { costPrice: true } } }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Cost of goods for a paid order = Σ (item qty × product cost). Null cost => 0.
    const orderCost = (o: (typeof orders)[number]) =>
      o.items.reduce(
        (sum, it) => sum + it.quantity * (it.product?.costPrice ? Number(it.product.costPrice) : 0),
        0
      );

    const now = new Date();
    const monthStart = (monthsAgo: number) =>
      new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const thisMonthStart = monthStart(0);
    const lastMonthStart = monthStart(1);

    const buckets = Array.from({ length: 6 }).map((_, i) => {
      const start = monthStart(5 - i);
      return {
        label: start.toLocaleDateString("en-US", { month: "short" }),
        start,
        end: monthStart(4 - i),
        total: 0
      };
    });

    const statusCounts: Record<string, number> = {
      PENDING_REVIEW: 0,
      IN_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0
    };

    let paidRevenue = 0;
    let paidCost = 0;
    let outstanding = 0;
    let paidOrdersCount = 0;
    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let ordersThisMonth = 0;
    let ordersLastMonth = 0;
    let pendingReview = 0;
    let inDesign = 0;
    let readyToOrder = 0;
    let unpaid = 0;

    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

      const price = Number(o.totalPrice);
      const active = o.status !== "CANCELLED" && o.status !== "REJECTED";
      const ready =
        o.items.length > 0 && o.items.every((it) => it.designPhase === "READY_TO_ORDER");

      const created = new Date(o.createdAt);
      if (created >= thisMonthStart) ordersThisMonth += 1;
      else if (created >= lastMonthStart && created < thisMonthStart) ordersLastMonth += 1;

      if (o.paymentStatus === "PAID") {
        paidRevenue += price;
        paidCost += orderCost(o);
        paidOrdersCount += 1;

        const revDate = new Date(o.paidAt ?? o.createdAt);
        if (revDate >= thisMonthStart) revenueThisMonth += price;
        else if (revDate >= lastMonthStart && revDate < thisMonthStart) revenueLastMonth += price;

        for (const b of buckets) {
          if (revDate >= b.start && revDate < b.end) {
            b.total += price;
            break;
          }
        }
      } else if (active) {
        outstanding += price;
      }

      if (o.status === "PENDING_REVIEW") pendingReview += 1;
      if (active && !ready) inDesign += 1;
      if (active && ready) readyToOrder += 1;
      if (o.status === "APPROVED" && o.paymentStatus !== "PAID") unpaid += 1;
    }

    const pct = (cur: number, prev: number) =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

    return {
      totalOrders: orders.length,
      paidRevenue,
      paidCost,
      grossProfit: paidRevenue - paidCost,
      outstanding,
      avgOrderValue: paidOrdersCount ? paidRevenue / paidOrdersCount : 0,
      paidOrdersCount,
      statusCounts,
      monthly: buckets.map((b) => ({ label: b.label, total: b.total })),
      revenueTrend: pct(revenueThisMonth, revenueLastMonth),
      ordersTrend: pct(ordersThisMonth, ordersLastMonth),
      needsAttention: { pendingReview, inDesign, readyToOrder, unpaid }
    };
  }

  /**
   * Period-bucketed revenue / cost / profit report for paid orders, grouped by
   * day, week (Mon-start), or month across a date range. Powers the Finance
   * reports. Buckets across the whole range are pre-filled so gaps read as 0.
   */
  async getRevenueReport(
    query: { granularity: "day" | "week" | "month"; from?: string; to?: string },
    authUser: AuthUser
  ) {
    const where = await this.buildAccessibleOrderWhere({} as ListOrdersQuery, authUser);
    const gran = query.granularity;

    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const to = query.to ? endOfDay(new Date(query.to)) : endOfDay(new Date());
    // Default window per granularity when no explicit range is given.
    const defaultFrom = () => {
      const d = new Date(to);
      if (gran === "day") d.setDate(d.getDate() - 29);
      else if (gran === "week") d.setDate(d.getDate() - 7 * 11);
      else d.setMonth(d.getMonth() - 11);
      return startOfDay(d);
    };
    const from = query.from ? startOfDay(new Date(query.from)) : defaultFrom();

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    // Monday-anchored week start.
    const weekStart = (d: Date) => {
      const s = startOfDay(d);
      const day = (s.getDay() + 6) % 7; // 0 = Monday
      s.setDate(s.getDate() - day);
      return s;
    };
    const bucketOf = (d: Date): { key: string; label: string } => {
      if (gran === "month") {
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
      }
      const anchor = gran === "week" ? weekStart(d) : startOfDay(d);
      return { key: iso(anchor), label: `${MONTHS[anchor.getMonth()]} ${anchor.getDate()}` };
    };

    type Bucket = { key: string; label: string; revenue: number; cost: number; orders: number };
    const map = new Map<string, Bucket>();

    // Pre-fill every bucket across the range so empty periods still show.
    const cursor = gran === "week" ? weekStart(from) : startOfDay(from);
    if (gran === "month") cursor.setDate(1);
    let guard = 0;
    while (cursor <= to && guard++ < 1000) {
      const { key, label } = bucketOf(cursor);
      if (!map.has(key)) map.set(key, { key, label, revenue: 0, cost: 0, orders: 0 });
      if (gran === "day") cursor.setDate(cursor.getDate() + 1);
      else if (gran === "week") cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }

    const orders = await this.prisma.catalogOrder.findMany({
      where: { ...where, paymentStatus: "PAID" },
      select: {
        totalPrice: true,
        paidAt: true,
        createdAt: true,
        items: { select: { quantity: true, product: { select: { costPrice: true } } } }
      }
    });

    for (const o of orders) {
      const d = new Date(o.paidAt ?? o.createdAt);
      if (d < from || d > to) continue;
      const { key, label } = bucketOf(d);
      const b = map.get(key) ?? { key, label, revenue: 0, cost: 0, orders: 0 };
      b.revenue += Number(o.totalPrice);
      b.cost += o.items.reduce(
        (s, it) => s + it.quantity * (it.product?.costPrice ? Number(it.product.costPrice) : 0),
        0
      );
      b.orders += 1;
      map.set(key, b);
    }

    const list = [...map.values()]
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map((b) => ({ ...b, profit: b.revenue - b.cost }));
    const totals = list.reduce(
      (t, b) => ({ revenue: t.revenue + b.revenue, cost: t.cost + b.cost, orders: t.orders + b.orders }),
      { revenue: 0, cost: 0, orders: 0 }
    );

    return {
      granularity: gran,
      from: from.toISOString(),
      to: to.toISOString(),
      buckets: list,
      totals: {
        ...totals,
        profit: totals.revenue - totals.cost,
        margin: totals.revenue ? ((totals.revenue - totals.cost) / totals.revenue) * 100 : 0
      }
    };
  }

  async getOrderById(id: string, authUser: AuthUser) {
    const order = await this.findAccessibleOrderOrThrow(id, authUser);
    return this.serializeOrderDetail(order);
  }

  async updateOrderStatus(id: string, input: UpdateOrderStatusDto, authUser: AuthUser) {
    this.assertCanManageOrders(authUser);

    const existing = await this.findAccessibleOrderOrThrow(id, authUser);
    const shouldRestoreStock =
      existing.stockReserved &&
      !["CANCELLED", "REJECTED"].includes(existing.status) &&
      ["CANCELLED", "REJECTED"].includes(input.status);

    const order = await this.prisma.$transaction(async (tx) => {
      if (shouldRestoreStock) {
        await this.restoreReservedStock(tx, existing.items);
      }

      return tx.catalogOrder.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          ...(shouldRestoreStock ? { stockReserved: false } : {})
        },
        include: this.orderInclude
      });
    });

    // Let the customer know when their order status changes.
    if (order.userId && input.status !== existing.status) {
      const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
      const statusLabel = input.status
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      await this.events.dispatchToUser({
        userId: order.userId,
        type: "catalog.order.status",
        title: `Order ${statusLabel.toLowerCase()}`,
        body: `Your order ${orderLabel} is now ${statusLabel}.`,
        link: `/dashboard/orders/${order.id}`,
        email: {
          subject: `Order ${orderLabel} · ${statusLabel}`,
          heading: `Order ${statusLabel}`,
          paragraphs: [
            `Your order ${orderLabel} is now ${statusLabel}.`,
            "Tap below to track your order and see the latest progress — no login needed."
          ],
          ctaPath: `/track?token=${order.id}`,
          ctaLabel: "Track your order"
        }
      });
    }

    return this.serializeOrderDetail(order);
  }

  async updateProductionStage(
    id: string,
    input: UpdateProductionStageDto,
    authUser: AuthUser
  ) {
    this.assertCanManageOrders(authUser);
    const order = await this.findAccessibleOrderOrThrow(id, authUser);

    const updated = await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: { productionStage: input.productionStage },
      include: this.orderInclude
    });

    const STAGE_LABELS: Record<string, string> = {
      NOT_STARTED: "Not started",
      READY_FOR_PRODUCTION: "Ready for production",
      IN_PRODUCTION: "In production",
      SHIPPED: "Shipped"
    };
    const label = STAGE_LABELS[input.productionStage] ?? input.productionStage;
    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;

    if (order.userId && input.productionStage !== "NOT_STARTED") {
      await this.events.dispatchToUser({
        userId: order.userId,
        type: "order.production_stage",
        title: label,
        body: `Order ${orderLabel} is now ${label.toLowerCase()}.`,
        link: `/dashboard/orders/${order.id}`,
        email: {
          subject: `Order ${orderLabel} · ${label}`,
          heading: label,
          paragraphs: [`Order ${orderLabel} is now ${label.toLowerCase()}.`],
          ctaPath: `/track?token=${order.id}`,
          ctaLabel: "Track your order"
        }
      });
    }

    return this.serializeOrderDetail(updated);
  }

  // Highest matching volume-tier unit price (falls back to base).
  private resolveTierUnitPrice(baseUnit: number, quantity: number, options: any[]): number {
    let unit = Math.max(0, baseUnit);
    const sorted = [...(options ?? [])].sort((a, b) => (a.qtyFrom ?? 0) - (b.qtyFrom ?? 0));
    for (const o of sorted) {
      if (quantity < o.qtyFrom) continue;
      if (o.isOnward || o.qtyTo == null || quantity <= o.qtyTo) unit = Math.max(0, Number(o.price));
    }
    return unit;
  }

  // Customer adds more products to an in-progress order (to save shipping). The
  // items are created as pending add-ons and an admin must approve them (#33/#34).
  async requestOrderAddOns(orderId: string, input: RequestOrderAddOnsDto, authUser: AuthUser) {
    if (!hasPermission(authUser, "orders.self.read")) {
      throw new ForbiddenException("Only customers can add products to their order");
    }
    const order = await this.findAccessibleOrderOrThrow(orderId, authUser);
    if (["CANCELLED", "REJECTED"].includes(order.status)) {
      throw new BadRequestException("This order can no longer be changed");
    }
    if (order.productionStage === "SHIPPED") {
      throw new BadRequestException("This order has already shipped");
    }

    const products = await this.prisma.catalogProduct.findMany({
      where: { id: { in: input.items.map((i) => i.productId) }, status: "ACTIVE" },
      include: {
        productCatalogVariants: { include: { pricingOptions: true } },
        pricingOptions: { where: { productCatalogVariantId: null } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 }
      }
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    for (const item of input.items) {
      const product = byId.get(item.productId);
      if (!product) throw new BadRequestException("One of the products is unavailable");

      let baseUnit = product.basePrice != null ? Number(product.basePrice) : 0;
      let variantId: string | null = null;
      let variantName: string | null = null;
      let pricingOptions: any[] = product.pricingOptions;
      if (item.productCatalogVariantId) {
        const variant = product.productCatalogVariants.find(
          (v) => v.id === item.productCatalogVariantId
        );
        if (!variant) throw new BadRequestException("Selected variant not found");
        baseUnit = Number(variant.price);
        variantId = variant.id;
        variantName = variant.title ?? null;
        if (variant.pricingOptions?.length) pricingOptions = variant.pricingOptions;
      }

      const unit =
        product.bulkPricingEnabled === false
          ? baseUnit
          : this.resolveTierUnitPrice(baseUnit, item.quantity, pricingOptions);

      await this.prisma.catalogOrderItem.create({
        data: {
          order: { connect: { id: order.id } },
          product: { connect: { id: product.id } },
          ...(variantId ? { productCatalogVariant: { connect: { id: variantId } } } : {}),
          productName: product.name,
          variantName,
          itemType: "BULK",
          designPhase: "MOCKUP_IN_PROGRESS",
          pendingAddOn: true,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(unit),
          totalPrice: new Prisma.Decimal(unit * item.quantity),
          imageUrl: product.images?.[0]?.url ?? null
        }
      });
    }

    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
    await this.events.dispatchToAdmins({
      type: "order.addon_requested",
      title: "Add-on request",
      body: `${order.name} wants to add ${input.items.length} item(s) to order ${orderLabel} to save shipping.`,
      link: `/dashboard/orders/${order.id}`,
      email: {
        subject: `Add-on request · ${orderLabel}`,
        heading: "Add-on request to review",
        paragraphs: [
          `${order.name} requested to add ${input.items.length} product(s) to order ${orderLabel} to combine shipping.`,
          "Open the order to approve or reject the added items."
        ],
        ctaPath: `/dashboard/orders/${order.id}`,
        ctaLabel: "Review request"
      }
    });

    return this.getOrderById(order.id, authUser);
  }

  // Admin approves (joins the order + adds to total) or rejects (removes) a
  // pending add-on item.
  async resolveOrderAddOn(
    orderId: string,
    itemId: string,
    input: ResolveOrderAddOnDto,
    authUser: AuthUser
  ) {
    this.assertCanManageOrders(authUser);
    const order = await this.findAccessibleOrderOrThrow(orderId, authUser);
    const item = order.items.find((entry) => entry.id === itemId);
    if (!item || !(item as any).pendingAddOn) {
      throw new BadRequestException("No pending add-on item found");
    }

    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;

    if (input.approve) {
      await this.prisma.$transaction([
        this.prisma.catalogOrderItem.update({
          where: { id: item.id },
          data: { pendingAddOn: false }
        }),
        this.prisma.catalogOrder.update({
          where: { id: order.id },
          data: { totalPrice: { increment: item.totalPrice } }
        })
      ]);
    } else {
      await this.prisma.catalogOrderItem.delete({ where: { id: item.id } });
    }

    if (order.userId) {
      await this.events.dispatchToUser({
        userId: order.userId,
        type: input.approve ? "order.addon_approved" : "order.addon_rejected",
        title: input.approve ? "Added item approved" : "Added item declined",
        body: input.approve
          ? `"${item.productName}" was approved and added to order ${orderLabel}.`
          : `"${item.productName}" could not be added to order ${orderLabel}.`,
        link: `/dashboard/orders/${order.id}`,
        email: {
          subject: `${input.approve ? "Added item approved" : "Added item declined"} · ${orderLabel}`,
          heading: input.approve ? "Your added item is approved" : "Your added item was declined",
          paragraphs: [
            input.approve
              ? `"${item.productName}" has been added to order ${orderLabel} and will ship together.`
              : `"${item.productName}" could not be added to order ${orderLabel}. Please reach out if you have questions.`
          ],
          ctaPath: `/track?token=${order.id}`,
          ctaLabel: "Track your order"
        }
      });
    }

    return this.getOrderById(order.id, authUser);
  }

  async assignEmployee(id: string, input: AssignOrderEmployeeDto, authUser: AuthUser) {
    this.assertCanManageUsers(authUser);

    const order = await this.findAccessibleOrderOrThrow(id, authUser);

    let assignedEmployeeId: string | null = null;
    let employeeName = "Unassigned";

    if (input.assignedEmployeeId) {
      const employee = await this.prisma.user.findUnique({
        where: { id: input.assignedEmployeeId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: { select: { name: true } }
        }
      });

      if (!employee || ["SUPER_ADMIN", "Customer"].includes(employee.role.name)) {
        throw new NotFoundException("Employee not found");
      }

      assignedEmployeeId = employee.id;
      employeeName = this.buildUserDisplayName(employee.firstName, employee.lastName, employee.email);

      // One event → in-app notification + queued (retried) branded email.
      const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
      await this.events.dispatchToUser({
        userId: employee.id,
        type: "design.assigned",
        title: "New design assigned",
        body: `You've been assigned to order ${orderLabel} for ${order.name}.`,
        // Designers work out of the Designs queue, not the full order page.
        link: `/dashboard/designs`,
        email: {
          subject: `New order assigned: ${orderLabel}`,
          heading: "New design assigned",
          paragraphs: [
            "A new order has been assigned to you.",
            `Order: ${orderLabel}`,
            `Customer: ${order.name}`,
            "Sign in to your dashboard to review the request and start the design process."
          ],
          ctaPath: `/dashboard/designs`,
          ctaLabel: "Open Designs"
        }
      });
    }

    const updated = await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: { assignedEmployeeId },
      include: this.orderInclude
    });

    return this.serializeOrderDetail(updated);
  }

  async createDesignUploadUrl(input: CreateOrderDesignUploadDto, authUser: AuthUser) {
    const isRevisionUpload = input.type === "revisions";

    if (!isRevisionUpload) {
      this.assertCanManageDesigns(authUser);
    }

    const prefixByType: Record<CreateOrderDesignUploadDto["type"], string> = {
      mockups: "catalog/orders/mockups",
      proofs: "catalog/orders/proofs",
      revisions: "catalog/orders/revisions"
    };

    return this.storage.createImageUploadUrl({
      filename: input.filename,
      contentType: input.contentType,
      prefix: prefixByType[input.type]
    });
  }

  async updateOrderItemDesign(
    orderId: string,
    itemId: string,
    input: UpdateOrderItemDesignDto,
    authUser: AuthUser
  ) {
    this.assertCanManageDesigns(authUser);

    const order = await this.findAccessibleOrderOrThrow(orderId, authUser);
    const item = order.items.find((entry) => entry.id === itemId);

    if (!item) {
      throw new NotFoundException("Order item not found");
    }

    const data: Prisma.CatalogOrderItemUpdateInput = {
      ...(input.designPhase ? { designPhase: input.designPhase } : {}),
      ...(input.mockupImageUrl !== undefined
        ? {
            mockupImageUrl: this.toNullableString(input.mockupImageUrl),
            mockupImageKey: this.toNullableString(input.mockupImageKey)
          }
        : {}),
      ...(input.proofImageUrl !== undefined
        ? {
            proofImageUrl: this.toNullableString(input.proofImageUrl),
            proofImageKey: this.toNullableString(input.proofImageKey)
          }
        : {}),
      ...(input.adminNotes !== undefined
        ? {
            adminNotes: this.toNullableString(input.adminNotes)
          }
        : {})
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.catalogOrderItem.update({
        where: { id: item.id },
        data
      });

      if (input.resolveOpenRevision) {
        await tx.catalogOrderItemRevision.updateMany({
          where: {
            orderItemId: item.id,
            status: "OPEN"
          },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date()
          }
        });
      }

      await tx.catalogOrder.update({
        where: { id: order.id },
        data: {
          status: order.status === "PENDING_REVIEW" ? "IN_REVIEW" : order.status
        }
      });
    });

    // Fan out design-progress events to the customer.
    const newPhase = input.designPhase;
    if (order.userId && newPhase) {
      const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
      if (newPhase === "REVIEW_MOCKUP_DESIGN" || newPhase === "REVIEW_FINAL_DESIGN") {
        const isFinal = newPhase === "REVIEW_FINAL_DESIGN";
        await this.events.dispatchToUser({
          userId: order.userId,
          type: "design.review_ready",
          title: isFinal ? "Final design ready for review" : "Mockup ready for review",
          body: `${item.productName} on order ${orderLabel} is ready for your review.`,
          link: "/dashboard/designs",
          email: {
            subject: `${isFinal ? "Final design" : "Mockup"} ready to review · ${orderLabel}`,
            heading: isFinal ? "Your final design is ready" : "Your mockup is ready",
            paragraphs: [
              `The ${isFinal ? "final design" : "mockup"} for ${item.productName} on order ${orderLabel} is ready for your review.`,
              "Open your designs to approve it or request changes."
            ],
            ctaPath: "/dashboard/designs",
            ctaLabel: "Review your design"
          }
        });
      } else if (newPhase === "MOCKUP_IN_PROGRESS") {
        // Low-signal progress — in-app only, no email.
        await this.events.dispatchToUser({
          userId: order.userId,
          type: "design.started",
          title: "Design started",
          body: `Our team started working on ${item.productName} for order ${orderLabel}.`,
          link: `/dashboard/orders/${order.id}`,
          email: false
        });
      }
    }

    return this.getOrderById(order.id, authUser);
  }

  async requestItemRevision(
    orderId: string,
    itemId: string,
    input: RequestOrderItemRevisionDto,
    authUser: AuthUser
  ) {
    if (!hasPermission(authUser, "orders.self.read")) {
      throw new ForbiddenException("Only customers can request revisions");
    }

    const order = await this.findAccessibleOrderOrThrow(orderId, authUser);
    const item = order.items.find((entry) => entry.id === itemId);

    if (!item) {
      throw new NotFoundException("Order item not found");
    }

    if (!["REVIEW_MOCKUP_DESIGN", "REVIEW_FINAL_DESIGN"].includes(item.designPhase)) {
      throw new BadRequestException("This item is not currently open for revisions");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.catalogOrderItemRevision.create({
        data: {
          orderItemId: item.id,
          requestedByUserId: authUser.sub,
          notes: input.notes.trim(),
          logoUrl: this.toNullableString(input.logoUrl),
          logoKey: this.toNullableString(input.logoKey)
        }
      });

      await tx.catalogOrderItem.update({
        where: { id: item.id },
        data: {
          designPhase: "REVISION_REQUESTED"
        }
      });

      await tx.catalogOrder.update({
        where: { id: order.id },
        data: {
          status: "IN_REVIEW"
        }
      });
    });

    // Notify the assigned designer (or all admins if unassigned) — in-app + email.
    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
    const body = `${order.name} requested changes on ${item.productName} (order ${orderLabel}).`;
    const orderEmail = {
      subject: `Revision requested · ${orderLabel}`,
      heading: "Revision requested",
      paragraphs: [body, `Notes: ${input.notes.trim()}`],
      ctaPath: `/dashboard/orders/${order.id}`,
      ctaLabel: "Open order"
    };

    if (order.assignedEmployeeId) {
      // The assigned designer handles revisions from the Designs queue.
      await this.events.dispatchToUser({
        userId: order.assignedEmployeeId,
        type: "design.revision_requested",
        title: "Revision requested",
        body,
        link: `/dashboard/designs`,
        email: { ...orderEmail, ctaPath: `/dashboard/designs`, ctaLabel: "Open Designs" }
      });
    } else {
      await this.events.dispatchToAdmins({
        type: "design.revision_requested",
        title: "Revision requested",
        body,
        link: `/dashboard/orders/${order.id}`,
        email: orderEmail
      });
    }

    return this.getOrderById(order.id, authUser);
  }

  async approveOrderItem(
    orderId: string,
    itemId: string,
    input: ApproveOrderItemDto,
    authUser: AuthUser
  ) {
    if (!hasPermission(authUser, "orders.self.read")) {
      throw new ForbiddenException("Only customers can approve item designs");
    }

    const order = await this.findAccessibleOrderOrThrow(orderId, authUser);
    const item = order.items.find((entry) => entry.id === itemId);

    if (!item) {
      throw new NotFoundException("Order item not found");
    }

    const now = new Date();

    if (input.stage === "MOCKUP") {
      if (item.designPhase !== "REVIEW_MOCKUP_DESIGN") {
        throw new BadRequestException("This item is not waiting for mockup approval");
      }

      // No separate proof step — approving the mockup finalizes the design and
      // moves the item straight to ready-to-order.
      await this.prisma.catalogOrderItem.update({
        where: { id: item.id },
        data: {
          designPhase: "READY_TO_ORDER",
          customerApprovedMockupAt: now,
          customerApprovedFinalAt: now
        }
      });
    } else {
      if (item.designPhase !== "REVIEW_FINAL_DESIGN") {
        throw new BadRequestException("This item is not waiting for final design approval");
      }

      await this.prisma.catalogOrderItem.update({
        where: { id: item.id },
        data: {
          designPhase: "READY_TO_ORDER",
          customerApprovedFinalAt: now
        }
      });
    }

    const updated = await this.findAccessibleOrderOrThrow(order.id, authUser);
    const allItemsReady = updated.items.every((entry) => entry.designPhase === "READY_TO_ORDER");

    if (allItemsReady) {
      await this.prisma.catalogOrder.update({
        where: { id: updated.id },
        data: {
          status: "APPROVED",
          productionStage: "READY_FOR_PRODUCTION"
        }
      });
    }

    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
    const stageLabel = input.stage === "MOCKUP" ? "mockup" : "final design";

    // Tell the design team (assigned designer, else admins) the customer approved.
    const approvalBody = `${order.name} approved the ${stageLabel} for ${item.productName} (order ${orderLabel}).`;
    const approvalEmail = {
      subject: `${input.stage === "MOCKUP" ? "Mockup" : "Final design"} approved · ${orderLabel}`,
      heading: "Design approved",
      paragraphs: [approvalBody],
      ctaPath: `/dashboard/orders/${order.id}`,
      ctaLabel: "Open order"
    };
    if (order.assignedEmployeeId) {
      // The assigned designer sees approvals in their Designs queue.
      await this.events.dispatchToUser({
        userId: order.assignedEmployeeId,
        type: "design.approved",
        title: "Design approved",
        body: approvalBody,
        link: `/dashboard/designs`,
        email: { ...approvalEmail, ctaPath: `/dashboard/designs`, ctaLabel: "Open Designs" }
      });
    } else {
      await this.events.dispatchToAdmins({
        type: "design.approved",
        title: "Design approved",
        body: approvalBody,
        link: `/dashboard/orders/${order.id}`,
        email: approvalEmail
      });
    }

    // Once every item is approved the order is ready to produce — notify both the
    // customer (this previously bypassed all notifications) and the admins.
    if (allItemsReady && order.userId) {
      await this.events.dispatchToUser({
        userId: order.userId,
        type: "design.all_approved",
        title: "All designs approved",
        body: `Every design on order ${orderLabel} is approved and ready to order.`,
        link: `/dashboard/orders/${order.id}`,
        email: {
          subject: `All designs approved · ${orderLabel}`,
          heading: "You're ready to order",
          paragraphs: [
            `All designs on order ${orderLabel} are approved and ready to produce.`,
            "Head to your order to continue to checkout."
          ],
          ctaPath: `/dashboard/orders/${order.id}`,
          ctaLabel: "View order"
        }
      });
    }
    if (allItemsReady) {
      await this.events.dispatchToAdmins({
        type: "order.ready_to_produce",
        title: "Order ready to produce",
        body: `All designs on order ${orderLabel} are approved.`,
        link: `/dashboard/orders/${order.id}`,
        email: false
      });
    }

    return this.getOrderById(order.id, authUser);
  }

// Step 1 of the Stripe flow: create a PaymentIntent for the order's amount and
// return its client secret so the browser can confirm the card. Step 2 is
// createOrderPayment, which verifies the confirmed intent server-side.
async createOrderPaymentIntent(id: string, authUser: AuthUser, couponCode?: string | null) {
  if (!hasPermission(authUser, "orders.self.read")) {
    throw new ForbiddenException("Only customers can pay for orders");
  }

  const order = await this.findAccessibleOrderOrThrow(id, authUser);
  let totals = this.calculateOrderTotals(order);

  if (!totals.allItemsReadyToOrder) {
    throw new BadRequestException(
      "You can proceed with the Request once all the Products are Approved."
    );
  }
  if (["CANCELLED", "REJECTED"].includes(order.status)) {
    throw new BadRequestException("This order cannot be paid in its current status");
  }
  if (order.paymentStatus === "PAID") {
    throw new BadRequestException("This order has already been paid");
  }

  // Apply (or clear) the coupon, then recompute totals so the intent amount and
  // the later payment verification both use the discounted total.
  await this.applyOrderCoupon(order, couponCode, authUser);
  totals = this.calculateOrderTotals(order);

  if (env.PAYMENTS_TEST_MODE) {
    // No real intent in mock mode — the test form posts a TEST sourceId directly.
    return { testMode: true as const, clientSecret: null, publishableKey: null };
  }

  const stripe = this.getStripeClient();
  const intent = await stripe.paymentIntents.create({
    amount: totals.totalDueCents,
    currency: (order.currency || "USD").toLowerCase(),
    metadata: { orderId: order.id },
    receipt_email: order.email ?? undefined,
    description: `Catalog order ${order.id}`,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" }
  });

  return {
    testMode: false as const,
    clientSecret: intent.client_secret,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY ?? null
  };
}

// Validate + persist (or clear) a coupon on an existing order, mutating the
// in-memory order so the caller can recompute totals. Bulk orders are platform
// orders (Swaggeroo funds the discount); a coupon's discount is centralized in
// calculateOrderTotals, so it flows to both the charge and the displayed total.
private async applyOrderCoupon(
  order: OrderWithRelations,
  couponCode: string | null | undefined,
  authUser: AuthUser
) {
  const code = couponCode?.trim();
  if (code) {
    const lines = (order.items ?? [])
      .filter((i) => !(i as any).pendingAddOn)
      .map((i) => ({ productId: i.productId, lineTotal: Number(i.totalPrice) }));
    const resolved = await this.coupons.validateForCheckout({
      code,
      lines,
      storeId: order.storeId ?? null,
      userId: order.userId ?? authUser.sub
    });
    await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: {
        couponId: resolved.couponId,
        couponCode: resolved.code,
        discountAmount: new Prisma.Decimal(resolved.discountAmount)
      }
    });
    (order as any).couponId = resolved.couponId;
    (order as any).couponCode = resolved.code;
    (order as any).discountAmount = resolved.discountAmount;
  } else if ((order as any).couponId || Number((order as any).discountAmount ?? 0) > 0) {
    // No code supplied → remove any previously-applied coupon.
    await this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: { couponId: null, couponCode: null, discountAmount: new Prisma.Decimal(0) }
    });
    (order as any).couponId = null;
    (order as any).couponCode = null;
    (order as any).discountAmount = 0;
  }
}

async createOrderPayment(id: string, input: CreateOrderPaymentDto, authUser: AuthUser) {
  if (!hasPermission(authUser, "orders.self.read")) {
    throw new ForbiddenException("Only customers can pay for orders");
  }

  const order = await this.findAccessibleOrderOrThrow(id, authUser);
  const totals = this.calculateOrderTotals(order);

  if (!totals.allItemsReadyToOrder) {
    throw new BadRequestException(
      "You can proceed with the Request once all the Products are Approved."
    );
  }

  if (["CANCELLED", "REJECTED"].includes(order.status)) {
    throw new BadRequestException("This order cannot be paid in its current status");
  }

  if (order.paymentStatus === "PAID") {
    throw new BadRequestException("This order has already been paid");
  }

  // Stripe is the active provider; Square methods are kept but no longer called.
  const payment = env.PAYMENTS_TEST_MODE
    ? this.createTestPayment(order, totals)
    : await this.createStripePayment(order, totals, input.sourceId);
  const paymentStatus = this.mapSquarePaymentStatus(payment?.status);
  const paidAt = paymentStatus === "PAID" ? new Date() : null;

  // Batched (array) transaction rather than an interactive one: Prisma sends
  // both writes in a single round-trip instead of BEGIN/stmt/stmt/COMMIT hops —
  // meaningful over the remote DB. Still atomic.
  const writes: Prisma.PrismaPromise<unknown>[] = [
    this.prisma.catalogOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        squarePaymentId: payment?.id ?? null,
        paidAt
      }
    })
  ];
  if (paymentStatus === "PAID") {
    writes.push(
      this.prisma.shippingShipment.updateMany({
        where: {
          orderId: order.id,
          billingType: "INCLUDED_IN_ORDER"
        },
        data: {
          paymentStatus: "PAID",
          paidAt
        }
      })
    );
  }
  await this.prisma.$transaction(writes);

  // Notify super admins + the customer once the payment lands. Fire-and-forget:
  // these are best-effort and must not add network round-trips to the response
  // the customer is waiting on (notify/notifyMany already swallow their errors).
  if (paymentStatus === "PAID") {
    // Count the coupon redemption now the payment landed (best-effort).
    if ((order as any).couponId) void this.coupons.redeem((order as any).couponId);

    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
    const totalLabel = `$${totals.totalDue.toFixed(2)}`;
    void this.notifications.notifyAdmins({
      type: "catalog.order.paid",
      title: "Order paid",
      body: `${order.name} paid ${totalLabel} for order ${orderLabel}.`,
      link: `/dashboard/orders/${order.id}`
    });
    if (order.userId) {
      void this.notifications.notify({
        userId: order.userId,
        type: "catalog.order.paid",
        title: "Payment received",
        body: `Thanks! Your payment for order ${orderLabel} was received.`,
        link: `/dashboard/orders/${order.id}`
      });
    }
  }

  return {
    order: await this.getOrderById(order.id, authUser),
    payment: {
      id: payment?.id ?? null,
      status: payment?.status ?? "FAILED",
      receiptUrl: payment?.receipt_url ?? null,
      amountMoney: payment?.amount_money ?? null,
      cardDetails: payment?.card_details ?? null,
      createdAt: payment?.created_at ?? null
    }
  };
}

  async downloadOrderAssetsZip(orderId: string, authUser: AuthUser) {
    const order = await this.findAccessibleOrderOrThrow(orderId, authUser);

    const files = await this.collectOrderAssetFiles(order);
    if (!files.length) {
      throw new NotFoundException("No design assets were found for this order");
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      archive.on("warning", (error) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return;
        }
        reject(error);
      });
      archive.on("error", reject);
      archive.on("end", () => resolve(Buffer.concat(chunks)));
    });

    for (const file of files) {
      archive.append(file.bytes, { name: file.filename });
    }

    await archive.finalize();
    return archivePromise;
  }

  async downloadOrderMockupsPdf(orderId: string, authUser: AuthUser) {
    const order = await this.findAccessibleOrderOrThrow(orderId, authUser);
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    // Swaggeroo brand blue (#005CFE) + supporting neutrals — no other colors.
    const BRAND = rgb(0, 0.361, 0.996);
    const INK = rgb(0.09, 0.11, 0.16);
    const MUTED = rgb(0.42, 0.45, 0.5);
    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;

    // Embed a remote image. PNG/JPEG go straight in (detected from magic bytes);
    // anything else pdf-lib can't handle (e.g. WEBP) is converted to PNG first so
    // every uploaded mockup/proof renders regardless of the file the designer used.
    const embedImage = async (url: string) => {
      const asset = await this.fetchRemoteAsset(url);
      const b = Buffer.from(asset.bytes);
      const isPng = b.length > 3 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
      const isJpg = b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
      if (isPng) return pdf.embedPng(b);
      if (isJpg) return pdf.embedJpg(b);
      const converted = await sharp(b).png().toBuffer();
      return pdf.embedPng(converted);
    };

    // ── Cover — minimal, brand-only, no links or QR ──────────────────────
    const cover = pdf.addPage([PAGE_W, PAGE_H]);
    cover.drawRectangle({ x: 0, y: PAGE_H - 130, width: PAGE_W, height: 130, color: BRAND });
    cover.drawText("SWAGGEROO", { x: 48, y: PAGE_H - 60, size: 13, font: boldFont, color: rgb(1, 1, 1) });
    cover.drawText("Design Proof", { x: 48, y: PAGE_H - 100, size: 28, font: boldFont, color: rgb(1, 1, 1) });

    let cy = PAGE_H - 184;
    const coverLine = (label: string, value: string) => {
      cover.drawText(label, { x: 48, y: cy, size: 10, font, color: MUTED });
      cover.drawText(value, { x: 48, y: cy - 17, size: 15, font: boldFont, color: INK });
      cy -= 50;
    };
    coverLine("ORDER", orderLabel);
    coverLine("CUSTOMER", order.name);
    coverLine("DATE", new Date(order.createdAt).toLocaleDateString());

    // ── One page per uploaded asset: Mockup Design, then Proof Design ────
    let rendered = 0;
    for (const item of order.items) {
      const assets = (
        [
          { heading: "Mockup Design", url: item.mockupImageUrl },
          { heading: "Proof Design", url: item.proofImageUrl }
        ] as const
      ).filter((asset) => Boolean(asset.url)) as { heading: string; url: string }[];

      for (const asset of assets) {
        const page = pdf.addPage([PAGE_W, PAGE_H]);
        // Branded header band with just the design stage as the heading.
        page.drawRectangle({ x: 0, y: PAGE_H - 84, width: PAGE_W, height: 84, color: BRAND });
        page.drawText(asset.heading, { x: 48, y: PAGE_H - 54, size: 22, font: boldFont, color: rgb(1, 1, 1) });
        page.drawText(orderLabel, {
          x: PAGE_W - 110,
          y: PAGE_H - 52,
          size: 12,
          font: boldFont,
          color: rgb(1, 1, 1)
        });

        // Minimal context — product + variant, nothing else.
        page.drawText(item.productName, { x: 48, y: PAGE_H - 118, size: 14, font: boldFont, color: INK });
        page.drawText(item.variantName ?? "Standard", { x: 48, y: PAGE_H - 136, size: 11, font, color: MUTED });

        try {
          const embedded = await embedImage(asset.url);
          const dims = embedded.scale(1);
          const maxW = 500;
          const maxH = 600;
          const ratio = Math.min(maxW / dims.width, maxH / dims.height, 1);
          const w = dims.width * ratio;
          const h = dims.height * ratio;
          // Centered horizontally, just under the header.
          page.drawImage(embedded, { x: (PAGE_W - w) / 2, y: PAGE_H - 160 - h, width: w, height: h });
        } catch {
          page.drawText("Preview image could not be loaded.", {
            x: 48,
            y: PAGE_H - 200,
            size: 11,
            font,
            color: MUTED
          });
        }
        rendered += 1;
      }
    }

    // Empty state — a clear note on the cover instead of a lone cover page.
    if (rendered === 0) {
      cover.drawText("No mockups or proofs have been uploaded yet.", {
        x: 48,
        y: 130,
        size: 12,
        font,
        color: MUTED
      });
    }

    return Buffer.from(await pdf.save());
  }

  // A clean, branded invoice PDF for an order (paid or not) — SWAGGEROO header,
  // order/bill-to details, an itemized table, and totals.
  async downloadOrderInvoicePdf(orderId: string, authUser: AuthUser) {
    const order = await this.findAccessibleOrderOrThrow(orderId, authUser);
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const BRAND = rgb(0, 0.361, 0.996);
    const INK = rgb(0.09, 0.11, 0.16);
    const MUTED = rgb(0.42, 0.45, 0.5);
    const LINE = rgb(0.9, 0.92, 0.95);
    const orderLabel = `SW-${String(order.orderNumber).padStart(3, "0")}`;
    const money = (value: Prisma.Decimal | number | string | null | undefined) =>
      `$${(this.decimalToNumber(value) ?? 0).toFixed(2)}`;
    const paid = order.paymentStatus === "PAID";

    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const L = 48;
    const R = PAGE_W - 48;

    // Header band.
    page.drawRectangle({ x: 0, y: PAGE_H - 96, width: PAGE_W, height: 96, color: BRAND });
    page.drawText("SWAGGEROO", { x: L, y: PAGE_H - 44, size: 15, font: boldFont, color: rgb(1, 1, 1) });
    page.drawText("INVOICE", { x: L, y: PAGE_H - 74, size: 24, font: boldFont, color: rgb(1, 1, 1) });
    // Paid / due chip on the right.
    const chipText = paid ? "PAID" : "DUE";
    const chipW = boldFont.widthOfTextAtSize(chipText, 11) + 22;
    page.drawRectangle({ x: R - chipW, y: PAGE_H - 62, width: chipW, height: 22, color: rgb(1, 1, 1) });
    page.drawText(chipText, { x: R - chipW + 11, y: PAGE_H - 56, size: 11, font: boldFont, color: BRAND });

    // Meta: invoice #, dates.
    let y = PAGE_H - 132;
    page.drawText(`Invoice ${orderLabel}`, { x: L, y, size: 14, font: boldFont, color: INK });
    page.drawText(`Issued: ${new Date(order.createdAt).toLocaleDateString()}`, { x: R - 200, y, size: 10, font, color: MUTED });
    y -= 15;
    if (paid && order.paidAt) {
      page.drawText(`Paid: ${new Date(order.paidAt).toLocaleDateString()}`, { x: R - 200, y, size: 10, font, color: MUTED });
    }

    // Bill to.
    y -= 26;
    page.drawText("BILL TO", { x: L, y, size: 9, font: boldFont, color: MUTED });
    y -= 16;
    page.drawText(order.name ?? "-", { x: L, y, size: 12, font: boldFont, color: INK });
    y -= 15;
    for (const detail of [order.companyName, order.email, order.phone].filter(Boolean) as string[]) {
      page.drawText(detail, { x: L, y, size: 10, font, color: MUTED });
      y -= 14;
    }

    // Items table header.
    y -= 14;
    const colQty = R - 190;
    const colUnit = R - 120;
    const colAmt = R;
    page.drawText("ITEM", { x: L, y, size: 9, font: boldFont, color: MUTED });
    page.drawText("QTY", { x: colQty, y, size: 9, font: boldFont, color: MUTED });
    page.drawText("UNIT", { x: colUnit, y, size: 9, font: boldFont, color: MUTED });
    page.drawText("AMOUNT", { x: colAmt - boldFont.widthOfTextAtSize("AMOUNT", 9), y, size: 9, font: boldFont, color: MUTED });
    y -= 8;
    page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1, color: LINE });
    y -= 18;

    for (const item of order.items) {
      const name = item.productName ?? "Item";
      page.drawText(name.length > 46 ? `${name.slice(0, 45)}…` : name, { x: L, y, size: 11, font: boldFont, color: INK });
      if (item.variantName) {
        page.drawText(item.variantName, { x: L, y: y - 12, size: 9, font, color: MUTED });
      }
      page.drawText(String(item.quantity), { x: colQty, y, size: 11, font, color: INK });
      page.drawText(money(item.unitPrice), { x: colUnit, y, size: 11, font, color: INK });
      const amt = money(item.totalPrice);
      page.drawText(amt, { x: colAmt - font.widthOfTextAtSize(amt, 11), y, size: 11, font, color: INK });
      y -= item.variantName ? 30 : 22;
      page.drawLine({ start: { x: L, y: y + 6 }, end: { x: R, y: y + 6 }, thickness: 0.5, color: LINE });
    }

    // Totals.
    const itemsSubtotal = order.items.reduce(
      (sum, item) => sum + (this.decimalToNumber(item.totalPrice) ?? 0),
      0
    );
    const grandTotal = this.decimalToNumber(order.totalPrice) ?? 0;
    y -= 12;
    const totalsRow = (label: string, value: string, strong = false) => {
      const size = strong ? 14 : 11;
      const f = strong ? boldFont : font;
      page.drawText(label, { x: colUnit - 40, y, size, font: f, color: strong ? INK : MUTED });
      page.drawText(value, { x: colAmt - f.widthOfTextAtSize(value, size), y, size, font: f, color: INK });
      y -= strong ? 22 : 18;
    };
    totalsRow("Subtotal", money(itemsSubtotal));
    if (grandTotal - itemsSubtotal > 0.005) {
      totalsRow("Shipping, storage & fees", money(grandTotal - itemsSubtotal));
    }
    y -= 4;
    page.drawLine({ start: { x: colUnit - 40, y: y + 12 }, end: { x: R, y: y + 12 }, thickness: 1, color: LINE });
    totalsRow(paid ? "Total paid" : "Total due", money(grandTotal), true);

    // Footer.
    page.drawText("Thank you for your order! Questions? Reply to your confirmation email.", {
      x: L,
      y: 60,
      size: 10,
      font,
      color: MUTED
    });
    page.drawText("Swaggeroo · swaggeroo.com", { x: L, y: 44, size: 10, font: boldFont, color: BRAND });

    return { pdf: Buffer.from(await pdf.save()), orderNumber: orderLabel };
  }

  private async buildAccessibleOrderWhere(query: ListOrdersQuery, authUser: AuthUser) {
    const assignedEmployeeFilter =
      query.assignedEmployeeId === "__unassigned__"
        ? { assignedEmployeeId: null }
        : query.assignedEmployeeId
          ? { assignedEmployeeId: query.assignedEmployeeId }
          : {};

    const where: Prisma.CatalogOrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...assignedEmployeeFilter,
      ...(query.search
        ? {
            OR: (() => {
              const term = query.search;
              const or: Prisma.CatalogOrderWhereInput[] = [
                { id: { contains: term, mode: "insensitive" } },
                { name: { contains: term, mode: "insensitive" } },
                { email: { contains: term, mode: "insensitive" } },
                { companyName: { contains: term, mode: "insensitive" } },
                { project: { name: { contains: term, mode: "insensitive" } } }
              ];
              // Match by order number too: "SW-054", "sw054", or plain "54" all
              // resolve to the numeric orderNumber (54).
              const digits = term.replace(/\D/g, "");
              if (digits) {
                const n = Number(digits);
                if (Number.isSafeInteger(n)) or.push({ orderNumber: n });
              }
              return or;
            })()
          }
        : {})
    };

    if (hasPermission(authUser, "catalog.orders.read")) {
      return where;
    }

    if (hasPermission(authUser, "orders.assigned.read")) {
      return {
        ...where,
        assignedEmployeeId: authUser.sub
      };
    }

    if (hasPermission(authUser, "orders.self.read")) {
      return {
        ...where,
        userId: authUser.sub
      };
    }

    throw new ForbiddenException("You do not have access to orders");
  }

  private async findAccessibleOrderOrThrow(id: string, authUser: AuthUser) {
    const order = await this.prisma.catalogOrder.findFirst({
      where: buildOrderIdentifierWhere(id),
      include: this.orderInclude,
      // One JOIN query instead of ~11 sequential round-trips over the remote DB.
      relationLoadStrategy: "join"
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (hasPermission(authUser, "catalog.orders.read")) {
      return order;
    }

    if (hasPermission(authUser, "orders.assigned.read")) {
      if (order.assignedEmployeeId !== authUser.sub) {
        throw new ForbiddenException("You do not have access to this order");
      }

      return order;
    }

    if (hasPermission(authUser, "orders.self.read") && order.userId === authUser.sub) {
      return order;
    }

    throw new ForbiddenException("You do not have access to this order");
  }

  private assertCanManageOrders(authUser: AuthUser) {
    if (!hasPermission(authUser, "catalog.orders.update")) {
      throw new ForbiddenException("You do not have permission to manage orders");
    }
  }

  private assertCanManageUsers(authUser: AuthUser) {
    if (!hasPermission(authUser, "admin.users.write")) {
      throw new ForbiddenException("You do not have permission to manage employees");
    }
  }

  private assertCanManageDesigns(authUser: AuthUser) {
    if (!hasPermission(authUser, "design.write")) {
      throw new ForbiddenException("You do not have permission to manage designs");
    }
  }

  private async collectOrderAssetFiles(order: OrderWithRelations) {
    const files: Array<{ filename: string; bytes: Buffer }> = [];

    if (order.logoUrl) {
      const asset = await this.fetchRemoteAsset(order.logoUrl);
      files.push({
        filename: `order-logo${this.detectFileExtension(order.logoUrl, asset.contentType)}`,
        bytes: asset.bytes
      });
    }

    for (const [itemIndex, item] of order.items.entries()) {
      for (const [revisionIndex, revision] of item.revisions.entries()) {
        if (!revision.logoUrl) {
          continue;
        }

        try {
          const asset = await this.fetchRemoteAsset(revision.logoUrl);
          files.push({
            filename: `item-${itemIndex + 1}-${this.slugifyFilename(item.productName)}-revision-${revisionIndex + 1}${this.detectFileExtension(revision.logoUrl, asset.contentType)}`,
            bytes: asset.bytes
          });
        } catch {}
      }
    }

    return files;
  }

  private async fetchRemoteAsset(url: string) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new BadRequestException(`Failed to fetch design asset: ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);

    return {
      bytes,
      contentType: response.headers.get("content-type") ?? "application/octet-stream"
    };
  }

  private detectFileExtension(url: string, contentType: string) {
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.endsWith(".png") || contentType.includes("png")) {
      return ".png";
    }

    if (lowerUrl.endsWith(".webp") || contentType.includes("webp")) {
      return ".webp";
    }

    if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg") || contentType.includes("jpeg")) {
      return ".jpg";
    }

    return ".bin";
  }

  private slugifyFilename(value: string) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return normalized.replace(/^-+|-+$/g, "") || "file";
  }

  private buildUserDisplayName(
    firstName: string | null | undefined,
    lastName: string | null | undefined,
    email: string
  ) {
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    return fullName || email;
  }

  private formatDesignPhaseLabel(phase: CatalogOrderDesignPhase) {
    switch (phase) {
      case "MOCKUP_IN_PROGRESS":
        return "Mockup In Progress";
      case "REVIEW_MOCKUP_DESIGN":
        return "Review Mockup Design";
      case "REVISION_REQUESTED":
        return "Revision Requested";
      case "FINALIZING_PROOF_DESIGN":
        return "Finalizing Proof Design";
      case "REVIEW_FINAL_DESIGN":
        return "Review Final Design";
      case "READY_TO_ORDER":
        return "Ready To Order";
      default:
        return phase;
    }
  }

private calculateOrderTotals(
  order: Pick<OrderWithRelations, "items" | "totalPrice" | "shipments"> & { discountAmount?: unknown }
) {
  const subtotal = this.requireNumber(
    this.decimalToNumber(order.totalPrice),
    "Order total price is missing"
  );
  const subtotalCents = this.toMoneyCents(subtotal);
  const itemCount = order.items?.length ?? 0;
  const allocatedByOrderItemId = new Map<string, number>();

  for (const shipment of order.shipments ?? []) {
    if (shipment.status === "CANCELLED") {
      continue;
    }

    if ((shipment as any).billingType === "SEPARATE_PAYMENT" && (shipment as any).paymentStatus !== "PAID") {
      continue;
    }

    for (const shipmentItem of (shipment as any).items ?? []) {
      allocatedByOrderItemId.set(
        shipmentItem.orderItemId,
        (allocatedByOrderItemId.get(shipmentItem.orderItemId) ?? 0) + shipmentItem.quantity
      );
    }
  }

  // Pending add-on items (awaiting admin approval) don't count toward storage,
  // totals or readiness until they're approved (#33/#34).
  const activeItems = (order.items ?? []).filter((item) => !(item as any).pendingAddOn);
  const storageQuantity = activeItems.reduce((sum, item) => {
    const allocated = allocatedByOrderItemId.get(item.id) ?? 0;
    return sum + Math.max(0, item.quantity - allocated);
  }, 0);
  const storageCost = storageQuantity;
  const storageCostCents = storageQuantity * 100;
  const shippingCost = (order.shipments ?? [])
    .filter((shipment) => shipment.status !== "CANCELLED" && (shipment as any).billingType === "INCLUDED_IN_ORDER")
    .reduce((sum, shipment) => sum + (this.decimalToNumber(shipment.totalCost) ?? 0), 0);
  const shippingCostCents = this.toMoneyCents(shippingCost);
  const shipmentCount = (order.shipments ?? []).filter((shipment) => shipment.status !== "CANCELLED").length;
  const taxesAndFees = 0;
  const taxesAndFeesCents = 0;
  // Coupon discount (0 for every order without one — so this is a no-op for
  // existing orders). Clamped so the total can never go below zero.
  const grossCents = subtotalCents + storageCostCents + shippingCostCents + taxesAndFeesCents;
  const discountCents = Math.max(
    0,
    Math.min(grossCents, this.toMoneyCents(this.decimalToNumber((order as any).discountAmount) ?? 0))
  );
  const discountAmount = discountCents / 100;
  const totalDueCents = grossCents - discountCents;
  const totalDue = totalDueCents / 100;
  const allItemsReadyToOrder =
    activeItems.length > 0 && activeItems.every((item) => item.designPhase === "READY_TO_ORDER");

  return {
    subtotal,
    subtotalCents,
    storageQuantity,
    storageCost,
    storageCostCents,
    shippingCost,
    shippingCostCents,
    taxesAndFees,
    taxesAndFeesCents,
    discountAmount,
    discountCents,
    totalDue,
    totalDueCents,
    warehouseQuantity: storageQuantity,
    itemCount,
    shipmentCount,
    allItemsReadyToOrder
  } satisfies OrderTotals;
}

private toMoneyCents(amount: number) {
  return Math.round(amount * 100);
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

// Test-mode payment: mocks a completed Square charge without any network call.
// Gated by PAYMENTS_TEST_MODE — never enabled in production.
private createTestPayment(
  order: Pick<OrderWithRelations, "id" | "currency">,
  totals: OrderTotals
) {
  return {
    id: `TEST-${randomUUID()}`,
    status: "COMPLETED",
    receipt_url: null,
    amount_money: {
      amount: totals.totalDueCents,
      currency: order.currency
    },
    card_details: {
      status: "CAPTURED",
      card: { card_brand: "TEST", last_4: "4242" }
    },
    created_at: new Date().toISOString()
  };
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

private async createSquarePayment(
  order: Pick<OrderWithRelations, "id" | "email" | "phone" | "currency">,
  totals: OrderTotals,
  sourceId: string
) {
  const square = this.assertSquareConfig();
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
      reference_id: order.id.slice(0, 40),
      buyer_email_address: order.email,
      note: `Catalog order ${order.id}`,
      autocomplete: true,
      amount_money: {
        amount: totals.totalDueCents,
        currency: order.currency
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

private stripeClient: Stripe | null = null;

private getStripeClient() {
  const secret = env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new ServiceUnavailableException(
      "Stripe is not configured. Set STRIPE_SECRET_KEY."
    );
  }
  if (!this.stripeClient) {
    this.stripeClient = new Stripe(secret);
  }
  return this.stripeClient;
}

// Verifies a PaymentIntent the browser already confirmed, then returns a
// Square-shaped payment object so the downstream mapping stays unchanged.
// `sourceId` here is the Stripe PaymentIntent id (pi_...).
private async createStripePayment(
  order: Pick<OrderWithRelations, "id" | "email" | "phone" | "currency">,
  totals: OrderTotals,
  sourceId: string
) {
  const stripe = this.getStripeClient();

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(sourceId, { expand: ["latest_charge"] });
  } catch {
    throw new BadRequestException("We couldn't verify your payment. Please try again.");
  }

  // Guard against tampering: the intent must belong to THIS order and match the amount.
  if (intent.metadata?.orderId !== order.id) {
    throw new BadRequestException("This payment does not match the order.");
  }
  if (intent.amount !== totals.totalDueCents) {
    throw new BadRequestException("The paid amount does not match the order total.");
  }
  if (intent.status !== "succeeded") {
    throw new BadRequestException(
      intent.status === "requires_action"
        ? "Additional authentication is required to complete this payment."
        : "Your payment was not completed. Please try again."
    );
  }

  const charge =
    intent.latest_charge && typeof intent.latest_charge !== "string"
      ? (intent.latest_charge as Stripe.Charge)
      : null;
  const card = charge?.payment_method_details?.card ?? null;

  return {
    id: intent.id,
    status: "COMPLETED",
    receipt_url: charge?.receipt_url ?? null,
    amount_money: {
      amount: intent.amount,
      currency: (intent.currency || order.currency || "usd").toUpperCase()
    },
    card_details: {
      status: "CAPTURED",
      card: {
        card_brand: card?.brand?.toUpperCase() ?? "CARD",
        last_4: card?.last4 ?? "0000"
      }
    },
    created_at: new Date((intent.created ?? Date.now() / 1000) * 1000).toISOString()
  };
}

  private getInventorySnapshot(item: OrderWithRelations["items"][number]) {
    const ledgerEntries = item.inventoryLedgerEntries ?? [];
    let availableQuantity = 0;
    let receivedQuantity = 0;

    for (const entry of ledgerEntries as any[]) {
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

  serializeOrderDetail(order: OrderWithRelations) {
    const totals = this.calculateOrderTotals(order);

    // Estimated delivery = order date + the longest product lead time on the
    // order. Powers the customer ETA and the ahead/late tracker messaging (#28).
    const maxLeadDays = Math.max(
      0,
      ...(order.items ?? []).map((it) => (it as any).product?.leadTimeDays ?? 0)
    );
    const estimatedDeliveryDate =
      maxLeadDays > 0
        ? new Date(new Date(order.createdAt).getTime() + maxLeadDays * 86_400_000).toISOString()
        : null;

    const includedShipmentQuantityByOrderItemId = new Map<string, number>();

    for (const shipment of order.shipments ?? []) {
      if (shipment.status === "CANCELLED") {
        continue;
      }

      if ((shipment as any).billingType !== "INCLUDED_IN_ORDER") {
        continue;
      }

      for (const shipmentItem of (shipment as any).items ?? []) {
        includedShipmentQuantityByOrderItemId.set(
          shipmentItem.orderItemId,
          (includedShipmentQuantityByOrderItemId.get(shipmentItem.orderItemId) ?? 0) + shipmentItem.quantity
        );
      }
    }

    const itemInventory = (order.items ?? []).map((item) => {
      const snapshot = this.getInventorySnapshot(item);
      const includedShipmentQuantity = includedShipmentQuantityByOrderItemId.get(item.id) ?? 0;
      const pendingWarehouseQuantity = Math.max(0, item.quantity - includedShipmentQuantity - snapshot.receivedQuantity);

      return {
        itemId: item.id,
        availableQuantity: snapshot.availableQuantity,
        receivedQuantity: snapshot.receivedQuantity,
        pendingWarehouseQuantity
      };
    });

    const inventorySummary = itemInventory.reduce(
      (summary, item) => ({
        availableQuantity: summary.availableQuantity + item.availableQuantity,
        receivedQuantity: summary.receivedQuantity + item.receivedQuantity,
        pendingWarehouseQuantity: summary.pendingWarehouseQuantity + item.pendingWarehouseQuantity
      }),
      {
        availableQuantity: 0,
        receivedQuantity: 0,
        pendingWarehouseQuantity: 0
      }
    );

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      paymentStatus: order.paymentStatus,
      productionStage: order.productionStage,
      estimatedDeliveryDate,
      email: order.email,
      name: order.name,
      companyName: order.companyName,
      phone: order.phone,
      notes: order.notes,
      logoUrl: order.logoUrl,
      logoKey: order.logoKey,
      packQuantity: order.packQuantity,
      totalPrice: totals.subtotal,
      totalCents: totals.subtotalCents,
      currency: order.currency,
      itemCount: totals.itemCount,
      storageQuantity: totals.storageQuantity,
      warehouseQuantity: totals.warehouseQuantity,
      storageCost: totals.storageCost,
      shippingCost: totals.shippingCost,
      shipmentCount: totals.shipmentCount,
      taxesAndFees: totals.taxesAndFees,
      totalDue: totals.totalDue,
      allItemsReadyToOrder: totals.allItemsReadyToOrder,
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      inventorySummary,
      assignedEmployee: order.assignedEmployee
        ? {
            id: order.assignedEmployee.id,
            email: order.assignedEmployee.email,
            firstName: order.assignedEmployee.firstName,
            lastName: order.assignedEmployee.lastName
          }
        : null,
      customer: order.user
        ? {
            id: order.user.id,
            email: order.user.email,
            firstName: order.user.firstName,
            lastName: order.user.lastName
          }
        : null,
      items: (order.items ?? []).map((item) => {
        const unitPrice = this.requireNumber(
          this.decimalToNumber(item.unitPrice),
          `Unit price missing for ${item.productName}`
        );
        const lineTotal = this.requireNumber(
          this.decimalToNumber(item.totalPrice),
          `Line total missing for ${item.productName}`
        );
        const snapshot = itemInventory.find((entry) => entry.itemId === item.id) ?? {
          availableQuantity: 0,
          receivedQuantity: 0,
          pendingWarehouseQuantity: 0
        };

        return {
          id: item.id,
          itemType: item.itemType,
          designPhase: item.designPhase,
          pendingAddOn: (item as any).pendingAddOn ?? false,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          quantityPerPack: item.quantityPerPack,
          unitPrice,
          unitPriceCents: this.toMoneyCents(unitPrice),
          totalPrice: lineTotal,
          totalCents: this.toMoneyCents(lineTotal),
          imageUrl: item.imageUrl,
          mockupImageUrl: item.mockupImageUrl,
          proofImageUrl: item.proofImageUrl,
          adminNotes: item.adminNotes,
          inventoryStatus: item.inventoryStatus,
          inventoryReadyAt: item.inventoryReadyAt ? item.inventoryReadyAt.toISOString() : null,
          availableInventoryQuantity: snapshot.availableQuantity,
          receivedInventoryQuantity: snapshot.receivedQuantity,
          pendingWarehouseQuantity: snapshot.pendingWarehouseQuantity,
          hasOpenRevision: item.revisions.some((revision) => revision.status === "OPEN"),
          revisions: item.revisions.map((revision) => ({
            id: revision.id,
            status: revision.status as CatalogOrderRevisionStatus,
            notes: revision.notes,
            logoUrl: revision.logoUrl,
            logoKey: revision.logoKey,
            resolvedAt: revision.resolvedAt ? revision.resolvedAt.toISOString() : null,
            createdAt: revision.createdAt.toISOString(),
            requestedByUser: revision.requestedByUser
              ? {
                  id: revision.requestedByUser.id,
                  email: revision.requestedByUser.email,
                  firstName: revision.requestedByUser.firstName,
                  lastName: revision.requestedByUser.lastName
                }
              : null
          })),
          customerApprovedMockupAt: item.customerApprovedMockupAt
            ? item.customerApprovedMockupAt.toISOString()
            : null,
          customerApprovedFinalAt: item.customerApprovedFinalAt
            ? item.customerApprovedFinalAt.toISOString()
            : null
        };
      }),
      shipments: (order.shipments ?? []).map((shipment: any) => ({
        id: shipment.id,
        recipientId: shipment.recipientId ?? null,
        recipient: shipment.recipient
          ? {
              id: shipment.recipient.id,
              firstName: shipment.recipient.firstName,
              lastName: shipment.recipient.lastName,
              email: shipment.recipient.email,
              phone: shipment.recipient.phone,
              city: shipment.recipient.city,
              countryCode: shipment.recipient.countryCode,
              countryName: shipment.recipient.countryName
            }
          : null,
        destinationCountryCode: shipment.destinationCountryCode,
        destinationCountryName: shipment.destinationCountryName,
        recipientName: shipment.recipientName,
        recipientEmail: shipment.recipientEmail,
        recipientPhone: shipment.recipientPhone,
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
        totalCost: this.decimalToNumber(shipment.totalCost),
        packageCount: shipment.packageCount,
        createdAt: shipment.createdAt.toISOString(),
        updatedAt: shipment.updatedAt.toISOString()
      })),
      project: order.project
        ? {
            id: order.project.id,
            name: order.project.name,
            swagPackName: order.project.swagPackName ?? null,
            budgetPerPerson: this.decimalToNumber(order.project.budgetPerPerson),
            neededByDate: order.project.neededByDate ? order.project.neededByDate.toISOString() : null,
            createdAt: order.project.createdAt.toISOString(),
            updatedAt: order.project.updatedAt.toISOString()
          }
        : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };
  }

  private async restoreReservedStock(
    tx: Prisma.TransactionClient,
    items: Array<{
      productId: string;
      productCatalogVariantId?: string | null;
      quantity: number;
    }>
  ) {
    for (const item of items) {
      if (item.productCatalogVariantId) {
        await tx.catalogVariant.update({
          where: { id: item.productCatalogVariantId },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        });
        continue;
      }

      await tx.catalogProduct.update({
        where: { id: item.productId },
        data: {
          baseStock: {
            increment: item.quantity
          }
        }
      });
    }
  }
}