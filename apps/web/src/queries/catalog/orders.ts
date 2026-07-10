import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveCatalogOrderItem,
  assignCatalogOrderEmployee,
  createCatalogOrderDesignUpload,
  createCatalogOrderPayment,
  getCatalogOrder,
  getCatalogOrderStats,
  listCatalogOrders,
  refundCatalogOrder,
  requestCatalogOrderAddOns,
  resolveCatalogOrderAddOn,
  requestCatalogOrderItemRevision,
  updateCatalogOrderItemDesign,
  updateCatalogOrderProductionStage,
  updateCatalogOrderStatus
} from "@/modules/catalog/orders/api";
import type {
  CatalogOrderStatus,
  CreateCatalogOrderPaymentInput,
  CreateOrderDesignUploadInput,
  ListCatalogOrdersParams,
  RequestOrderItemRevisionInput,
  UpdateOrderItemDesignInput
} from "@/modules/catalog/orders/types";

export function useCatalogOrders(params: ListCatalogOrdersParams, enabled = true) {
  return useQuery({
    queryKey: [
      "catalog",
      "orders",
      params.search ?? "",
      params.status ?? "",
      params.assignedEmployeeId ?? "",
      params.page ?? 1,
      params.pageSize ?? 15
    ],
    queryFn: () => listCatalogOrders(params),
    placeholderData: keepPreviousData,
    enabled
  });
}

export function useCatalogOrderStats(enabled = true) {
  return useQuery({
    queryKey: ["catalog", "orders", "stats"],
    queryFn: () => getCatalogOrderStats(),
    enabled
  });
}

export function useCatalogOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: ["catalog", "orders", "detail", id],
    queryFn: () => getCatalogOrder(id),
    enabled
  });
}

export function useUpdateCatalogOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CatalogOrderStatus }) =>
      updateCatalogOrderStatus(id, status),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", variables.id] })
      ]);
    }
  });
}

export function useUpdateCatalogOrderProductionStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, productionStage }: { id: string; productionStage: string }) =>
      updateCatalogOrderProductionStage(id, productionStage),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", variables.id] })
      ]);
    }
  });
}

export function useRequestCatalogOrderAddOns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items
    }: {
      id: string;
      items: { productId: string; productCatalogVariantId?: string | null; quantity: number }[];
    }) => requestCatalogOrderAddOns(id, items),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", variables.id] })
      ]);
    }
  });
}

export function useResolveCatalogOrderAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId, approve }: { id: string; itemId: string; approve: boolean }) =>
      resolveCatalogOrderAddOn(id, itemId, approve),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", variables.id] })
      ]);
    }
  });
}

export function useRefundCatalogOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => refundCatalogOrder(id),
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", id] })
      ]);
    }
  });
}

export function useAssignCatalogOrderEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, assignedEmployeeId }: { id: string; assignedEmployeeId: string | null }) =>
      assignCatalogOrderEmployee(id, assignedEmployeeId),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", variables.id] })
      ]);
    }
  });
}

export function useCreateCatalogOrderDesignUpload() {
  return useMutation({
    mutationFn: (input: CreateOrderDesignUploadInput) => createCatalogOrderDesignUpload(input)
  });
}

export function useUpdateCatalogOrderItemDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      input
    }: {
      orderId: string;
      itemId: string;
      input: UpdateOrderItemDesignInput;
    }) => updateCatalogOrderItemDesign(orderId, itemId, input),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["catalog", "orders", "detail", result.order.id]
        })
      ]);
    }
  });
}

export function useRequestCatalogOrderItemRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      input
    }: {
      orderId: string;
      itemId: string;
      input: RequestOrderItemRevisionInput;
    }) => requestCatalogOrderItemRevision(orderId, itemId, input),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["catalog", "orders", "detail", result.order.id]
        })
      ]);
    }
  });
}

export function useApproveCatalogOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      stage
    }: {
      orderId: string;
      itemId: string;
      stage: "MOCKUP" | "FINAL";
    }) => approveCatalogOrderItem(orderId, itemId, stage),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["catalog", "orders", "detail", result.order.id]
        })
      ]);
    }
  });
}

export function useCreateCatalogOrderPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateCatalogOrderPaymentInput }) =>
      createCatalogOrderPayment(id, input),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["catalog", "orders", "detail", result.order.id]
        })
      ]);
    }
  });
}
