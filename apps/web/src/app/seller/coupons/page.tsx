"use client";

import {
  useCreateMyCoupon,
  useDeleteMyCoupon,
  useMyCoupons,
  useUpdateMyCoupon,
} from "@/queries/coupons";
import { CouponManager } from "@/app/components/coupons/CouponManager";

export default function SellerCouponsPage() {
  const { data, isLoading } = useMyCoupons();
  const createMutation = useCreateMyCoupon();
  const updateMutation = useUpdateMyCoupon();
  const deleteMutation = useDeleteMyCoupon();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <CouponManager
        coupons={data?.coupons ?? []}
        isLoading={isLoading}
        canRestrictUser={false}
        title="Store coupons"
        subtitle="Discount codes for your storefront. The discount comes out of your earnings on each sale."
        onCreate={(input) => createMutation.mutateAsync(input)}
        onUpdate={(id, input) => updateMutation.mutateAsync({ id, input })}
        onDelete={(id) => deleteMutation.mutateAsync(id)}
      />
    </div>
  );
}
