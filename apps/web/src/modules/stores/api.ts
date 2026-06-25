import { apiFetch } from "@/lib/api";
import type {
  CreateStoreInput,
  ListStoresParams,
  Store,
  StoresResponse,
  UpdateOwnStoreInput,
  UpdateStoreInput
} from "./types";

function buildQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getPublicStore(slug: string) {
  return apiFetch<{ store: Store }>(`/stores/public/${slug}`, { method: "GET" });
}

export async function listStores(params: ListStoresParams = {}) {
  return apiFetch<StoresResponse>(`/stores${buildQuery(params as any)}`, { method: "GET" });
}

export async function getStore(id: string) {
  return apiFetch<{ store: Store }>(`/stores/${id}`, { method: "GET" });
}

export async function createStore(input: CreateStoreInput) {
  return apiFetch<{ store: Store }>(`/stores`, { method: "POST", body: JSON.stringify(input) });
}

export async function updateStore(id: string, input: UpdateStoreInput) {
  return apiFetch<{ store: Store }>(`/stores/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteStore(id: string) {
  return apiFetch<{ ok: boolean }>(`/stores/${id}`, { method: "DELETE" });
}

export async function getMyStore() {
  return apiFetch<{ store: Store }>(`/stores/me`, { method: "GET" });
}

export async function updateMyStore(input: UpdateOwnStoreInput) {
  return apiFetch<{ store: Store }>(`/stores/me`, { method: "PATCH", body: JSON.stringify(input) });
}
