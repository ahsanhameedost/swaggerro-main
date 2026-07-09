"use client";

import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import { ShoppingBag } from "lucide-react";
import { getSellerOrders } from "@/modules/payouts/api";
import { cn } from "@/lib/utils";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending review",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export default function SellerOrdersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["seller-orders"],
    queryFn: getSellerOrders,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading orders…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-sm text-destructive">Unable to load your store orders.</div>
    );
  }

  const { summary, orders } = data;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Store orders</h1>
        <p className="text-sm text-muted-foreground">
          Orders placed through your storefront and what you&apos;ve earned on each.
        </p>
      </div>

      {/* Summary tiles — seller sees only their own store data, never platform totals. */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Total orders" value={String(summary.totalOrders)} />
        <SummaryTile label="Paid orders" value={String(summary.paidOrders)} />
        <SummaryTile label="Your earnings (paid)" value={money(summary.earningCents)} accent />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">You earn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length ? (
                orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        SW-{String(o.orderNumber).padStart(3, "0")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{o.customerName}</div>
                      <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{o.itemCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          o.paymentStatus === "PAID"
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {o.paymentStatus === "PAID" ? "Paid" : STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {money(o.totalCents)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">
                      {money(o.sellerEarningCents)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    <ShoppingBag className="mx-auto mb-3 size-8 opacity-50" />
                    No orders through your store yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", accent && "text-primary")}>
        {value}
      </div>
    </div>
  );
}
