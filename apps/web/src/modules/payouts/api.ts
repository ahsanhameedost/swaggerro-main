import { apiFetch } from "@/lib/api";

export type PayoutLedger = {
  paidOrders: number;
  earnedCents: number;
  paidOutCents: number;
  balanceCents: number;
};

export type PayoutDetails = {
  payoutMethod: string | null;
  payoutBankName: string | null;
  payoutAccountName: string | null;
  payoutAccountNumber: string | null;
  payoutRoutingNumber: string | null;
  payoutDetails: string | null;
  hasDetails: boolean;
};

export type PayoutRecord = {
  id: string;
  amountCents: number;
  status: string;
  method: string | null;
  reference: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type SellerPayoutSummary = {
  store: { id: string; name: string; commissionPercent: number } & PayoutLedger & PayoutDetails;
  payouts: PayoutRecord[];
};

export type AdminStoreRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  commissionPercent: number;
  owner: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
} & PayoutLedger & PayoutDetails;

export type UpdatePayoutDetailsInput = Partial<{
  payoutMethod: string | null;
  payoutBankName: string | null;
  payoutAccountName: string | null;
  payoutAccountNumber: string | null;
  payoutRoutingNumber: string | null;
  payoutDetails: string | null;
}>;

export async function getSellerPayouts() {
  return apiFetch<SellerPayoutSummary>("/payouts/me", { method: "GET" });
}

export async function updatePayoutDetails(input: UpdatePayoutDetailsInput) {
  return apiFetch<{ ok: true }>("/payouts/me/details", { method: "PATCH", body: JSON.stringify(input) });
}

export async function adminListPayoutStores() {
  return apiFetch<{ stores: AdminStoreRow[] }>("/payouts/admin/stores", { method: "GET" });
}

export async function adminSetCommission(storeId: string, commissionPercent: number) {
  return apiFetch<{ ok: true }>(`/payouts/admin/stores/${storeId}/commission`, {
    method: "PATCH",
    body: JSON.stringify({ commissionPercent }),
  });
}

export async function adminPayStore(storeId: string, input: { amountCents?: number; note?: string | null }) {
  return apiFetch<{ payout: PayoutRecord }>(`/payouts/admin/stores/${storeId}/pay`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
