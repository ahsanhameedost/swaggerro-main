import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecipient,
  deleteRecipient,
  listRecipients,
  updateRecipient
} from "@/modules/recipients/api";
import type {
  CreateRecipientInput,
  ListRecipientsParams,
  UpdateRecipientInput
} from "@/modules/recipients/types";

export function useRecipients(params: ListRecipientsParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["recipients", params.search ?? "", params.countryCode ?? "", params.userId ?? ""],
    queryFn: async () => (await listRecipients(params)).recipients,
    enabled
  });
}

export function useCreateRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRecipientInput) => createRecipient(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipients"] });
    }
  });
}

export function useUpdateRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecipientInput }) =>
      updateRecipient(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipients"] });
    }
  });
}

export function useDeleteRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRecipient(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipients"] });
    }
  });
}
