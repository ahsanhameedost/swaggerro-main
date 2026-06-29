"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { ArrowLeft, CheckCircle2, Loader2, Lock, PackageOpen } from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { usePublicStore } from "@/queries/stores";
import { useMe } from "@/queries/auth";
import { useCatalogCartStore, getCartItemKey, type BulkCartItem } from "@/lib/cart-store";
import { createStoreCheckout, confirmStoreCheckout, type StoreCheckoutSession } from "@/modules/store-checkout/api";
import { resolveUnitPrice } from "@/lib/catalog-pricing";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripe(pk: string) {
  let p = stripeCache.get(pk);
  if (!p) {
    p = loadStripe(pk);
    stripeCache.set(pk, p);
  }
  return p;
}

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring";

export default function StoreCheckoutPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { data: storeData, isLoading: storeLoading } = usePublicStore(slug ?? null);
  const store = storeData?.store;
  const { data: me, isLoading: meLoading } = useMe();

  const bulkItems = useCatalogCartStore((s) => s.bulkItems);
  const removeBulkItem = useCatalogCartStore((s) => s.removeBulkItem);

  const items = useMemo(
    () => bulkItems.filter((i) => i.storeId && store && i.storeId === store.id),
    [bulkItems, store]
  );

  const lineTotal = (i: BulkCartItem) => resolveUnitPrice(i.basePrice, i.quantity, i.pricingOptions) * i.quantity;
  const total = useMemo(() => items.reduce((sum, i) => sum + lineTotal(i), 0), [items]);
  const currency = items[0]?.currency ?? "USD";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [session, setSession] = useState<StoreCheckoutSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Prefill from the signed-in account.
  useMemo(() => {
    if (me && !name && !email) {
      setName([me.firstName, me.lastName].filter(Boolean).join(" ") || "");
      setEmail(me.email ?? "");
    }
  }, [me]);

  const clearStoreItems = () => items.forEach((i) => removeBulkItem(getCartItemKey(i)));

  const startCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    if (!name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      addToast({ title: "Add your name and a valid email", color: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await createStoreCheckout({
        storeSlug: store.slug,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        shippingAddress: address.trim() || null,
        items: items.map((i) => ({
          productId: i.productId,
          productCatalogVariantId: i.productCatalogVariantId ?? null,
          quantity: i.quantity,
        })),
      });
      // Test mode → no card; confirm immediately.
      if (res.testMode) {
        await confirmStoreCheckout({ orderId: res.orderId, paymentIntentId: "TEST" });
        clearStoreItems();
        setDone(true);
        return;
      }
      setSession(res);
    } catch (err: any) {
      addToast({ title: "Checkout failed", description: err?.message ?? "Try again.", color: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  if (storeLoading || meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading checkout…" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="swag-redesign flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <PackageOpen className="size-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Store not found</h1>
      </div>
    );
  }

  const themeVars = {
    "--primary": store.theme.primary,
    "--ring": store.theme.primary,
    "--brand-soft": store.theme.primarySoft,
    "--primary-foreground": store.theme.primaryForeground,
  } as React.CSSProperties;

  return (
    <div style={themeVars} className="swag-redesign min-h-screen bg-muted/20">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href={`/store/${store.slug}`} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to {store.name}
        </Link>

        {done ? (
          <div className="rounded-2xl border border-success/30 bg-card p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-4 font-display text-2xl font-bold">Payment complete</h1>
            <p className="mt-2 text-muted-foreground">Thanks for your order from {store.name}. A receipt was emailed to you.</p>
            <Link href={`/store/${store.slug}`} className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              Continue shopping
            </Link>
          </div>
        ) : !me ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Lock className="mx-auto size-9 text-muted-foreground" />
            <h1 className="mt-4 font-display text-xl font-bold">Sign in to check out</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please sign in to complete your purchase.</p>
            <Link
              href={`/login?next=${encodeURIComponent(`/store/${store.slug}/checkout`)}`}
              className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        ) : !items.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
            <PackageOpen className="mx-auto size-9 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">You have no items from this store in your cart.</p>
            <Link href={`/store/${store.slug}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Browse {store.name}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            {/* Form / payment */}
            <div className="space-y-6">
              {!session ? (
                <form onSubmit={startCheckout} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="font-display text-lg font-bold">Your details</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium">Full name</span>
                      <input className={cn(inputClass, "mt-1.5")} value={name} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">Email</span>
                      <input className={cn(inputClass, "mt-1.5")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">Phone <span className="text-muted-foreground">(optional)</span></span>
                      <input className={cn(inputClass, "mt-1.5")} value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-sm font-medium">Shipping address</span>
                    <textarea
                      className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-ring"
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, city, state, ZIP"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                    Continue to payment
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="font-display text-lg font-bold">Payment</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Test card: 4242 4242 4242 4242, any future date + CVC.</p>
                  {session.clientSecret && session.publishableKey ? (
                    <Elements
                      stripe={getStripe(session.publishableKey)}
                      options={{ clientSecret: session.clientSecret, appearance: { theme: "stripe" } }}
                    >
                      <PayStep
                        session={session}
                        amount={total}
                        currency={currency}
                        onPaid={() => {
                          clearStoreItems();
                          setDone(true);
                        }}
                      />
                    </Elements>
                  ) : (
                    <p className="mt-4 text-sm text-danger">Stripe is not configured.</p>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
              <h3 className="font-display text-base font-bold">Order summary</h3>
              <div className="space-y-3">
                {items.map((i) => (
                  <div key={getCartItemKey(i)} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{i.name}</p>
                      <p className="text-muted-foreground">
                        {i.variantName ? `${i.variantName} · ` : ""}
                        {formatMoney(resolveUnitPrice(i.basePrice, i.quantity, i.pricingOptions), i.currency)} × {i.quantity}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">{formatMoney(lineTotal(i), i.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(total, currency)}</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function PayStep({
  session,
  amount,
  currency,
  onPaid,
}: {
  session: StoreCheckoutSession;
  amount: number;
  currency: string;
  onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
      if (error) throw new Error(error.message ?? "Your card could not be charged.");
      if (!paymentIntent || paymentIntent.status !== "succeeded") throw new Error("Payment was not completed.");
      await confirmStoreCheckout({ orderId: session.orderId, paymentIntentId: paymentIntent.id });
      addToast({ title: "Payment received", color: "success" });
      onPaid();
    } catch (err: any) {
      addToast({ title: "Payment failed", description: err?.message ?? "Try again.", color: "danger" });
      setPaying(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-border bg-background p-3">
        <PaymentElement onReady={() => setReady(true)} />
      </div>
      <button
        type="button"
        onClick={() => void pay()}
        disabled={!stripe || !ready || paying}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--primary)" }}
      >
        {paying ? <Loader2 className="size-4 animate-spin" /> : null}
        Pay {formatMoney(amount, currency)}
      </button>
    </div>
  );
}
