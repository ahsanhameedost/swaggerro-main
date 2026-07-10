import { apiFetch } from "@/lib/api";
import type { SavedSwagPackSnapshot } from "@/lib/cart-store";

export type SavedSwagPack = {
  id: string;
  name: string;
  snapshot: SavedSwagPackSnapshot;
  createdAt: string;
};

export async function getSavedSwagPacks() {
  return apiFetch<{ packs: SavedSwagPack[] }>("/swag-packs", { method: "GET" });
}

export async function saveSwagPack(name: string, snapshot: SavedSwagPackSnapshot) {
  return apiFetch<{ pack: SavedSwagPack }>("/swag-packs", {
    method: "POST",
    body: JSON.stringify({ name, snapshot })
  });
}

export async function deleteSavedSwagPack(id: string) {
  return apiFetch<{ ok: true }>(`/swag-packs/${id}`, { method: "DELETE" });
}
