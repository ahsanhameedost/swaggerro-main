
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand
} from "@/modules/catalog/brands/api";
import type {
  CreateBrandInput,
  ListBrandsParams,
  UpdateBrandInput
} from "@/modules/catalog/brands/types";

export function useBrands(params: ListBrandsParams) {
  return useQuery({
    queryKey: ["catalog", "brands", params.search ?? "", params.page ?? 1, params.pageSize ?? 15],
    queryFn: () => listBrands(params),
    placeholderData: keepPreviousData
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBrandInput) => createBrand(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "brands"] });
    }
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBrandInput }) => updateBrand(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "brands"] });
    }
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "brands"] });
    }
  });
}
