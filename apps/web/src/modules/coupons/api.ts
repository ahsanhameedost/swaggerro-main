import { apiFetch } from "@/lib/api";

export type CouponDiscountType = "PERCENT" | "FIXED";

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  storeId: string | null;
  scope: "platform" | "store";
  assignedUserId: string | null;
  productIds: string[];
  minSubtotal: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

export type CouponInput = {
  code: string;
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  storeId?: string | null;
  assignedUserId?: string | null;
  productIds?: string[];
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active?: boolean;
};

export type CouponLine = { productId: string; lineTotal: number };

// ── Checkout preview (shared) ────────────────────────────────────────────────
export async function validateCoupon(input: {
  code: string;
  storeId?: string | null;
  lines: CouponLine[];
}) {
  return apiFetch<{ valid: boolean; code: string; discountAmount: number }>("/coupons/validate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Admin ────────────────────────────────────────────────────────────────────
export async function listCoupons(params: { search?: string; scope?: "platform" | "store" | "all" } = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.scope) qs.set("scope", params.scope);
  const q = qs.toString();
  return apiFetch<{ coupons: Coupon[] }>(`/coupons${q ? `?${q}` : ""}`);
}

export async function createCoupon(input: CouponInput) {
  return apiFetch<{ coupon: Coupon }>("/coupons", { method: "POST", body: JSON.stringify(input) });
}

export async function updateCoupon(id: string, input: Partial<CouponInput>) {
  return apiFetch<{ coupon: Coupon }>(`/coupons/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteCoupon(id: string) {
  return apiFetch<{ ok: boolean }>(`/coupons/${id}`, { method: "DELETE" });
}

// ── Seller (scoped to own store) ─────────────────────────────────────────────
export async function listMyCoupons(params: { search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  const q = qs.toString();
  return apiFetch<{ coupons: Coupon[] }>(`/coupons/mine${q ? `?${q}` : ""}`);
}

export async function createMyCoupon(input: CouponInput) {
  return apiFetch<{ coupon: Coupon }>("/coupons/mine", { method: "POST", body: JSON.stringify(input) });
}

export async function updateMyCoupon(id: string, input: Partial<CouponInput>) {
  return apiFetch<{ coupon: Coupon }>(`/coupons/mine/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteMyCoupon(id: string) {
  return apiFetch<{ ok: boolean }>(`/coupons/mine/${id}`, { method: "DELETE" });
}
