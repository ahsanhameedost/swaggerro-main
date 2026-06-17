import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { Prisma, type CatalogOrderDesignPhase, type CatalogOrderRevisionStatus } from "@prisma/client";
import { PDFDocument, StandardFonts } from "pdf-lib";
// archiver is a CommonJS module whose export IS the factory function. The plain
// default import resolved to `.default` (undefined) under this tsconfig and threw
// "archiver_1.default is not a function". import-require binds the callable export.
import archiver = require("archiver");
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
  UpdateOrderStatusDto
} from "../dto/order.dto";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
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
    emailService: EmailService
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

    return this.serializeOrderDetail(order);
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

      try {
        await this.emailService.sendEmployeeAssignedOrderEmail({
          to: employee.email,
          employeeName,
          orderId: order.id,
          customerName: order.name
        });
      } catch {}
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

    const recipientEmail = order.assignedEmployee?.email ?? process.env.ADMIN_EMAIL ?? null;
    const recipientName = order.assignedEmployee
      ? this.buildUserDisplayName(
          order.assignedEmployee.firstName,
          order.assignedEmployee.lastName,
          order.assignedEmployee.email
        )
      : "Admin";

    if (recipientEmail) {
      try {
        await this.emailService.sendDesignRevisionRequestedEmail({
          to: recipientEmail,
          recipientName,
          orderId: order.id,
          productName: item.productName,
          requestedByName: order.name,
          notes: input.notes.trim()
        });
      } catch {}
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

      await this.prisma.catalogOrderItem.update({
        where: { id: item.id },
        data: {
          designPhase: "FINALIZING_PROOF_DESIGN",
          customerApprovedMockupAt: now
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
          status: "APPROVED"
        }
      });
    }

    return this.getOrderById(order.id, authUser);
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

  const payment = env.PAYMENTS_TEST_MODE
    ? this.createTestPayment(order, totals)
    : await this.createSquarePayment(order, totals, input.sourceId);
  const paymentStatus = this.mapSquarePaymentStatus(payment?.status);
  const paidAt = paymentStatus === "PAID" ? new Date() : null;

  await this.prisma.$transaction(async (tx) => {
    await tx.catalogOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        squarePaymentId: payment?.id ?? null,
        paidAt
      }
    });

    if (paymentStatus === "PAID") {
      await tx.shippingShipment.updateMany({
        where: {
          orderId: order.id,
          billingType: "INCLUDED_IN_ORDER"
        },
        data: {
          paymentStatus: "PAID",
          paidAt
        }
      });
    }
  });

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

    const cover = pdf.addPage([595.28, 841.89]);
    cover.drawText(`Order ${order.id}`, {
      x: 48,
      y: 780,
      size: 20,
      font: boldFont
    });
    cover.drawText(`Customer: ${order.name}`, {
      x: 48,
      y: 748,
      size: 12,
      font
    });
    cover.drawText(`Items: ${order.items.length}`, {
      x: 48,
      y: 730,
      size: 12,
      font
    });

    for (const [index, item] of order.items.entries()) {
      const page = pdf.addPage([595.28, 841.89]);
      const imageUrl = item.mockupImageUrl ?? item.proofImageUrl ?? item.imageUrl ?? null;

      page.drawText(`${index + 1}. ${item.productName}`, {
        x: 48,
        y: 790,
        size: 18,
        font: boldFont
      });
      page.drawText(`Variant: ${item.variantName ?? "Standard"}`, {
        x: 48,
        y: 764,
        size: 11,
        font
      });
      page.drawText(`Phase: ${this.formatDesignPhaseLabel(item.designPhase)}`, {
        x: 48,
        y: 746,
        size: 11,
        font
      });

      if (imageUrl) {
        try {
          const imageAsset = await this.fetchRemoteAsset(imageUrl);
          const embedded =
            imageAsset.contentType === "image/png" || imageUrl.toLowerCase().endsWith(".png")
              ? await pdf.embedPng(imageAsset.bytes)
              : await pdf.embedJpg(imageAsset.bytes);

          const dimensions = embedded.scale(1);
          const maxWidth = 500;
          const maxHeight = 620;
          const ratio = Math.min(maxWidth / dimensions.width, maxHeight / dimensions.height, 1);
          const width = dimensions.width * ratio;
          const height = dimensions.height * ratio;

          page.drawImage(embedded, {
            x: 48,
            y: 80,
            width,
            height
          });
        } catch {
          page.drawText("Preview image could not be embedded in the PDF.", {
            x: 48,
            y: 708,
            size: 11,
            font
          });
        }
      } else {
        page.drawText("No mockup image uploaded yet.", {
          x: 48,
          y: 708,
          size: 11,
          font
        });
      }
    }

    return Buffer.from(await pdf.save());
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
            OR: [
              { id: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { companyName: { contains: query.search, mode: "insensitive" } },
              { project: { name: { contains: query.search, mode: "insensitive" } } }
            ]
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
    const order = await this.prisma.catalogOrder.findUnique({
      where: { id },
      include: this.orderInclude
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

private calculateOrderTotals(order: Pick<OrderWithRelations, "items" | "totalPrice" | "shipments">) {
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

  const storageQuantity = (order.items ?? []).reduce((sum, item) => {
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
  const totalDueCents = subtotalCents + storageCostCents + shippingCostCents + taxesAndFeesCents;
  const totalDue = totalDueCents / 100;
  const allItemsReadyToOrder = (order.items ?? []).every(
    (item) => item.designPhase === "READY_TO_ORDER"
  );

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
      type: order.type,
      status: order.status,
      paymentStatus: order.paymentStatus,
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