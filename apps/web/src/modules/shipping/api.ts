import { apiFetch } from "@/lib/api";
import type {
  CreateShipmentPaymentInput,
  CreateShippingProfileInput,
  CreateShippingRateInput,
  CreateShippingShipmentInput,
  CreateShippingZoneInput,
  EstimateShipmentInput,
  ListShipmentsParams,
  ShipmentEstimate,
  ShippingPlanner,
  ShippingProfile,
  ShippingRate,
  ShippingShipment,
  ShippingZone,
  UpdateShipmentTrackingInput,
  UpdateShippingProfileInput,
  UpdateShippingRateInput,
  UpdateShippingZoneInput
} from "./types";

export async function listShippingProfiles() {
  return apiFetch<{ items: ShippingProfile[] }>("/shipping/profiles", { method: "GET" });
}

export async function createShippingProfile(input: CreateShippingProfileInput) {
  return apiFetch<{ profile: ShippingProfile }>("/shipping/profiles", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateShippingProfile(id: string, input: UpdateShippingProfileInput) {
  return apiFetch<{ profile: ShippingProfile }>(`/shipping/profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteShippingProfile(id: string) {
  return apiFetch<{ ok: true }>(`/shipping/profiles/${id}`, {
    method: "DELETE"
  });
}

export async function listShippingZones() {
  return apiFetch<{ items: ShippingZone[] }>("/shipping/zones", { method: "GET" });
}

export async function createShippingZone(input: CreateShippingZoneInput) {
  return apiFetch<{ zone: ShippingZone }>("/shipping/zones", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateShippingZone(id: string, input: UpdateShippingZoneInput) {
  return apiFetch<{ zone: ShippingZone }>(`/shipping/zones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteShippingZone(id: string) {
  return apiFetch<{ ok: true }>(`/shipping/zones/${id}`, {
    method: "DELETE"
  });
}

export async function listShippingRates(params?: {
  zoneId?: string;
  serviceLevel?: string;
  packageType?: string;
}) {
  const search = new URLSearchParams();
  if (params?.zoneId) search.set("zoneId", params.zoneId);
  if (params?.serviceLevel) search.set("serviceLevel", params.serviceLevel);
  if (params?.packageType) search.set("packageType", params.packageType);

  return apiFetch<{ items: ShippingRate[] }>(`/shipping/rates${search.size ? `?${search.toString()}` : ""}`, {
    method: "GET"
  });
}

export async function createShippingRate(input: CreateShippingRateInput) {
  return apiFetch<{ rate: ShippingRate }>("/shipping/rates", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateShippingRate(id: string, input: UpdateShippingRateInput) {
  return apiFetch<{ rate: ShippingRate }>(`/shipping/rates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteShippingRate(id: string) {
  return apiFetch<{ ok: true }>(`/shipping/rates/${id}`, {
    method: "DELETE"
  });
}


export async function listShipments(params: ListShipmentsParams = {}) {
  const search = new URLSearchParams();
  if (params.orderId) search.set("orderId", params.orderId);
  if (params.status) search.set("status", params.status);
  if (params.recipientId) search.set("recipientId", params.recipientId);
  if (params.search) search.set("search", params.search);
  if (params.userId) search.set("userId", params.userId);

  return apiFetch<{ items: ShippingShipment[] }>(`/shipping/shipments${search.size ? `?${search.toString()}` : ""}`, {
    method: "GET"
  });
}

export async function getOrderShippingPlanner(orderId: string) {
  return apiFetch<ShippingPlanner>(`/shipping/order/${orderId}/planner`, {
    method: "GET"
  });
}

export async function estimateShipment(input: EstimateShipmentInput) {
  return apiFetch<ShipmentEstimate>("/shipping/estimate", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createShipment(input: CreateShippingShipmentInput) {
  return apiFetch<{ shipment: ShippingShipment }>("/shipping/shipments", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getShipment(id: string) {
  return apiFetch<{ shipment: ShippingShipment }>(`/shipping/shipments/${id}`, {
    method: "GET"
  });
}

export async function updateShipmentStatus(id: string, status: ShippingShipment["status"]) {
  return apiFetch<{ shipment: ShippingShipment }>(`/shipping/shipments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}


export async function updateShipmentTracking(id: string, input: UpdateShipmentTrackingInput) {
  return apiFetch<{ shipment: ShippingShipment }>(`/shipping/shipments/${id}/tracking`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}


export async function createShipmentPayment(id: string, input: CreateShipmentPaymentInput) {
  return apiFetch<{ shipment: ShippingShipment }>(`/shipping/shipments/${id}/payment`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}
