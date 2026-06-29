"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/toast";
import { Spinner } from "@heroui/react";
import { Loader2, Wallet } from "lucide-react";
import { getSellerPayouts, updatePayoutDetails } from "@/modules/payouts/api";
import { cn } from "@/lib/utils";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring";

export default function SellerPayoutsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["seller-payouts"], queryFn: getSellerPayouts });

  const [form, setForm] = useState({
    payoutMethod: "",
    payoutBankName: "",
    payoutAccountName: "",
    payoutAccountNumber: "",
    payoutRoutingNumber: "",
    payoutDetails: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.store) {
      setForm({
        payoutMethod: data.store.payoutMethod ?? "",
        payoutBankName: data.store.payoutBankName ?? "",
        payoutAccountName: data.store.payoutAccountName ?? "",
        payoutAccountNumber: data.store.payoutAccountNumber ?? "",
        payoutRoutingNumber: data.store.payoutRoutingNumber ?? "",
        payoutDetails: data.store.payoutDetails ?? "",
      });
    }
  }, [data?.store?.id]);

  const set = (k: keyof typeof form, v: string) => setForm((c) => ({ ...c, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePayoutDetails({
        payoutMethod: form.payoutMethod || null,
        payoutBankName: form.payoutBankName || null,
        payoutAccountName: form.payoutAccountName || null,
        payoutAccountNumber: form.payoutAccountNumber || null,
        payoutRoutingNumber: form.payoutRoutingNumber || null,
        payoutDetails: form.payoutDetails || null,
      });
      await qc.invalidateQueries({ queryKey: ["seller-payouts"] });
      addToast({ title: "Payout details saved", color: "success" });
    } catch (err: any) {
      addToast({ title: "Save failed", description: err?.message ?? "", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading payouts…" />
      </div>
    );
  }
  if (isError || !data) {
    return <div className="mx-auto max-w-3xl px-6 py-10 text-muted-foreground">Could not load payouts.</div>;
  }

  const s = data.store;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Payouts</h1>
        <p className="mt-1 text-muted-foreground">Your earnings and where we send them.</p>
      </div>

      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary/30 bg-brand-soft/40 p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="size-4" /> Available balance</div>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-primary">{money(s.balanceCents)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total earned</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{money(s.earnedCents)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.paidOrders} paid order{s.paidOrders === 1 ? "" : "s"} · {s.commissionPercent}% commission</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Paid out</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{money(s.paidOutCents)}</p>
        </div>
      </div>

      {/* Payout details */}
      <form onSubmit={save} className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold">Payout details</h2>
        <p className="mt-1 text-sm text-muted-foreground">Where should we send your earnings? The admin uses these to pay you.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Method</span>
            <select className={cn(inputClass, "mt-1.5")} value={form.payoutMethod} onChange={(e) => set("payoutMethod", e.target.value)}>
              <option value="">Select…</option>
              <option value="BANK">Bank transfer</option>
              <option value="PAYPAL">PayPal</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Account holder name</span>
            <input className={cn(inputClass, "mt-1.5")} value={form.payoutAccountName} onChange={(e) => set("payoutAccountName", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Bank name</span>
            <input className={cn(inputClass, "mt-1.5")} value={form.payoutBankName} onChange={(e) => set("payoutBankName", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Account number</span>
            <input className={cn(inputClass, "mt-1.5")} value={form.payoutAccountNumber} onChange={(e) => set("payoutAccountNumber", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Routing / sort code</span>
            <input className={cn(inputClass, "mt-1.5")} value={form.payoutRoutingNumber} onChange={(e) => set("payoutRoutingNumber", e.target.value)} />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium">Other details / notes</span>
          <textarea
            className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-ring"
            rows={2}
            value={form.payoutDetails}
            onChange={(e) => set("payoutDetails", e.target.value)}
            placeholder="PayPal email, IBAN, SWIFT, etc."
          />
        </label>
        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save details
          </button>
        </div>
      </form>

      {/* History */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold">Payout history</h2>
        {data.payouts.length ? (
          <div className="mt-4 divide-y divide-border">
            {data.payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium tabular-nums">{money(p.amountCents)}</p>
                  <p className="text-xs text-muted-foreground">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}{p.note ? ` · ${p.note}` : ""}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", p.status === "PAID" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{p.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No payouts yet.</p>
        )}
      </div>
    </div>
  );
}
