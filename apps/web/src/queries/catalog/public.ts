import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  getPublicProduct,
  listPublicBrands,
  listPublicCategories,
  listPublicCollections,
  listPublicProducts,
  listPublicSubCategories,
  submitPublicOrder
} from "@/modules/catalog/public/api";
import type { ListPublicProductsParams } from "@/modules/catalog/products/types";
import type { PublicCatalogCheckoutInput } from "@/modules/catalog/public/types";

export function usePublicCategories() {
  return useQuery({
    queryKey: ["catalog", "public-categories"],
    queryFn: async () => (await listPublicCategories()).items
  });
}

// Sub-categories with active products, optionally scoped to a parent category
// slug (the shop filter narrows this once a top-level category is picked).
export function usePublicSubCategories(category?: string) {
  return useQuery({
    queryKey: ["catalog", "public-subcategories", category ?? ""],
    queryFn: async () => (await listPublicSubCategories(category)).items
  });
}

export function usePublicBrands() {
  return useQuery({
    queryKey: ["catalog", "public-brands"],
    queryFn: async () => (await listPublicBrands()).items
  });
}

export function usePublicCollections() {
  return useQuery({
    queryKey: ["catalog", "public-collections"],
    queryFn: async () => (await listPublicCollections()).items
  });
}

export function usePublicProducts(params: ListPublicProductsParams) {
  return useQuery({
    queryKey: [
      "catalog",
      "public-products",
      params.search ?? "",
      params.category ?? "",
      params.subCategory ?? "",
      params.brand ?? "",
      params.collection ?? "",
      String(params.isPackaging ?? false),
      params.page ?? 1,
      params.pageSize ?? 12
    ],
    queryFn: () => listPublicProducts(params),
    placeholderData: keepPreviousData
  });
}

export function usePublicProduct(slug: string, enabled = true) {
  return useQuery({
    queryKey: ["catalog", "public-product", slug],
    queryFn: () => getPublicProduct(slug),
    enabled
  });
}

export function useSubmitPublicOrder() {
  return useMutation({
    mutationFn: (input: PublicCatalogCheckoutInput) => submitPublicOrder(input)
  });
}
