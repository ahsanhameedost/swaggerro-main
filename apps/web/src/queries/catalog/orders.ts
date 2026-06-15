import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveCatalogOrderItem,
  assignCatalogOrderEmployee,
  createCatalogOrderDesignUpload,
  createCatalogOrderPayment,
  getCatalogOrder,
  listCatalogOrders,
  requestCatalogOrderItemRevision,
  updateCatalogOrderItemDesign,
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
