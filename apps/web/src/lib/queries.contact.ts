import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteContactMessage,
  getContactMessage,
  listContactMessages
} from "@/lib/contact";

export function useContactMessages(params: {
  search?: string;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ["contact-messages", params.search ?? "", params.page, params.pageSize],
    queryFn: () => listContactMessages(params)
  });
}

export function useContactMessage(id: string | null) {
  return useQuery({
    queryKey: ["contact-message", id],
    queryFn: async () => (await getContactMessage(id!)).message,
    enabled: !!id
  });
}

export function useDeleteContactMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContactMessage(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
    }
  });
}
