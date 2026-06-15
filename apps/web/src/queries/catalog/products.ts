
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct
} from "@/modules/catalog/products/api";
import type {
  CreateProductInput,
  ListProductsParams,
  UpdateProductInput
} from "@/modules/catalog/products/types";

export function useProducts(params: ListProductsParams) {
  return useQuery({
    queryKey: [
      "catalog",
      "products",
      params.search ?? "",
      params.status ?? "",
      params.categoryId ?? "",
      params.collectionId ?? "",
      params.page ?? 1,
      params.pageSize ?? 15
    ],
    queryFn: () => listProducts(params),
    placeholderData: keepPreviousData
  });
}

export function useProduct(id: string, enabled = true) {
  return useQuery({
    queryKey: ["catalog", "products", id],
    queryFn: () => getProduct(id),
    enabled
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog", "public-products"] });
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => updateProduct(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog", "public-products"] });
    }
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog", "public-products"] });
    }
  });
}
