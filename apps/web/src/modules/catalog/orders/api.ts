import { apiFetch } from "@/lib/api";
import { buildQuery } from "../shared";
import type {
  CatalogOrderDesignPhase,
  CatalogOrderPaymentResponse,
  CatalogOrderResponse,
  CatalogOrderStats,
  CatalogOrderStatus,
  CreateCatalogOrderPaymentInput,
  CreateOrderDesignUploadInput,
  ListCatalogOrdersParams,
  ListCatalogOrdersResponse,
  RequestOrderItemRevisionInput,
  RevenueReport,
  RevenueReportParams,
  UpdateCatalogOrderStatusResponse,
  UpdateOrderItemDesignInput
} from "./types";

export async function listCatalogOrders(params: ListCatalogOrdersParams = {}) {
  return apiFetch<ListCatalogOrdersResponse>(`/catalog/orders${buildQuery(params as any)}`, {
    method: "GET"
  });
}

export async function getCatalogOrderStats() {
  return apiFetch<CatalogOrderStats>(`/catalog/orders/stats`, { method: "GET" });
}

export async function getRevenueReport(params: RevenueReportParams = {}) {
  return apiFetch<RevenueReport>(`/catalog/orders/report${buildQuery(params as any)}`, {
    method: "GET"
  });
}

export async function getCatalogOrder(id: string) {
  return apiFetch<CatalogOrderResponse>(`/catalog/orders/${id}`, {
    method: "GET"
  });
}

export async function updateCatalogOrderStatus(id: string, status: CatalogOrderStatus) {
  return apiFetch<UpdateCatalogOrderStatusResponse>(`/catalog/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function refundCatalogOrder(id: string) {
  return apiFetch<{ orderId: string; paymentStatus: "REFUNDED" }>(`/payments/orders/${id}/refund`, {
    method: "POST"
  });
}

export async function updateCatalogOrderProductionStage(id: string, productionStage: string) {
  return apiFetch<UpdateCatalogOrderStatusResponse>(`/catalog/orders/${id}/production`, {
    method: "PATCH",
    body: JSON.stringify({ productionStage })
  });
}

export async function requestCatalogOrderAddOns(
  id: string,
  items: { productId: string; productCatalogVariantId?: string | null; quantity: number }[]
) {
  return apiFetch<UpdateCatalogOrderStatusResponse>(`/catalog/orders/${id}/add-ons`, {
    method: "POST",
    body: JSON.stringify({ items })
  });
}

export async function resolveCatalogOrderAddOn(id: string, itemId: string, approve: boolean) {
  return apiFetch<UpdateCatalogOrderStatusResponse>(`/catalog/orders/${id}/add-ons/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ approve })
  });
}

export async function assignCatalogOrderEmployee(id: string, assignedEmployeeId: string | null) {
  return apiFetch<CatalogOrderResponse>(`/catalog/orders/${id}/assignment`, {
    method: "PATCH",
    body: JSON.stringify({ assignedEmployeeId })
  });
}

export async function createCatalogOrderDesignUpload(input: CreateOrderDesignUploadInput) {
  return apiFetch<{
    uploadUrl: string;
    key: string;
    publicUrl: string;
    expiresIn: number;
  }>(`/catalog/orders/design-upload-url`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateCatalogOrderItemDesign(
  orderId: string,
  itemId: string,
  input: UpdateOrderItemDesignInput
) {
  return apiFetch<CatalogOrderResponse>(`/catalog/orders/${orderId}/items/${itemId}/design`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function requestCatalogOrderItemRevision(
  orderId: string,
  itemId: string,
  input: RequestOrderItemRevisionInput
) {
  return apiFetch<CatalogOrderResponse>(`/catalog/orders/${orderId}/items/${itemId}/revisions`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function approveCatalogOrderItem(
  orderId: string,
  itemId: string,
  stage: "MOCKUP" | "FINAL"
) {
  return apiFetch<CatalogOrderResponse>(`/catalog/orders/${orderId}/items/${itemId}/approve`, {
    method: "POST",
    body: JSON.stringify({ stage })
  });
}

export function buildCatalogOrderAssetsUrl(id: string) {
  return `/catalog/orders/${id}/assets.zip`;
}

export function buildCatalogOrderMockupsPdfUrl(id: string) {
  return `/catalog/orders/${id}/mockups.pdf`;
}

export async function createCatalogOrderPayment(
  id: string,
  input: CreateCatalogOrderPaymentInput
) {
  return apiFetch<CatalogOrderPaymentResponse>(`/catalog/orders/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export type CatalogOrderPaymentIntent = {
  testMode: boolean;
  clientSecret: string | null;
  publishableKey: string | null;
};

export async function createCatalogOrderPaymentIntent(id: string, couponCode?: string | null) {
  return apiFetch<CatalogOrderPaymentIntent>(`/catalog/orders/${id}/payment-intent`, {
    method: "POST",
    body: JSON.stringify({ couponCode: couponCode ?? null })
  });
}
