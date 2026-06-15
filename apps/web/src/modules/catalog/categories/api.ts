
import { apiFetch } from "@/lib/api";
import { buildQuery } from "../shared";
import type {
  CategoryResponse,
  CreateCategoryInput,
  ListCategoriesParams,
  ListCategoriesResponse,
  UpdateCategoryInput
} from "./types";

export async function listCategories(params: ListCategoriesParams = {}) {
  return apiFetch<ListCategoriesResponse>(`/catalog/categories${buildQuery(params as any)}`, {
    method: "GET"
  });
}

export async function getCategory(id: string) {
  return apiFetch<CategoryResponse>(`/catalog/categories/${id}`, { method: "GET" });
}

export async function createCategory(input: CreateCategoryInput) {
  return apiFetch<CategoryResponse>(`/catalog/categories`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  return apiFetch<CategoryResponse>(`/catalog/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteCategory(id: string) {
  return apiFetch<{ ok: true }>(`/catalog/categories/${id}`, {
    method: "DELETE"
  });
}
