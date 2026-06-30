import type {
  CatalogOrder,
  CatalogOrderDesignPhase,
  CatalogOrderItem,
  CatalogOrderItemType
} from "@/modules/catalog/orders/types";

export const ORDER_STATUSES = [
  "PENDING_REVIEW",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED"
] as const;

export const DESIGN_PHASES: CatalogOrderDesignPhase[] = [
  "MOCKUP_IN_PROGRESS",
  "REVIEW_MOCKUP_DESIGN",
  "FINALIZING_PROOF_DESIGN",
  "REVIEW_FINAL_DESIGN",
  "READY_TO_ORDER"
];

/** A sequential, human-friendly order code, e.g. 1 -> "SW-001". */
export function formatOrderNumber(orderNumber: number) {
  return `SW-${String(orderNumber).padStart(3, "0")}`;
}

/** Turn a status enum into a readable label, e.g. "PENDING_REVIEW" -> "Pending Review". */
export function formatOrderStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** HeroUI Chip color for each order status. */
export function getOrderStatusColor(
  status: string
): "default" | "primary" | "secondary" | "success" | "warning" | "danger" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "IN_REVIEW":
      return "primary";
    case "PENDING_REVIEW":
      return "warning";
    case "REJECTED":
      return "danger";
    case "CANCELLED":
      return "default";
    default:
      return "default";
  }
}

/** HeroUI Chip color for each payment status. */
export function getPaymentStatusColor(
  status: string
): "default" | "primary" | "secondary" | "success" | "warning" | "danger" {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "warning";
    case "FAILED":
    case "REFUNDED":
      return "danger";
    case "UNPAID":
    default:
      return "default";
  }
}

export function formatOrderTypeLabel(type: CatalogOrder["type"]) {
  switch (type) {
    case "SWAG_PACK":
      return "Swag Pack";
    case "COMBINED":
      return "Combined";
    default:
      return "Bulk";
  }
}

export function formatItemTypeLabel(type: CatalogOrderItemType) {
  switch (type) {
    case "SWAG_PACK":
      return "Swag Pack Item";
    case "PACKAGING":
      return "Packaging";
    default:
      return "Product";
  }
}

export function formatDesignPhaseLabel(phase: CatalogOrderDesignPhase) {
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

export function getPhaseStepIndex(phase: CatalogOrderDesignPhase) {
  switch (phase) {
    case "MOCKUP_IN_PROGRESS":
      return 0;
    case "REVIEW_MOCKUP_DESIGN":
    case "REVISION_REQUESTED":
      return 1;
    case "FINALIZING_PROOF_DESIGN":
      return 2;
    case "REVIEW_FINAL_DESIGN":
      return 3;
    case "READY_TO_ORDER":
      return 4;
    default:
      return 0;
  }
}

export function buildUserDisplayName(user?: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
} | null) {
  if (!user) {
    return "-";
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

export function getPreferredDesignImage(item: CatalogOrderItem) {
  return item.proofImageUrl || item.mockupImageUrl || item.imageUrl || null;
}
