
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from "@/modules/catalog/categories/api";
import type {
  CreateCategoryInput,
  ListCategoriesParams,
  UpdateCategoryInput
} from "@/modules/catalog/categories/types";

export function useCategories(params: ListCategoriesParams) {
  return useQuery({
    queryKey: ["catalog", "categories", params.search ?? "", params.page ?? 1, params.pageSize ?? 15],
    queryFn: () => listCategories(params),
    placeholderData: keepPreviousData
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "categories"] });
    }
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) => updateCategory(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "categories"] });
    }
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "categories"] });
    }
  });
}
