export type InventoryMovement = {
  id: string;
  orderId: string;
  orderItemId: string;
  shipmentId?: string | null;
  type: "WAREHOUSE_RECEIPT" | "SHIPMENT_ALLOCATION" | "SHIPMENT_ALLOCATION_RELEASE" | "MANUAL_ADJUSTMENT";
  quantityDelta: number;
  note?: string | null;
  metadata?: unknown;
  order: {
    id: string;
    userId?: string | null;
    email: string;
    name: string;
  };
  orderItem: {
    id: string;
    productName: string;
    variantName?: string | null;
  };
  shipment?: {
    id: string;
    billingType: "INCLUDED_IN_ORDER" | "SEPARATE_PAYMENT";
    paymentStatus: "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  } | null;
  performedBy?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  orderId: string;
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  productName: string;
  variantName?: string | null;
  itemType: string;
  quantity: number;
  shippedQuantity: number;
  storedQuantity: number;
  pendingReceiptQuantity: number;
  storageCost: number;
  currency: string;
  imageUrl?: string | null;
  availableToShip: boolean;
  inventoryStatus: "PENDING_RECEIPT" | "PARTIALLY_RECEIVED" | "AVAILABLE";
  lastMovementAt: string;
  createdAt: string;
  updatedAt: string;
};

export type InventorySummary = {
  totalStoredQuantity: number;
  totalStorageCost: number;
  orderCount: number;
  skuCount: number;
};

export type InventoryResponse = {
  items: InventoryItem[];
  summary: InventorySummary;
  recentMovements: InventoryMovement[];
};

export type ListInventoryParams = {
  search?: string;
  userId?: string;
  orderId?: string;
};

export type ReceiveInventoryInput = {
  orderId: string;
  items?: Array<{
    orderItemId: string;
    quantity: number;
  }>;
};

export type AdjustInventoryInput = {
  orderItemId: string;
  quantityDelta: number;
  note?: string | null;
};
