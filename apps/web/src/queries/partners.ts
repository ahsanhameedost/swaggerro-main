import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSellerApplication,
  listSellerApplications,
  submitSellerApplication,
  updateSellerApplicationStatus
} from "@/modules/partners/api";
import type {
  ListSellerApplicationsParams,
  SellerApplicationStatus
} from "@/modules/partners/types";

const partnersKeys = {
  all: ["partners", "applications"] as const,
  list: (params: ListSellerApplicationsParams) => ["partners", "applications", "list", params] as const,
  detail: (id: string | null) => ["partners", "applications", "detail", id] as const
};

export function usePartnerApplications(params: ListSellerApplicationsParams) {
  return useQuery({
    queryKey: partnersKeys.list(params),
    queryFn: () => listSellerApplications(params),
    placeholderData: (previous) => previous
  });
}

export function usePartnerApplication(id: string | null) {
  return useQuery({
    queryKey: partnersKeys.detail(id),
    queryFn: () => getSellerApplication(id as string),
    enabled: !!id
  });
}

export function useSubmitSellerApplication() {
  return useMutation({
    mutationFn: submitSellerApplication
  });
}

export function useUpdateSellerApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes
    }: {
      id: string;
      status: SellerApplicationStatus;
      adminNotes?: string | null;
    }) => updateSellerApplicationStatus(id, { status, adminNotes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: partnersKeys.all });
    }
  });
}
