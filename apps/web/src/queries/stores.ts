import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStore,
  deleteStore,
  getMyStore,
  getPublicStore,
  getStore,
  listStores,
  updateMyStore,
  updateStore
} from "@/modules/stores/api";
import type {
  CreateStoreInput,
  ListStoresParams,
  UpdateOwnStoreInput,
  UpdateStoreInput
} from "@/modules/stores/types";

const storeKeys = {
  all: ["stores"] as const,
  list: (params: ListStoresParams) => ["stores", "list", params] as const,
  detail: (id: string | null) => ["stores", "detail", id] as const,
  mine: ["stores", "me"] as const,
  public: (slug: string | null) => ["stores", "public", slug] as const
};

export function usePublicStore(slug: string | null) {
  return useQuery({
    queryKey: storeKeys.public(slug),
    queryFn: () => getPublicStore(slug as string),
    enabled: !!slug
  });
}

export function useStores(params: ListStoresParams) {
  return useQuery({
    queryKey: storeKeys.list(params),
    queryFn: () => listStores(params),
    placeholderData: (previous) => previous
  });
}

export function useStore(id: string | null) {
  return useQuery({
    queryKey: storeKeys.detail(id),
    queryFn: () => getStore(id as string),
    enabled: !!id
  });
}

export function useMyStore() {
  return useQuery({ queryKey: storeKeys.mine, queryFn: getMyStore });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStoreInput) => createStore(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: storeKeys.all })
  });
}

export function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStoreInput }) => updateStore(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: storeKeys.all })
  });
}

export function useDeleteStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStore(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: storeKeys.all })
  });
}

export function useUpdateMyStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOwnStoreInput) => updateMyStore(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: storeKeys.all })
  });
}
