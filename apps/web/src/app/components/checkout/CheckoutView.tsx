"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { addToast } from "@heroui/toast";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  PackageOpen,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getCartItemKey, type BulkCartItem } from "@/lib/cart-store";
import { resolveUnitPrice } from "@/lib/catalog-pricing";
import { validateCoupon } from "@/modules/coupons/api";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useCreateRecipient, useRecipients } from "@/queries/recipients";
import { SHIPPING_COUNTRIES } from "@/modules/shipping/countries";
import type { Recipient } from "@/modules/recipients/types";

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
  couponCode?: string | null;
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
  // Store items carry a storeId; scope the coupon to that store (null for the
  // main shop). All items in one checkout belong to the same store.
  const storeId = items[0]?.storeId ?? null;

  // Coupon state — validated against the live cart before it's applied.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const discount = appliedCoupon ? Math.min(appliedCoupon.discount, total) : 0;
  const payTotal = Math.max(0, total - discount);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await validateCoupon({
        code,
        storeId,
        lines: items.map((i) => ({ productId: i.productId, lineTotal: lineTotal(i) })),
      });
      setAppliedCoupon({ code: res.code, discount: res.discountAmount });
      addToast({ title: `Coupon ${res.code} applied`, color: "success" });
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.message ?? "That coupon can't be used.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

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
  // Snapshot of the completed order for the thank-you screen (captured before the
  // cart is cleared, so the confirmation can still show the amount + track link).
  const [completed, setCompleted] = useState<{
    orderId: string;
    total: number;
    currency: string;
    count: number;
  } | null>(null);

  const finishOrder = (orderId: string) => {
    setCompleted({
      orderId,
      total: payTotal,
      currency,
      count: items.reduce((sum, i) => sum + i.quantity, 0)
    });
    onCleared();
    setDone(true);
  };

  // Saved addresses (address book) — fetched only for signed-in customers.
  const { data: savedAddresses } = useRecipients({}, authed);
  const createRecipient = useCreateRecipient();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const autoApplied = useRef(false);

  // Fill the shipping form from a saved address.
  const applyRecipient = (r: Recipient) => {
    setSelectedAddressId(r.id);
    setName([r.firstName, r.lastName].filter(Boolean).join(" ").trim());
    setCompany(r.companyName ?? "");
    if (r.phone) setPhone(r.phone);
    if (r.email) setEmail((c) => c || r.email!);
    setStreet(r.addressLine1);
    setApt(r.addressLine2 ?? "");
    setCity(r.city);
    setRegion(r.state ?? "");
    setPostal(r.postalCode);
    setCountry(r.countryName);
    setSaveAddress(false);
  };

  // Prefill from the signed-in account once it resolves.
  useEffect(() => {
    if (props.prefillName) setName((c) => c || props.prefillName!);
    if (props.prefillEmail) setEmail((c) => c || props.prefillEmail!);
    if (props.prefillPhone) setPhone((c) => c || props.prefillPhone!);
  }, [props.prefillName, props.prefillEmail, props.prefillPhone]);

  // Auto-fill the default saved address once, as long as the customer hasn't
  // already started typing a street. Picks the flagged default, else the first.
  useEffect(() => {
    if (autoApplied.current || !authed || street.trim() || !savedAddresses?.length) return;
    autoApplied.current = true;
    applyRecipient(savedAddresses.find((r) => r.isDefault) ?? savedAddresses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, savedAddresses]);

  // Persist the entered shipping address to the customer's address book. Best
  // effort — a failure here never blocks the order.
  const maybeSaveAddress = () => {
    if (!authed || !saveAddress) return;
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || "Recipient";
    const lastName = parts.slice(1).join(" ") || "—";
    const match = SHIPPING_COUNTRIES.find(
      (c) => c.name.toLowerCase() === country.trim().toLowerCase()
    );
    createRecipient.mutate(
      {
        firstName,
        lastName,
        companyName: company.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        addressLine1: street.trim(),
        addressLine2: apt.trim() || null,
        city: city.trim(),
        state: region.trim() || null,
        postalCode: postal.trim(),
        countryCode: match?.code ?? "US",
        countryName: match?.name ?? country.trim(),
        notes: null,
        isDefault: (savedAddresses?.length ?? 0) === 0,
      },
      {
        onSuccess: () => addToast({ title: "Address saved to your account", color: "success" }),
        onError: () =>
          addToast({
            title: "Order continues, but the address wasn't saved",
            description: "You can add it later from Account Settings.",
            color: "warning",
          }),
      }
    );
  };

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
    const missing: string[] = [];
    if (!name.trim()) missing.push("full name");
    if (!EMAIL_RE.test(email.trim())) missing.push("a valid email");
    if (!phone.trim()) missing.push("phone number");
    if (!street.trim()) missing.push("street address");
    if (!city.trim()) missing.push("city");
    if (!region.trim()) missing.push("state / region");
    if (!country.trim()) missing.push("country");
    if (missing.length) {
      addToast({
        title: "Please complete the required fields",
        description: `Missing: ${missing.join(", ")}.`,
        color: "warning",
      });
      return;
    }
    maybeSaveAddress();
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
        couponCode: appliedCoupon?.code ?? null,
      });
      if (res.testMode) {
        await confirm(res.orderId, "TEST");
        finishOrder(res.orderId);
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
        <div className="mx-auto max-w-lg px-6 py-16">
          <div className="relative overflow-hidden rounded-3xl border border-success/30 bg-card p-8 text-center shadow-lg sm:p-10">
            {/* soft success glow */}
            <div className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-success/10 blur-3xl" />

            <div className="relative">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/12 ring-8 ring-success/5">
                <CheckCircle2 className="size-11 text-success" />
              </div>

              <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">Thank you for your order! 🎉</h1>
              <p className="mt-2 text-muted-foreground">
                Your payment went through and a receipt is on its way to your inbox.
              </p>

              {completed ? (
                <div className="mx-auto mt-6 w-full max-w-xs rounded-2xl border border-border bg-background p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount paid
                  </div>
                  <div className="font-display text-3xl font-bold text-success">
                    {formatMoney(completed.total, completed.currency)}
                  </div>
                  {completed.count ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {completed.count} item{completed.count === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <p className="mt-5 text-sm text-muted-foreground">
                We&apos;ll get started right away and email you as your order moves along.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                {completed ? (
                  <Link
                    href={`/track?token=${completed.orderId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95"
                    style={primaryStyle}
                  >
                    <Truck className="size-4" /> Track your order
                  </Link>
                ) : null}
                <Link
                  href={browseHref}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/40"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
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
                      <span className={labelClass}>
                        Email <span className="text-danger">*</span>
                      </span>
                      <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                    </label>
                    <label className="block">
                      <span className={labelClass}>
                        Phone <span className="text-danger">*</span>
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
                  {authed && savedAddresses && savedAddresses.length > 0 ? (
                    <div className="mb-5">
                      <span className={labelClass}>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-4 text-primary" /> Use a saved address
                        </span>
                      </span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {savedAddresses.map((r) => {
                          const active = selectedAddressId === r.id;
                          return (
                            <button
                              type="button"
                              key={r.id}
                              onClick={() => applyRecipient(r)}
                              className={cn(
                                "rounded-xl border p-3 text-left text-sm transition",
                                active
                                  ? "border-primary bg-brand-soft/40 ring-1 ring-primary/30"
                                  : "border-border hover:bg-muted/40"
                              )}
                            >
                              <span className="flex items-center gap-2 font-medium">
                                <span className="truncate">
                                  {[r.firstName, r.lastName].filter(Boolean).join(" ")}
                                </span>
                                {r.isDefault ? (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                    <Star className="size-2.5" /> Default
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {[r.addressLine1, r.city, r.postalCode].filter(Boolean).join(", ")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Or enter a new address below.
                      </p>
                    </div>
                  ) : null}
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-brand-soft/40 px-3.5 py-2.5 text-sm text-foreground">
                    <Truck className="size-4 text-primary" /> Ships to one address.
                  </div>
                  <div className="grid gap-4">
                    <label className="block">
                      <span className={labelClass}>
                        Street address <span className="text-danger">*</span>
                      </span>
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
                        <span className={labelClass}>
                          City <span className="text-danger">*</span>
                        </span>
                        <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
                      </label>
                      <label className="block">
                        <span className={labelClass}>
                          State / region <span className="text-danger">*</span>
                        </span>
                        <input className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)} />
                      </label>
                      <label className="block">
                        <span className={labelClass}>Postal code</span>
                        <input className={inputClass} value={postal} onChange={(e) => setPostal(e.target.value)} />
                      </label>
                      <label className="block">
                        <span className={labelClass}>
                          Country <span className="text-danger">*</span>
                        </span>
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
                    {authed ? (
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                          className="size-4 rounded border-input accent-[var(--primary)]"
                        />
                        Save this address to my account for next time
                      </label>
                    ) : null}
                  </div>
                </SectionCard>
              </form>
            ) : (
              <SectionCard step={3} title="Payment">
                <PaymentPanel
                  session={session}
                  amount={payTotal}
                  currency={currency}
                  primaryStyle={primaryStyle}
                  onConfirm={confirm}
                  onPaid={() => {
                    if (session) finishOrder(session.orderId);
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

            {/* Coupon code */}
            <div className="mt-4 border-t border-border pt-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl border border-success/40 bg-success/5 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-success">
                    <CheckCircle2 className="size-4" /> {appliedCoupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void applyCoupon();
                        }
                      }}
                      placeholder="Coupon code"
                      className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm uppercase outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                    />
                    <button
                      type="button"
                      onClick={() => void applyCoupon()}
                      disabled={applyingCoupon || !couponInput.trim()}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3.5 text-sm font-semibold transition hover:bg-muted/50 disabled:opacity-50"
                    >
                      {applyingCoupon ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                    </button>
                  </div>
                  {couponError ? <p className="mt-1.5 text-xs text-danger">{couponError}</p> : null}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums text-foreground">{formatMoney(total, currency)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex items-center justify-between text-success">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span className="tabular-nums">−{formatMoney(discount, currency)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="font-medium text-success">Free</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(payTotal, currency)}</span>
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
