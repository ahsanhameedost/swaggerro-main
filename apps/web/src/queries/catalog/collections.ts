
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection
} from "@/modules/catalog/collections/api";
import type {
  CreateCollectionInput,
  ListCollectionsParams,
  UpdateCollectionInput
} from "@/modules/catalog/collections/types";

export function useCollections(params: ListCollectionsParams) {
  return useQuery({
    queryKey: ["catalog", "collections", params.search ?? "", params.page ?? 1, params.pageSize ?? 15],
    queryFn: () => listCollections(params),
    placeholderData: keepPreviousData
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCollectionInput) => createCollection(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "collections"] });
    }
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCollectionInput }) => updateCollection(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "collections"] });
    }
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["catalog", "collections"] });
    }
  });
}
