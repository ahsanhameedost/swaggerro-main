"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, MapPin, PackageSearch, Truck } from "lucide-react";
import {
  trackPublicOrder,
  trackPublicOrderByToken,
  type PublicOrderTracking
} from "@/modules/catalog/public/api";
import { OrderProgress } from "@/components/orders/order-progress";
import { formatDesignPhaseLabel, formatOrderNumber, formatOrderTypeLabel } from "@/lib/order-flow";
import { PageBanner } from "@/components/marketing/page-banner";

// A short "what happens next" line for the current stage, so the tracker reads
// like a status page rather than an empty checklist.
function nextStepHint(status: string, productionStage: string | null): string | null {
  if (status === "CANCELLED" || status === "REJECTED") return null;
  if (productionStage === "SHIPPED") return "Your order has shipped — follow your package with the tracking below.";
  if (productionStage === "IN_PRODUCTION")
    return "Your order is in production. We'll email you the moment it ships.";
  if (status === "APPROVED" || productionStage === "READY_FOR_PRODUCTION")
    return "Approved! Your order is queued and will move into production shortly.";
  if (status === "IN_REVIEW")
    return "Your designs are ready to review — check your email to approve your mockups.";
  return "Our team is reviewing your project and preparing your mockups and a quote. We'll be in touch within 24–48 hours.";
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicOrderTracking | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);

  // Direct email "magic link": /track?token=<orderId> loads the order straight
  // away — the customer never has to type an order number or email.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;
    setAutoLoading(true);
    setError(null);
    trackPublicOrderByToken(token)
      .then(({ tracking }) => setResult(tracking))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "This tracking link is invalid or expired.")
      )
      .finally(() => setAutoLoading(false));
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError("Enter your order number and email.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { tracking } = await trackPublicOrder(orderNumber.trim(), email.trim());
      setResult(tracking);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't find that order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageBanner
        title="Track your order"
        subtitle="Enter your order number and email to see where your order is."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Track order" }]}
      />
      <div className="swag-redesign container py-10 lg:py-14">
        <div className="mx-auto max-w-4xl">
          {autoLoading ? (
            <div className="mx-auto flex max-w-2xl items-center justify-center gap-3 rounded-3xl border border-border bg-card p-10 text-sm text-muted-foreground shadow-sm">
              <Loader2 className="size-5 animate-spin text-primary" /> Loading your order…
            </div>
          ) : (
          <form
            onSubmit={onSubmit}
            className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Order number</label>
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="SW-044"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-ring"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white disabled:opacity-50"
              style={{ backgroundImage: "var(--primary-gradient)" }}
            >
              <PackageSearch className="size-4" /> {loading ? "Searching…" : "Track order"}
            </button>

            {error ? <p className="mt-3 text-center text-sm text-danger">{error}</p> : null}
          </form>
          )}

          {result ? (
            (() => {
              const totalUnits = result.items.reduce((sum, it) => sum + it.quantity, 0);
              const hint = nextStepHint(result.status, result.productionStage);
              return (
                <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-2xl font-bold">
                          Order# {formatOrderNumber(result.orderNumber)}
                        </span>
                        <span className="rounded-full border border-primary/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
                          {formatOrderTypeLabel(result.type)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {result.projectName
                          ? `${result.projectName.replace(/\s*catalog order\s*$/i, "").trim()} · `
                          : ""}
                        Placed{" "}
                        {new Date(result.createdAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                      {result.paymentStatus === "PAID" ? "Paid" : "Payment pending"}
                    </span>
                  </div>

                  {hint ? (
                    <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-brand-soft/40 px-4 py-3 text-sm text-foreground">
                      <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{hint}</span>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
                      <div className="mb-4 text-sm font-semibold text-foreground">Progress</div>
                      <OrderProgress
                        status={result.status}
                        productionStage={result.productionStage}
                        timestamps={result.stageTimestamps}
                      />
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">Items</span>
                          <span className="text-xs text-muted-foreground">
                            {result.items.length} product{result.items.length === 1 ? "" : "s"} ·{" "}
                            {totalUnits} unit{totalUnits === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {result.items.map((item, i) => (
                            <div
                              key={`${item.productName}-${i}`}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
                            >
                              <span className="min-w-0 truncate font-medium text-foreground">
                                {item.productName}{" "}
                                <span className="text-muted-foreground">× {item.quantity}</span>
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatDesignPhaseLabel(item.designPhase as never)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {result.shipments.length ? (
                        <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
                          <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <Truck className="size-4 text-primary" /> Shipments
                          </div>
                          <div className="space-y-2">
                            {result.shipments.map((shipment, i) => (
                              <div key={i} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                                    <MapPin className="size-3.5 text-muted-foreground" />
                                    {shipment.destinationCountryName}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {shipment.status.replace(/_/g, " ").toLowerCase()}
                                  </span>
                                </div>
                                {shipment.trackingNumber ? (
                                  <div className="mt-1.5 text-xs text-muted-foreground">
                                    {shipment.carrier ? `${shipment.carrier} · ` : ""}
                                    {shipment.trackingUrl ? (
                                      <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                                        {shipment.trackingNumber}
                                      </a>
                                    ) : (
                                      shipment.trackingNumber
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Truck className="size-3.5" /> Shipment details appear here once your order ships.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}
        </div>
      </div>
    </>
  );
}
