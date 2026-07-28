
import { apiFetch } from "@/lib/api";
import { buildQuery } from "../shared";
import type {
  BrandResponse,
  CreateBrandInput,
  ListBrandsParams,
  ListBrandsResponse,
  UpdateBrandInput
} from "./types";

export async function listBrands(params: ListBrandsParams = {}) {
  return apiFetch<ListBrandsResponse>(`/catalog/brands${buildQuery(params as any)}`, {
    method: "GET"
  });
}

export async function getBrand(id: string) {
  return apiFetch<BrandResponse>(`/catalog/brands/${id}`, { method: "GET" });
}

export async function createBrand(input: CreateBrandInput) {
  return apiFetch<BrandResponse>(`/catalog/brands`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateBrand(id: string, input: UpdateBrandInput) {
  return apiFetch<BrandResponse>(`/catalog/brands/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteBrand(id: string) {
  return apiFetch<{ ok: true }>(`/catalog/brands/${id}`, {
    method: "DELETE"
  });
}
