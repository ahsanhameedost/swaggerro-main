"use client";

import { Card, CardBody } from "@heroui/react";
import { useMe } from "@/queries/auth";
import { hasPermission } from "@/lib/permissions";
import {
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
} from "@/queries/coupons";
import { CouponManager } from "@/app/components/coupons/CouponManager";

export default function CouponsPage() {
  const { data: user } = useMe();
  const canRead = hasPermission(user, "coupons.read");
  const canWrite = hasPermission(user, "coupons.write");

  const { data, isLoading } = useCoupons();
  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();
  const deleteMutation = useDeleteCoupon();

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view coupons.</CardBody>
      </Card>
    );
  }

  return (
    <CouponManager
      coupons={data?.coupons ?? []}
      isLoading={isLoading}
      canRestrictUser={canWrite}
      subtitle="Platform-wide discount codes, redeemable across the shop and every store."
      onCreate={(input) => createMutation.mutateAsync(input)}
      onUpdate={(id, input) => updateMutation.mutateAsync({ id, input })}
      onDelete={(id) => deleteMutation.mutateAsync(id)}
    />
  );
}
