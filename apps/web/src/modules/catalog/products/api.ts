
import { apiFetch } from "@/lib/api";
import { buildQuery } from "../shared";
import type {
  CreateProductInput,
  ListProductsParams,
  ListProductsResponse,
  ProductResponse,
  UpdateProductInput
} from "./types";

export async function listProducts(params: ListProductsParams = {}) {
  return apiFetch<ListProductsResponse>(`/catalog/products${buildQuery(params as any)}`, {
    method: "GET"
  });
}

export async function getProduct(id: string) {
  return apiFetch<ProductResponse>(`/catalog/products/${id}`, { method: "GET" });
}

export async function createProduct(input: CreateProductInput) {
  return apiFetch<ProductResponse>(`/catalog/products`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  return apiFetch<ProductResponse>(`/catalog/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteProduct(id: string) {
  return apiFetch<{ ok: true }>(`/catalog/products/${id}`, {
    method: "DELETE"
  });
}

export async function exportProductsCsv() {
  return apiFetch<string>(`/catalog/products/export`, { method: "GET" });
}

export async function downloadProductsTemplate() {
  return apiFetch<string>(`/catalog/products/import-template`, { method: "GET" });
}

export type ProductImportResult = {
  total: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; name: string; message: string }>;
};

export async function importProductsCsv(csv: string) {
  return apiFetch<ProductImportResult>(`/catalog/products/import`, {
    method: "POST",
    body: JSON.stringify({ csv })
  });
}
