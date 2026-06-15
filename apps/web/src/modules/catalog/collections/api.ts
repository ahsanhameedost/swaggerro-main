
import { apiFetch } from "@/lib/api";
import { buildQuery } from "../shared";
import type {
  CollectionResponse,
  CreateCollectionInput,
  ListCollectionsParams,
  ListCollectionsResponse,
  UpdateCollectionInput
} from "./types";

export async function listCollections(params: ListCollectionsParams = {}) {
  return apiFetch<ListCollectionsResponse>(`/catalog/collections${buildQuery(params as any)}`, {
    method: "GET"
  });
}

export async function getCollection(id: string) {
  return apiFetch<CollectionResponse>(`/catalog/collections/${id}`, { method: "GET" });
}

export async function createCollection(input: CreateCollectionInput) {
  return apiFetch<CollectionResponse>(`/catalog/collections`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateCollection(id: string, input: UpdateCollectionInput) {
  return apiFetch<CollectionResponse>(`/catalog/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteCollection(id: string) {
  return apiFetch<{ ok: true }>(`/catalog/collections/${id}`, {
    method: "DELETE"
  });
}
