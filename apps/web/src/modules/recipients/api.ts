import { apiFetch } from "@/lib/api";
import { buildQuery } from "@/modules/catalog/shared";
import type {
  CreateRecipientInput,
  ListRecipientsParams,
  Recipient,
  UpdateRecipientInput
} from "./types";

export async function listRecipients(params: ListRecipientsParams = {}) {
  return apiFetch<{ recipients: Recipient[] }>(`/recipients${buildQuery(params as any)}`, {
    method: "GET"
  });
}

export async function createRecipient(input: CreateRecipientInput) {
  return apiFetch<{ recipient: Recipient }>(`/recipients`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateRecipient(id: string, input: UpdateRecipientInput) {
  return apiFetch<{ recipient: Recipient }>(`/recipients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteRecipient(id: string) {
  return apiFetch<{ ok: true }>(`/recipients/${id}`, {
    method: "DELETE"
  });
}
