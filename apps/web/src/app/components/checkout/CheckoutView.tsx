"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { addToast } from "@heroui/toast";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  PackageOpen,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getCartItemKey, type BulkCartItem } from "@/lib/cart-store";
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

export interface CheckoutSessionLike {
  orderId: string;
  testMode?: boolean;
  clientSecret?: string | null;
  publishableKey?: string | null;
}

export interface CheckoutDetailsPayload {
  name: string;
  email: string;
  phone: string | null;
  shippingAddress: string | null;
  notes: string | null;
  items: {
    productId: string;
    productCatalogVariantId: string | null;
    quantity: number;
    setupFee?: number;
  }[];
}

export interface CheckoutViewProps {
  items: BulkCartItem[];
  authed: boolean;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  backHref: string;
  backLabel: string;
  browseHref: string;
  browseLabel: string;
  signInHref: string;
  emptyText?: string;
  createSession: (payload: CheckoutDetailsPayload) => Promise<CheckoutSessionLike>;
  confirm: (orderId: string, paymentIntentId: string) => Promise<unknown>;
  onCleared: () => void;
  primaryStyle?: CSSProperties;
}

const labelClass = "mb-1.5 flex items-center justify-between text-sm font-medium text-foreground";
const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function SectionCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-primary tabular-nums">
          {step}
        </span>
        <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function CheckoutView(props: CheckoutViewProps) {
  const {
    items,
    authed,
    backHref,
    backLabel,
    browseHref,
    browseLabel,
    signInHref,
    emptyText,
    createSession,
    confirm,
    onCleared,
    primaryStyle,
  } = props;

  const unitOf = (i: BulkCartItem) => resolveUnitPrice(i.basePrice, i.quantity, i.pricingOptions);
  // Line total = units + a one-time setup/imprint fee (if any).
  const lineTotal = (i: BulkCartItem) => unitOf(i) * i.quantity + (i.setupFee ?? 0);
  const total = useMemo(() => items.reduce((sum, i) => sum + lineTotal(i), 0), [items]);
  const currency = items[0]?.currency ?? "USD";

  const [name, setName] = useState(props.prefillName ?? "");
  const [email, setEmail] = useState(props.prefillEmail ?? "");
  const [phone, setPhone] = useState(props.prefillPhone ?? "");
  const [company, setCompany] = useState("");
  const [street, setStreet] = useState("");
  const [apt, setApt] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("United States");
  const [notes, setNotes] = useState("");

  const [session, setSession] = useState<CheckoutSessionLike | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Prefill from the signed-in account once it resolves.
  useEffect(() => {
    if (props.prefillName) setName((c) => c || props.prefillName!);
    if (props.prefillEmail) setEmail((c) => c || props.prefillEmail!);
    if (props.prefillPhone) setPhone((c) => c || props.prefillPhone!);
  }, [props.prefillName, props.prefillEmail, props.prefillPhone]);

  const composeAddress = () => {
    const line = [
      street.trim(),
      apt.trim(),
      [city.trim(), region.trim()].filter(Boolean).join(", "),
      [postal.trim(), country.trim()].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    const withCompany = company.trim() ? `${company.trim()} — ${line}` : line;
    return withCompany.trim() || null;
  };

  const startCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !EMAIL_RE.test(email.trim())) {
      addToast({ title: "Add your name and a valid email", color: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSession({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        shippingAddress: composeAddress(),
        notes: notes.trim() || null,
        items: items.map((i) => ({
          productId: i.productId,
          productCatalogVariantId: i.productCatalogVariantId ?? null,
          quantity: i.quantity,
          setupFee: i.setupFee ?? 0,
        })),
      });
      if (res.testMode) {
        await confirm(res.orderId, "TEST");
        onCleared();
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

  const backLink = (
    <Link
      href={backHref}
      className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> {backLabel}
    </Link>
  );

  // ── Terminal / gate states ──────────────────────────────────────────────
  if (done) {
    return (
      <div className="bg-muted/20">
        <div className="mx-auto max-w-md px-6 py-16">
          <div className="rounded-2xl border border-success/30 bg-card p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-4 font-display text-2xl font-bold">Payment complete</h1>
            <p className="mt-2 text-muted-foreground">Thanks for your order — a receipt was emailed to you.</p>
            <Link
              href={browseHref}
              className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              style={primaryStyle}
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="bg-muted/20">
        <div className="mx-auto max-w-md px-6 py-16">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Lock className="mx-auto size-9 text-muted-foreground" />
            <h1 className="mt-4 font-display text-xl font-bold">Sign in to check out</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please sign in to complete your purchase.</p>
            <Link
              href={signInHref}
              className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              style={primaryStyle}
            >
              Sign in
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              New here?{" "}
              <Link
                href={signInHref.replace("/login", "/signup")}
                className="font-semibold text-primary hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="bg-muted/20">
        <div className="mx-auto max-w-md px-6 py-16">
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
            <PackageOpen className="mx-auto size-9 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">{emptyText ?? "Your cart is empty."}</p>
            <Link href={browseHref} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              {browseLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main checkout ────────────────────────────────────────────────────────
  return (
    <div className="bg-muted/20">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {backLink}
        <h1 className="font-display text-3xl font-bold tracking-tight">Checkout</h1>
        <p className="mt-1 text-muted-foreground">Almost there — tell us where it&apos;s going.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
          {/* Left — sections */}
          <div className="space-y-6">
            {!session ? (
              <form id="checkout-details" onSubmit={startCheckout} className="space-y-6">
                <SectionCard step={1} title="Contact">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelClass}>Full name</span>
                      <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Email</span>
                      <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                    </label>
                    <label className="block">
                      <span className={labelClass}>
                        Phone <span className="font-normal text-muted-foreground">(optional)</span>
                      </span>
                      <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className={labelClass}>
                        Company <span className="font-normal text-muted-foreground">(optional)</span>
                      </span>
                      <input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Co" />
                    </label>
                  </div>
                </SectionCard>

                <SectionCard step={2} title="Shipping address">
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-brand-soft/40 px-3.5 py-2.5 text-sm text-foreground">
                    <Truck className="size-4 text-primary" /> Ships to one address.
                  </div>
                  <div className="grid gap-4">
                    <label className="block">
                      <span className={labelClass}>Street address</span>
                      <input className={inputClass} value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main St" />
                    </label>
                    <label className="block">
                      <span className={labelClass}>
                        Apt, suite, etc. <span className="font-normal text-muted-foreground">(optional)</span>
                      </span>
                      <input className={inputClass} value={apt} onChange={(e) => setApt(e.target.value)} />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelClass}>City</span>
                        <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
                      </label>
                      <label className="block">
                        <span className={labelClass}>State / region</span>
                        <input className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)} />
                      </label>
                      <label className="block">
                        <span className={labelClass}>Postal code</span>
                        <input className={inputClass} value={postal} onChange={(e) => setPostal(e.target.value)} />
                      </label>
                      <label className="block">
                        <span className={labelClass}>Country</span>
                        <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} />
                      </label>
                    </div>
                    <label className="block">
                      <span className={labelClass}>
                        Order notes <span className="font-normal text-muted-foreground">(optional)</span>
                      </span>
                      <textarea
                        className="min-h-24 w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Deadlines, delivery instructions…"
                      />
                    </label>
                  </div>
                </SectionCard>
              </form>
            ) : (
              <SectionCard step={3} title="Payment">
                <PaymentPanel
                  session={session}
                  amount={total}
                  currency={currency}
                  primaryStyle={primaryStyle}
                  onConfirm={confirm}
                  onPaid={() => {
                    onCleared();
                    setDone(true);
                  }}
                />
              </SectionCard>
            )}
          </div>

          {/* Right — order summary */}
          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-6">
            <h3 className="font-display text-base font-bold">Order summary</h3>
            <div className="mt-4 space-y-3">
              {items.map((i) => (
                <div key={getCartItemKey(i)} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-muted-foreground">
                      {i.variantName ? `${i.variantName} · ` : ""}
                      {formatMoney(unitOf(i), i.currency)} × {i.quantity}
                    </p>
                    {i.setupFee ? (
                      <p className="text-xs text-muted-foreground">
                        + {formatMoney(i.setupFee, i.currency)} setup
                        {i.imprintMethodName ? ` · ${i.imprintMethodName}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <span className="font-medium tabular-nums">{formatMoney(lineTotal(i), i.currency)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums text-foreground">{formatMoney(total, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="font-medium text-success">Free</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(total, currency)}</span>
              </div>
            </div>

            {!session ? (
              <button
                type="submit"
                form="checkout-details"
                disabled={submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95 disabled:opacity-60"
                style={primaryStyle}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                Continue to payment
              </button>
            ) : (
              <p className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" /> Complete your card details to place the order.
              </p>
            )}

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Taxes &amp; duties calculated at fulfillment. Free proofs before anything prints.
            </p>
            <Link href={backHref} className="mt-3 block text-center text-sm font-medium text-primary hover:underline">
              {backLabel}
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Payment section ──────────────────────────────────────────────────────────
function PaymentPanel({
  session,
  amount,
  currency,
  primaryStyle,
  onConfirm,
  onPaid,
}: {
  session: CheckoutSessionLike;
  amount: number;
  currency: string;
  primaryStyle?: CSSProperties;
  onConfirm: (orderId: string, paymentIntentId: string) => Promise<unknown>;
  onPaid: () => void;
}) {
  const [method, setMethod] = useState<"card" | "bank">("card");

  if (!session.clientSecret || !session.publishableKey) {
    return <p className="text-sm text-danger">Stripe is not configured.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Payment-method selector */}
      <div>
        <span className={labelClass}>Payment method</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMethod("card")}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3.5 text-left transition",
              method === "card" ? "border-primary bg-brand-soft/40 ring-1 ring-primary/30" : "border-border hover:bg-muted/40",
            )}
          >
            <CreditCard className={cn("size-5", method === "card" ? "text-primary" : "text-muted-foreground")} />
            <span>
              <span className="block text-sm font-semibold">Credit / debit card</span>
              <span className="block text-xs text-muted-foreground">Visa, Mastercard, Amex</span>
            </span>
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-border p-3.5 text-left opacity-55"
          >
            <Landmark className="size-5 text-muted-foreground" />
            <span>
              <span className="block text-sm font-semibold">Bank transfer</span>
              <span className="block text-xs text-muted-foreground">Coming soon</span>
            </span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <Elements
          stripe={getStripe(session.publishableKey)}
          options={{ clientSecret: session.clientSecret, appearance: { theme: "stripe" } }}
        >
          <PayStep session={session} amount={amount} currency={currency} primaryStyle={primaryStyle} onConfirm={onConfirm} onPaid={onPaid} />
        </Elements>
      </div>
      <p className="text-xs text-muted-foreground">Test card: 4242 4242 4242 4242 · any future date · any CVC.</p>
    </div>
  );
}

function PayStep({
  session,
  amount,
  currency,
  primaryStyle,
  onConfirm,
  onPaid,
}: {
  session: CheckoutSessionLike;
  amount: number;
  currency: string;
  primaryStyle?: CSSProperties;
  onConfirm: (orderId: string, paymentIntentId: string) => Promise<unknown>;
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
      await onConfirm(session.orderId, paymentIntent.id);
      addToast({ title: "Payment received", color: "success" });
      onPaid();
    } catch (err: any) {
      addToast({ title: "Payment failed", description: err?.message ?? "Try again.", color: "danger" });
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement onReady={() => setReady(true)} />
      <button
        type="button"
        onClick={() => void pay()}
        disabled={!stripe || !ready || paying}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95 disabled:opacity-60"
        style={primaryStyle}
      >
        {paying ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        Place order · Pay {formatMoney(amount, currency)}
      </button>
    </div>
  );
}
