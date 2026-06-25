import { apiFetch } from "@/lib/api";
import type {
  CreateSellerApplicationInput,
  ListSellerApplicationsParams,
  SellerApplication,
  SellerApplicationStatus,
  SellerApplicationsResponse
} from "./types";

function buildQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function submitSellerApplication(input: CreateSellerApplicationInput) {
  return apiFetch<{ ok: boolean; id: string }>(`/partners/applications`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listSellerApplications(params: ListSellerApplicationsParams = {}) {
  return apiFetch<SellerApplicationsResponse>(
    `/partners/applications${buildQuery(params as any)}`,
    { method: "GET" }
  );
}

export async function getSellerApplication(id: string) {
  return apiFetch<{ application: SellerApplication }>(`/partners/applications/${id}`, {
    method: "GET"
  });
}

export async function updateSellerApplicationStatus(
  id: string,
  input: { status: SellerApplicationStatus; adminNotes?: string | null }
) {
  return apiFetch<{ application: SellerApplication }>(`/partners/applications/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function exportSellerApplicationsCsv(
  params: Pick<ListSellerApplicationsParams, "search" | "status"> = {}
) {
  return apiFetch<string>(`/partners/applications/export${buildQuery(params as any)}`, {
    method: "GET"
  });
}
