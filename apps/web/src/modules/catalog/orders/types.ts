import type { PaginationMeta } from "../shared";

export type CatalogOrderItemType = "BULK" | "SWAG_PACK" | "PACKAGING";
export type CatalogOrderStatus = "PENDING_REVIEW" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
export type CatalogPaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type CatalogOrderDesignPhase =
  | "MOCKUP_IN_PROGRESS"
  | "REVIEW_MOCKUP_DESIGN"
  | "REVISION_REQUESTED"
  | "FINALIZING_PROOF_DESIGN"
  | "REVIEW_FINAL_DESIGN"
  | "READY_TO_ORDER";

export type CatalogOrderRevision = {
  id: string;
  status: "OPEN" | "RESOLVED";
  notes: string;
  logoUrl?: string | null;
  logoKey?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  requestedByUser?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export type CatalogOrderItem = {
  id: string;
  itemType: CatalogOrderItemType;
  designPhase: CatalogOrderDesignPhase;
  productName: string;
  variantName?: string | null;
  quantity: number;
  quantityPerPack?: number | null;
  unitPrice: number;
  unitPriceCents?: number;
  totalPrice: number;
  totalCents?: number;
  imageUrl?: string | null;
  mockupImageUrl?: string | null;
  proofImageUrl?: string | null;
  adminNotes?: string | null;
  inventoryStatus?: "PENDING_RECEIPT" | "PARTIALLY_RECEIVED" | "AVAILABLE";
  inventoryReadyAt?: string | null;
  availableInventoryQuantity?: number;
  receivedInventoryQuantity?: number;
  pendingWarehouseQuantity?: number;
  hasOpenRevision: boolean;
  revisions: CatalogOrderRevision[];
  customerApprovedMockupAt?: string | null;
  customerApprovedFinalAt?: string | null;
};

export type CatalogOrder = {
  id: string;
  type: "BULK" | "SWAG_PACK" | "COMBINED";
  status: CatalogOrderStatus;
  paymentStatus: CatalogPaymentStatus;
  email: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  notes?: string | null;
  logoUrl?: string | null;
  logoKey?: string | null;
  packQuantity: number;
  totalPrice: number;
  totalCents?: number;
  currency: string;
  itemCount: number;
  storageQuantity: number;
  warehouseQuantity: number;
  storageCost: number;
  shippingCost: number;
  shipmentCount: number;
  taxesAndFees: number;
  totalDue: number;
  allItemsReadyToOrder: boolean;
  paidAt?: string | null;
  inventorySummary?: {
    availableQuantity: number;
    receivedQuantity: number;
    pendingWarehouseQuantity: number;
  };
  assignedEmployee?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  customer?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  items: CatalogOrderItem[];
  shipments: Array<{
    id: string;
    recipientId?: string | null;
    recipient?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
      city: string;
      countryCode: string;
      countryName: string;
    } | null;
    destinationCountryCode: string;
    destinationCountryName: string;
    recipientName?: string | null;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    serviceLevel: "STANDARD" | "EXPRESS";
    status:
      | "DRAFT"
      | "ESTIMATED"
      | "SCHEDULED"
      | "IN_REVIEW"
      | "ON_THE_WAY"
      | "DELIVERED"
      | "FAILURE"
      | "RETURN_TO_SENDER"
      | "AVAILABLE_FOR_PICKUP"
      | "CANCELLED";
    billingType?: "INCLUDED_IN_ORDER" | "SEPARATE_PAYMENT";
    paymentStatus?: CatalogPaymentStatus;
    paidAt?: string | null;
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    statusNotes?: string | null;
    scheduledFor?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    totalCost: number;
    packageCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  project?: {
    id: string;
    name: string;
    swagPackName?: string | null;
    budgetPerPerson?: number | null;
    neededByDate?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogOrderStats = {
  totalOrders: number;
  paidRevenue: number;
  outstanding: number;
  avgOrderValue: number;
  paidOrdersCount: number;
  statusCounts: Record<CatalogOrderStatus, number>;
  monthly: { label: string; total: number }[];
  revenueTrend: number | null;
  ordersTrend: number | null;
  needsAttention: {
    pendingReview: number;
    inDesign: number;
    readyToOrder: number;
    unpaid: number;
  };
};

export type ListCatalogOrdersParams = {
  search?: string;
  status?: CatalogOrderStatus | "";
  assignedEmployeeId?: string;
  page?: number;
  pageSize?: number;
};

export type CatalogOrderResponse = {
  order: CatalogOrder;
};

export type ListCatalogOrdersResponse = {
  items: CatalogOrder[];
  pagination: PaginationMeta;
};

export type UpdateCatalogOrderStatusResponse = {
  order: CatalogOrder;
};

export type CreateOrderDesignUploadInput = {
  filename: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  type: "mockups" | "proofs" | "revisions";
};

export type UpdateOrderItemDesignInput = {
  designPhase?: CatalogOrderDesignPhase;
  mockupImageUrl?: string | null;
  mockupImageKey?: string | null;
  proofImageUrl?: string | null;
  proofImageKey?: string | null;
  adminNotes?: string | null;
  resolveOpenRevision?: boolean;
};

export type RequestOrderItemRevisionInput = {
  notes: string;
  logoUrl?: string | null;
  logoKey?: string | null;
};

export type CreateCatalogOrderPaymentInput = {
  sourceId: string;
};

export type CatalogOrderPaymentResponse = {
  order: CatalogOrder;
  payment: {
    id?: string | null;
    status: string;
    receiptUrl?: string | null;
    amountMoney?: {
      amount?: number;
      currency?: string;
    } | null;
    cardDetails?: {
      status?: string;
      card?: {
        cardBrand?: string;
        last4?: string;
      };
    } | null;
    createdAt?: string | null;
  };
};
