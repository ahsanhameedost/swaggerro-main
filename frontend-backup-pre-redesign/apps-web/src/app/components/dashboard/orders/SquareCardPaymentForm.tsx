"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { CreditCard } from "lucide-react";
import { useCreateCatalogOrderPayment } from "@/lib/queries.catalog";
import { formatMoney } from "@/lib/money";
import {
  loadSquareWebSdk,
  type SquareCardInstance,
  type SquareEnvironment
} from "@/lib/square";

type SquareCardPaymentFormProps = {
  orderId: string;
  amount: number;
  currency: string;
  customerName: string;
  email: string;
  phone?: string | null;
  isDisabled?: boolean;
  onSuccess?: () => void | Promise<void>;
};

function splitCustomerName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { givenName: "Customer", familyName: undefined as string | undefined };
  }

  const [givenName, ...rest] = trimmed.split(/\s+/);

  return {
    givenName,
    familyName: rest.length ? rest.join(" ") : undefined
  };
}

export function SquareCardPaymentForm({
  orderId,
  amount,
  currency,
  customerName,
  email,
  phone,
  isDisabled = false,
  onSuccess
}: SquareCardPaymentFormProps) {
  const cardContainerRef = useRef<HTMLDivElement | null>(null);
  const cardInstanceRef = useRef<SquareCardInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const paymentMutation = useCreateCatalogOrderPayment();

  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";
  const squareEnvironment = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT ?? "sandbox") as SquareEnvironment;

  const customer = useMemo(() => splitCustomerName(customerName), [customerName]);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      if (!applicationId || !locationId) {
        setLoadError(
          "Square is not configured. Set NEXT_PUBLIC_SQUARE_APPLICATION_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID."
        );
        setIsInitializing(false);
        return;
      }

      try {
        setIsInitializing(true);
        setIsReady(false);
        setLoadError(null);

        const Square = await loadSquareWebSdk(squareEnvironment);
        if (!isMounted || !cardContainerRef.current) {
          return;
        }

        const payments = Square.payments(applicationId, locationId);
        const card = await payments.card();
        await card.attach(cardContainerRef.current);

        if (!isMounted) {
          await card.destroy?.();
          return;
        }

        cardInstanceRef.current = card;
        setIsReady(true);
      } catch (error: any) {
        if (!isMounted) {
          return;
        }
        setLoadError(error?.message ?? "Unable to load Square card form.");
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    void initialize();

    return () => {
      isMounted = false;
      const card = cardInstanceRef.current;
      cardInstanceRef.current = null;
      if (card?.destroy) {
        void card.destroy();
      }
    };
  }, [applicationId, locationId, squareEnvironment]);

  const handleSubmit = async () => {
    const card = cardInstanceRef.current;
    if (!card) {
      addToast({
        title: "Payment form not ready",
        description: "Please wait for the card form to finish loading.",
        color: "warning"
      });
      return;
    }

    try {
      const result = await card.tokenize({
        amount: amount.toFixed(2),
        currencyCode: currency,
        intent: "CHARGE",
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: {
          givenName: customer.givenName,
          familyName: customer.familyName,
          email
        }
      });

      if (result.status !== "OK" || !result.token) {
        const message =
          result.errors?.map((error) => error.message).filter(Boolean).join(", ") ||
          "Square could not tokenize this card.";
        throw new Error(message);
      }

      await paymentMutation.mutateAsync({
        id: orderId,
        input: {
          sourceId: result.token
        }
      });

      addToast({
        title: "Payment received",
        description: "Your order has been submitted successfully.",
        color: "success"
      });

      await onSuccess?.();
    } catch (error: any) {
      addToast({
        title: "Payment failed",
        description: error?.message ?? "Unable to process your card.",
        color: "danger"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-divider bg-content1 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/70">
          <CreditCard className="size-4" />
          Pay securely with Square
        </div>

        <div
          ref={cardContainerRef}
          className="min-h-[120px] rounded-2xl border border-divider bg-background px-4 py-3"
        />

        {loadError ? (
          <div className="mt-3 text-sm text-danger">{loadError}</div>
        ) : (
          <div className="mt-3 text-xs text-foreground/55">
            Your card details are securely collected by Square.
          </div>
        )}
      </div>

      <Button
        className="w-full"
        color="primary"
        isDisabled={isDisabled || !!loadError || !isReady}
        isLoading={isInitializing || paymentMutation.isPending}
        onPress={() => void handleSubmit()}
        style={{ backgroundImage: "var(--primary-gradient)" }}
      >
        Pay {formatMoney(amount, currency)}
      </Button>
    </div>
  );
}
