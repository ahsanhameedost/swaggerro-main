import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShipment,
  createShipmentPayment,
  createShippingProfile,
  createShippingRate,
  createShippingZone,
  deleteShippingProfile,
  deleteShippingRate,
  deleteShippingZone,
  estimateShipment,
  getOrderShippingPlanner,
  getShipment,
  listShipments,
  listShippingProfiles,
  listShippingRates,
  listShippingZones,
  updateShipmentStatus,
  updateShipmentTracking,
  updateShippingProfile,
  updateShippingRate,
  updateShippingZone
} from "@/modules/shipping/api";
import type {
  CreateShipmentPaymentInput,
  CreateShippingProfileInput,
  CreateShippingRateInput,
  CreateShippingShipmentInput,
  CreateShippingZoneInput,
  EstimateShipmentInput,
  ListShipmentsParams,
  ShippingShipment,
  UpdateShipmentTrackingInput,
  UpdateShippingProfileInput,
  UpdateShippingRateInput,
  UpdateShippingZoneInput
} from "@/modules/shipping/types";

export function useShippingProfiles(enabled = true) {
  return useQuery({
    queryKey: ["shipping", "profiles"],
    queryFn: async () => (await listShippingProfiles()).items,
    enabled
  });
}

export function useShippingZones(enabled = true) {
  return useQuery({
    queryKey: ["shipping", "zones"],
    queryFn: async () => (await listShippingZones()).items,
    enabled
  });
}

export function useShippingRates(
  params?: {
    zoneId?: string;
    serviceLevel?: string;
    packageType?: string;
  },
  enabled = true
) {
  return useQuery({
    queryKey: ["shipping", "rates", params?.zoneId ?? "", params?.serviceLevel ?? "", params?.packageType ?? ""],
    queryFn: async () => (await listShippingRates(params)).items,
    enabled
  });
}


export function useShipments(params: ListShipmentsParams = {}, enabled = true) {
  return useQuery({
    queryKey: [
      "shipping",
      "shipments",
      params.orderId ?? "",
      params.status ?? "",
      params.recipientId ?? "",
      params.search ?? "",
      params.userId ?? ""
    ],
    queryFn: async () => (await listShipments(params)).items,
    enabled
  });
}

export function useShipment(id: string, enabled = true) {
  return useQuery({
    queryKey: ["shipping", "shipments", "detail", id],
    queryFn: async () => (await getShipment(id)).shipment,
    enabled
  });
}

export function useOrderShippingPlanner(orderId: string, enabled = true) {
  return useQuery({
    queryKey: ["shipping", "planner", orderId],
    queryFn: () => getOrderShippingPlanner(orderId),
    enabled
  });
}

export function useEstimateShipment() {
  return useMutation({
    mutationFn: (input: EstimateShipmentInput) => estimateShipment(input)
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateShippingShipmentInput) => createShipment(input),
    onSuccess: async (response) => {
      const shipment = response.shipment;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shipping", "planner", shipment.orderId] }),
        queryClient.invalidateQueries({ queryKey: ["shipping", "shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", shipment.orderId] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] })
      ]);
    }
  });
}

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ShippingShipment["status"] }) =>
      updateShipmentStatus(id, status),
    onSuccess: async (response) => {
      const shipment = response.shipment;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shipping", "planner", shipment.orderId] }),
        queryClient.invalidateQueries({ queryKey: ["shipping", "shipments", "detail", shipment.id] }),
        queryClient.invalidateQueries({ queryKey: ["shipping", "shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", shipment.orderId] })
      ]);
    }
  });
}

function invalidateShippingSettings(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["shipping", "profiles"] }),
    queryClient.invalidateQueries({ queryKey: ["shipping", "zones"] }),
    queryClient.invalidateQueries({ queryKey: ["shipping", "rates"] }),
    queryClient.invalidateQueries({ queryKey: ["catalog", "products"] }),
    queryClient.invalidateQueries({ queryKey: ["catalog", "public-products"] })
  ]);
}

export function useCreateShippingProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateShippingProfileInput) => createShippingProfile(input),
    onSuccess: async () => invalidateShippingSettings(queryClient)
  });
}

export function useUpdateShippingProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateShippingProfileInput }) =>
      updateShippingProfile(id, input),
    onSuccess: async () => invalidateShippingSettings(queryClient)
  });
}

export function useDeleteShippingProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteShippingProfile(id),
    onSuccess: async () => invalidateShippingSettings(queryClient)
  });
}

export function useCreateShippingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateShippingZoneInput) => createShippingZone(input),
    onSuccess: async () => invalidateShippingSettings(queryClient)
  });
}

export function useUpdateShippingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateShippingZoneInput }) =>
      updateShippingZone(id, input),
    onSuccess: async () => invalidateShippingSettings(queryClient)
  });
}

export function useDeleteShippingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteShippingZone(id),
    onSuccess: async () => invalidateShippingSettings(queryClient)
  });
}

export function useCreateShippingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateShippingRateInput) => createShippingRate(input),
    onSuccess: async () => invalidateShippingSettings(queryClient)
  });
}

export function useUpdateShippingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateShippingRateInput }) =>
      updateShippingRate(id, input),
    onSuccess: async () => invalidateShippingSettings(queryClient)
  });
}

export function useDeleteShippingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteShippingRate(id),
    onSuccess: async () => invalidateShippingSettings(queryClient)
  });
}


export function useUpdateShipmentTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateShipmentTrackingInput }) =>
      updateShipmentTracking(id, input),
    onSuccess: async (response) => {
      const shipment = response.shipment;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shipping", "planner", shipment.orderId] }),
        queryClient.invalidateQueries({ queryKey: ["shipping", "shipments", "detail", shipment.id] }),
        queryClient.invalidateQueries({ queryKey: ["shipping", "shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", shipment.orderId] })
      ]);
    }
  });
}


export function useCreateShipmentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateShipmentPaymentInput }) =>
      createShipmentPayment(id, input),
    onSuccess: async (response) => {
      const shipment = response.shipment;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shipping", "shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["shipping", "shipments", "detail", shipment.id] }),
        queryClient.invalidateQueries({ queryKey: ["shipping", "planner", shipment.orderId] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "orders", "detail", shipment.orderId] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] })
      ]);
    }
  });
}
