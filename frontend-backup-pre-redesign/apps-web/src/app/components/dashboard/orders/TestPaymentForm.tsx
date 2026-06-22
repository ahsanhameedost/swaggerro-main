"use client";

import { Button } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { FlaskConical } from "lucide-react";
import { useCreateCatalogOrderPayment } from "@/lib/queries.catalog";
import { formatMoney } from "@/lib/money";

type TestPaymentFormProps = {
  orderId: string;
  amount: number;
  currency: string;
  isDisabled?: boolean;
  onSuccess?: () => void | Promise<void>;
};

/**
 * Local/testing payment form. Mocks a successful charge by calling the same
 * payment endpoint with a placeholder source id. The API only honors this when
 * PAYMENTS_TEST_MODE is enabled, so it can never affect production.
 */
export function TestPaymentForm({
  orderId,
  amount,
  currency,
  isDisabled = false,
  onSuccess
}: TestPaymentFormProps) {
  const paymentMutation = useCreateCatalogOrderPayment();

  const handleSubmit = async () => {
    try {
      await paymentMutation.mutateAsync({
        id: orderId,
        input: { sourceId: "TEST-CARD" }
      });

      addToast({
        title: "Test payment complete",
        description: "Order marked as paid (test mode).",
        color: "success"
      });

      await onSuccess?.();
    } catch (error: any) {
      addToast({
        title: "Payment failed",
        description: error?.message ?? "Unable to process the test payment.",
        color: "danger"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-3xl border border-warning/40 bg-warning-50 p-4">
        <FlaskConical className="mt-0.5 size-5 text-warning-600" />
        <div className="text-sm text-foreground/70">
          <div className="font-semibold text-foreground">Test payment mode</div>
          No real card is charged. Clicking the button below marks this order as paid so you can
          continue testing the post-payment flow.
        </div>
      </div>

      <Button
        className="w-full"
        color="primary"
        isDisabled={isDisabled}
        isLoading={paymentMutation.isPending}
        onPress={() => void handleSubmit()}
        style={{ backgroundImage: "var(--primary-gradient)" }}
      >
        Pay {formatMoney(amount, currency)} (Test mode)
      </Button>
    </div>
  );
}
