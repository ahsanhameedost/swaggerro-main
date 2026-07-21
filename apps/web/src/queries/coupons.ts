import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCoupon,
  createMyCoupon,
  deleteCoupon,
  deleteMyCoupon,
  listCoupons,
  listMyCoupons,
  updateCoupon,
  updateMyCoupon,
  type CouponInput,
} from "@/modules/coupons/api";

const KEY = ["coupons"] as const;

// ── Admin ────────────────────────────────────────────────────────────────────
export function useCoupons(params: { search?: string; scope?: "platform" | "store" | "all" } = {}) {
  return useQuery({
    queryKey: [...KEY, "admin", params],
    queryFn: () => listCoupons(params),
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CouponInput) => createCoupon(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CouponInput> }) => updateCoupon(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// ── Seller (own store) ───────────────────────────────────────────────────────
export function useMyCoupons(params: { search?: string } = {}) {
  return useQuery({
    queryKey: [...KEY, "mine", params],
    queryFn: () => listMyCoupons(params),
  });
}

export function useCreateMyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CouponInput) => createMyCoupon(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateMyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CouponInput> }) => updateMyCoupon(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteMyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMyCoupon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
