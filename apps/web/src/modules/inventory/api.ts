import { apiFetch } from "@/lib/api";
import { buildQuery } from "@/modules/catalog/shared";
import type {
  AdjustInventoryInput,
  InventoryResponse,
  ListInventoryParams,
  ReceiveInventoryInput
} from "./types";

export async function listInventory(params: ListInventoryParams = {}) {
  return apiFetch<InventoryResponse>(`/inventory${buildQuery(params as any)}`, {
    method: "GET"
  });
}

export async function receiveInventory(input: ReceiveInventoryInput) {
  return apiFetch<{ ok: true; inventory: InventoryResponse }>("/inventory/receive", {
    method: "POST",
    body: JSON.stringify({
      orderId: input.orderId,
      items: input.items ?? []
    })
  });
}

export async function adjustInventory(input: AdjustInventoryInput) {
  return apiFetch<{ ok: true; inventory: InventoryResponse }>("/inventory/adjust", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
