"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, PackageSearch, Truck } from "lucide-react";
import {
  trackPublicOrder,
  trackPublicOrderByToken,
  type PublicOrderTracking
} from "@/modules/catalog/public/api";
import { OrderProgress } from "@/components/orders/order-progress";
import { formatDesignPhaseLabel, formatOrderNumber, formatOrderTypeLabel } from "@/lib/order-flow";
import { PageBanner } from "@/components/marketing/page-banner";

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
            <div className="mt-6 space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                    Placed {new Date(result.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  {result.paymentStatus === "PAID" ? "Paid" : "Payment pending"}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-3 text-sm font-semibold text-foreground">Progress</div>
                <OrderProgress status={result.status} productionStage={result.productionStage} />
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-foreground">Items</div>
                <div className="space-y-2">
                  {result.items.map((item, i) => (
                    <div
                      key={`${item.productName}-${i}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {item.productName} <span className="text-muted-foreground">× {item.quantity}</span>
                      </span>
                      <span className="text-muted-foreground">{formatDesignPhaseLabel(item.designPhase as never)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {result.shipments.length ? (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Truck className="size-4 text-primary" /> Shipments
                  </div>
                  <div className="space-y-2">
                    {result.shipments.map((shipment, i) => (
                      <div key={i} className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
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
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
