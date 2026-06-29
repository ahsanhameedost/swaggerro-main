"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { CreditCard } from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useCreateCatalogOrderPayment } from "@/lib/queries.catalog";
import { createCatalogOrderPaymentIntent } from "@/modules/catalog/orders/api";
import { formatMoney } from "@/lib/money";

type StripeCardPaymentFormProps = {
  orderId: string;
  amount: number;
  currency: string;
  customerName?: string;
  email?: string;
  phone?: string | null;
  isDisabled?: boolean;
  onSuccess?: () => void | Promise<void>;
};

// Cache Stripe.js per publishable key so it isn't reloaded on every render.
const stripePromiseCache = new Map<string, Promise<Stripe | null>>();
function getStripe(publishableKey: string) {
  let promise = stripePromiseCache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripePromiseCache.set(publishableKey, promise);
  }
  return promise;
}

export function StripeCardPaymentForm(props: StripeCardPaymentFormProps) {
  const { orderId } = props;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create a PaymentIntent for this order and fetch its client secret.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    createCatalogOrderPaymentIntent(orderId)
      .then((res) => {
        if (!active) return;
        const pk = res.publishableKey ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
        if (!res.clientSecret || !pk) {
          setLoadError("Stripe is not configured. Set STRIPE_SECRET_KEY and the publishable key.");
        } else {
          setClientSecret(res.clientSecret);
          setPublishableKey(pk);
        }
      })
      .catch((err: any) => {
        if (active) setLoadError(err?.message ?? "Unable to start checkout.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const stripePromise = useMemo(
    () => (publishableKey ? getStripe(publishableKey) : null),
    [publishableKey]
  );

  if (loading) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-3xl border border-divider bg-content1">
        <Spinner label="Loading secure checkout…" />
      </div>
    );
  }

  if (loadError || !clientSecret || !stripePromise) {
    return (
      <div className="rounded-3xl border border-danger/30 bg-content1 p-4 text-sm text-danger">
        {loadError ?? "Unable to load the payment form."}
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <StripeInner {...props} />
    </Elements>
  );
}

function StripeInner({ orderId, amount, currency, isDisabled, onSuccess }: StripeCardPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const paymentMutation = useCreateCatalogOrderPayment();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      // Confirm the card with Stripe (handles any 3DS step in-page).
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        throw new Error(error.message ?? "Your card could not be charged.");
      }
      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        throw new Error(
          paymentIntent?.status === "requires_action"
            ? "Additional authentication is required."
            : "Your payment was not completed."
        );
      }

      // Mark the order paid server-side after verifying the intent.
      await paymentMutation.mutateAsync({ id: orderId, input: { sourceId: paymentIntent.id } });

      addToast({
        title: "Payment received",
        description: "Your order has been submitted successfully.",
        color: "success",
      });
      await onSuccess?.();
    } catch (err: any) {
      addToast({
        title: "Payment failed",
        description: err?.message ?? "Unable to process your card.",
        color: "danger",
      });
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-divider bg-content1 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/70">
          <CreditCard className="size-4" />
          Pay securely with Stripe
        </div>
        <div className="rounded-2xl border border-divider bg-background px-4 py-3">
          <PaymentElement onReady={() => setReady(true)} />
        </div>
        <div className="mt-3 text-xs text-foreground/55">
          Test mode — use card 4242 4242 4242 4242, any future date, any CVC.
        </div>
      </div>

      <Button
        className="w-full"
        color="primary"
        isDisabled={isDisabled || !stripe || !elements || !ready}
        isLoading={submitting || paymentMutation.isPending}
        onPress={() => void handleSubmit()}
        style={{ backgroundImage: "var(--primary-gradient)" }}
      >
        Pay {formatMoney(amount, currency)}
      </Button>
    </div>
  );
}
