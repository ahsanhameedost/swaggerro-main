import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adjustInventory, listInventory, receiveInventory } from "@/modules/inventory/api";
import type { AdjustInventoryInput, ListInventoryParams, ReceiveInventoryInput } from "@/modules/inventory/types";

export function useInventory(params: ListInventoryParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["inventory", params.search ?? "", params.userId ?? "", params.orderId ?? ""],
    queryFn: () => listInventory(params),
    enabled
  });
}

export function useReceiveInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReceiveInventoryInput) => receiveInventory(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] });
    }
  });
}

export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdjustInventoryInput) => adjustInventory(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] });
    }
  });
}
