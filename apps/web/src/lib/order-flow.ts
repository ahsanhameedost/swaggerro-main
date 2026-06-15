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
