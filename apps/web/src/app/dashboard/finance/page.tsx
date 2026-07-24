"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import {
  Banknote,
  Building2,
  CircleDollarSign,
  Coins,
  Download,
  Landmark,
  PiggyBank,
  Receipt,
  Search,
  ShoppingBag,
  Store,
  TrendingUp
} from "lucide-react";
import { useMe } from "@/queries/auth";
import { useCatalogOrderStats } from "@/lib/queries.catalog";
import {
  channelReportExportPath,
  getChannelReport,
  getRevenueReport
} from "@/modules/catalog/orders/api";
import type { ChannelKey, RevenueReportGranularity } from "@/modules/catalog/orders/types";
import { downloadApiFile } from "@/lib/download";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import {
  adminListPayoutStores,
  adminPayStore,
  adminSetCommission,
  type AdminStoreRow
} from "@/modules/payouts/api";

// All seller ledger figures come from the API in integer cents; revenue figures
// from the order-stats endpoint are already in dollars. Convert cents once here
// so every calculation on this page works in dollars and stays exact.
const fromCents = (cents: number) => cents / 100;

type Accent ="emerald" | "amber" | "violet" | "sky" | "rose" | "slate";

const ACCENT: Record<Accent, string> = {
  emerald: "bg-gradient-to-br from-emerald-400 to-emerald-600",
  amber: "bg-gradient-to-br from-amber-400 to-amber-600",
  violet: "bg-gradient-to-br from-violet-400 to-violet-600",
  sky: "bg-gradient-to-br from-sky-400 to-sky-600",
  rose: "bg-gradient-to-br from-rose-400 to-rose-600",
  slate: "bg-gradient-to-br from-slate-400 to-slate-600"
};

const CHANNEL_META: {
  key: ChannelKey;
  label: string;
  sub: string;
  accent: Accent;
  who: string;
  icon: React.ReactNode;
}[] = [
  { key: "B2C", label: "B2C — Direct shop", sub: "Pay-now storefront", accent: "sky", who: "customers", icon: <ShoppingBag className="h-5 w-5" /> },
  { key: "B2B", label: "B2B — Bulk & quotes", sub: "Project submissions", accent: "violet", who: "customers", icon: <Building2 className="h-5 w-5" /> },
  { key: "SELLER", label: "Seller — Marketplace", sub: "White-label stores", accent: "emerald", who: "stores", icon: <Store className="h-5 w-5" /> }
];

function StatCard({
  label,
  value,
  hint,
  icon,
  accent
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: Accent;
}) {
  return (
    <Card className="border border-divider shadow-sm">
      <CardBody className="space-y-3 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm ${ACCENT[accent]}`}>
          {icon}
        </div>
        <div>
          <div className="text-sm text-foreground/60">{label}</div>
          <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
          {hint ? <div className="mt-1 text-xs text-foreground/50">{hint}</div> : null}
        </div>
      </CardBody>
    </Card>
  );
}

export default function FinancePage() {
  const { data: me } = useMe();
  const perms = me?.permissions ?? [];
  const canReadRevenue = perms.includes("catalog.orders.read");
  const canReadStores = perms.includes("partners.stores.read");
  const canWrite = perms.includes("partners.stores.write");
  const allowed = canReadRevenue && canReadStores;

  const qc = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useCatalogOrderStats(canReadRevenue);
  const { data: storeData, isLoading: storesLoading } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: adminListPayoutStores,
    enabled: canReadStores
  });

  const stores = useMemo(() => storeData?.stores ?? [], [storeData]);

  // Seller-side accounting — summed straight from each store's ledger so the
  // totals reconcile exactly with the per-store rows below.
  const totals = useMemo(() => {
    const earnedCents = stores.reduce((s, st) => s + st.earnedCents, 0);
    const paidCents = stores.reduce((s, st) => s + st.paidOutCents, 0);
    const balanceCents = stores.reduce((s, st) => s + st.balanceCents, 0);
    return {
      earned: fromCents(earnedCents),
      paid: fromCents(paidCents),
      balance: fromCents(balanceCents)
    };
  }, [stores]);

  const paidRevenue = stats?.paidRevenue ?? 0;
  const paidCost = stats?.paidCost ?? 0;
  const grossProfit = stats?.grossProfit ?? paidRevenue - paidCost;
  const margin = paidRevenue > 0 ? (grossProfit / paidRevenue) * 100 : 0;
  const outstanding = stats?.outstanding ?? 0;
  // Bottom line: gross profit (after COGS) minus what we owe sellers as commission.
  const platformNet = grossProfit - totals.earned;

  // ── Period-wise report (day / week / month) ─────────────────────────────
  const [granularity, setGranularity] = useState<RevenueReportGranularity>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: report, isFetching: reportLoading } = useQuery({
    queryKey: ["revenue-report", granularity, from, to],
    queryFn: () => getRevenueReport({ granularity, from: from || undefined, to: to || undefined }),
    enabled: canReadRevenue
  });
  const reportBuckets = report?.buckets ?? [];
  const maxReportRevenue = Math.max(1, ...reportBuckets.map((b) => b.revenue));

  // ── Revenue by channel (B2C / B2B / Seller) ─────────────────────────────
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey | null>(null);
  const [channelSearch, setChannelSearch] = useState("");
  const { data: channelReport, isFetching: channelLoading } = useQuery({
    queryKey: ["channel-report", from, to, selectedChannel, channelSearch],
    queryFn: () =>
      getChannelReport({
        from: from || undefined,
        to: to || undefined,
        channel: selectedChannel ?? undefined,
        search: channelSearch || undefined
      }),
    enabled: canReadRevenue,
    placeholderData: keepPreviousData
  });
  const channelRows = channelReport?.rows ?? [];
  const handleChannelExport = () =>
    void downloadApiFile(
      channelReportExportPath({
        from: from || undefined,
        to: to || undefined,
        channel: selectedChannel ?? undefined,
        search: channelSearch || undefined
      }),
      `revenue-${(selectedChannel ?? "all").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`
    );

  // ── Management: commission + payouts ────────────────────────────────────
  const [commissionEdits, setCommissionEdits] = useState<Record<string, string>>({});
  const [payTarget, setPayTarget] = useState<AdminStoreRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const saveCommission = async (store: AdminStoreRow) => {
    const value = Number(commissionEdits[store.id]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      addToast({ title: "Enter a commission between 0 and 100", color: "warning" });
      return;
    }
    try {
      await adminSetCommission(store.id, value);
      await qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      addToast({ title: "Commission updated", color: "success" });
      setCommissionEdits((c) => {
        const n = { ...c };
        delete n[store.id];
        return n;
      });
    } catch (err: any) {
      addToast({ title: "Update failed", description: err?.message ?? "", color: "danger" });
    }
  };

  const submitPay = async () => {
    if (!payTarget) return;
    const amountCents = payAmount ? Math.round(Number(payAmount) * 100) : undefined;
    if (amountCents != null && (!Number.isFinite(amountCents) || amountCents <= 0)) {
      addToast({ title: "Enter a valid amount", color: "warning" });
      return;
    }
    if (amountCents != null && amountCents > payTarget.balanceCents) {
      addToast({ title: "Amount exceeds the outstanding balance", color: "warning" });
      return;
    }
    setBusy(true);
    try {
      await adminPayStore(payTarget.id, { amountCents, note: note || null });
      await qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      addToast({ title: "Payout recorded", description: `Marked as paid to ${payTarget.name}.`, color: "success" });
      setPayTarget(null);
      setPayAmount("");
      setNote("");
    } catch (err: any) {
      addToast({ title: "Payout failed", description: err?.message ?? "", color: "danger" });
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <Card className="border border-divider shadow-sm">
        <CardBody className="p-6 text-sm text-foreground/70">
          You do not have permission to view Finance.
        </CardBody>
      </Card>
    );
  }

  const loading = statsLoading || storesLoading;

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-row items-center gap-3 p-6">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Landmark className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
            <p className="text-sm text-foreground/60">
              Platform revenue, seller commissions, and payout accounting — all in one place.
            </p>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading finance data..." />
        </div>
      ) : (
        <>
          {/* P&L KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              accent="emerald"
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Gross revenue (paid)"
              value={formatMoney(paidRevenue)}
              hint={`${stats?.paidOrdersCount ?? 0} paid orders · ${formatMoney(outstanding)} outstanding`}
            />
            <StatCard
              accent="amber"
              icon={<Receipt className="h-5 w-5" />}
              label="Cost of goods (COGS)"
              value={formatMoney(paidCost)}
              hint="Product cost on paid orders"
            />
            <StatCard
              accent="violet"
              icon={<TrendingUp className="h-5 w-5" />}
              label="Gross profit"
              value={formatMoney(grossProfit)}
              hint={`${margin.toFixed(1)}% margin · revenue − COGS`}
            />
            <StatCard
              accent="sky"
              icon={<Coins className="h-5 w-5" />}
              label="Seller commissions"
              value={formatMoney(totals.earned)}
              hint="Total earned by all sellers"
            />
            <StatCard
              accent="slate"
              icon={<PiggyBank className="h-5 w-5" />}
              label="Platform net"
              value={formatMoney(platformNet)}
              hint="After COGS & seller commissions"
            />
            <StatCard
              accent="rose"
              icon={<Banknote className="h-5 w-5" />}
              label="Owed to sellers"
              value={formatMoney(totals.balance)}
              hint={`${formatMoney(totals.paid)} already paid`}
            />
          </div>

          {/* Revenue by channel */}
          <Card className="border border-divider shadow-sm">
            <CardHeader className="flex flex-col items-start gap-1 p-6 pb-2">
              <div className="text-lg font-semibold">Revenue by channel</div>
              <div className="text-sm text-foreground/60">
                Paid revenue split across B2C, B2B and Seller flows
                {from || to ? " for the selected range" : " (all time)"}. Click a channel to
                drill into customers.
              </div>
            </CardHeader>
            <CardBody className="space-y-5 p-6 pt-3">
              <div className="grid gap-4 sm:grid-cols-3">
                {CHANNEL_META.map((meta) => {
                  const c = channelReport?.channels.find((x) => x.channel === meta.key);
                  const active = selectedChannel === meta.key;
                  return (
                    <button
                      key={meta.key}
                      type="button"
                      onClick={() => setSelectedChannel(active ? null : meta.key)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition",
                        active
                          ? "border-primary bg-brand-soft/40 ring-1 ring-primary/25"
                          : "border-divider hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${ACCENT[meta.accent]}`}>
                          {meta.icon}
                        </div>
                        <span className="text-right text-[11px] leading-tight text-foreground/50">
                          {c?.orders ?? 0} orders
                          <br />
                          {c?.buyers ?? 0} {meta.who}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-foreground/60">{meta.label}</div>
                      <div className="text-2xl font-bold tabular-nums">{formatMoney(c?.revenue ?? 0)}</div>
                      <div className="mt-1 text-xs font-medium text-primary">
                        {active ? "Hide details" : "View details →"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedChannel ? (
                <div className="space-y-3 rounded-2xl border border-divider p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold">
                      {CHANNEL_META.find((m) => m.key === selectedChannel)?.label} —{" "}
                      {selectedChannel === "SELLER" ? "stores" : "customers"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        size="sm"
                        placeholder="Search name, email, order #"
                        value={channelSearch}
                        onValueChange={setChannelSearch}
                        startContent={<Search className="size-4 text-foreground/40" />}
                        className="w-64"
                      />
                      <Button
                        size="sm"
                        variant="bordered"
                        startContent={<Download className="size-4" />}
                        onPress={handleChannelExport}
                      >
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  {channelLoading && !channelRows.length ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="sm" label="Loading…" />
                    </div>
                  ) : channelRows.length ? (
                    <Table removeWrapper aria-label="Channel customer breakdown">
                      <TableHeader>
                        <TableColumn>{selectedChannel === "SELLER" ? "Store" : "Customer"}</TableColumn>
                        <TableColumn>Email / Company</TableColumn>
                        <TableColumn className="text-right">Orders</TableColumn>
                        <TableColumn className="text-right">Revenue</TableColumn>
                        <TableColumn className="text-right">Last order</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {channelRows.map((r) => (
                          <TableRow key={r.key}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell className="text-foreground/60">
                              {r.email || r.company || "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{r.orders}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatMoney(r.revenue)}
                            </TableCell>
                            <TableCell className="text-right text-foreground/60">
                              {new Date(r.lastOrderAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center text-sm text-foreground/50">
                      No paid orders in this channel for the selected filters.
                    </div>
                  )}
                </div>
              ) : null}
            </CardBody>
          </Card>

          {/* Period-wise report */}
          <Card className="border border-divider shadow-sm">
            <CardHeader className="flex flex-col gap-4 p-6 pb-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-lg font-semibold">Revenue &amp; profit report</div>
                <div className="text-sm text-foreground/60">Break revenue, cost, and profit down by period.</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-xl border border-divider p-0.5">
                  {(["day", "week", "month"] as RevenueReportGranularity[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGranularity(g)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition",
                        granularity === g ? "bg-primary text-white" : "text-foreground/60 hover:text-foreground"
                      ].join(" ")}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <Input
                  type="date"
                  size="sm"
                  aria-label="From date"
                  value={from}
                  onValueChange={setFrom}
                  className="w-40"
                />
                <Input
                  type="date"
                  size="sm"
                  aria-label="To date"
                  value={to}
                  onValueChange={setTo}
                  className="w-40"
                />
                {from || to ? (
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setFrom("");
                      setTo("");
                    }}
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardBody className="space-y-5 p-6 pt-2">
              {/* Totals for the selected window */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Revenue", value: report?.totals.revenue ?? 0, cls: "text-foreground" },
                  { label: "Cost", value: report?.totals.cost ?? 0, cls: "text-amber-600" },
                  { label: "Profit", value: report?.totals.profit ?? 0, cls: "text-emerald-600" },
                  { label: "Orders", value: report?.totals.orders ?? 0, cls: "text-foreground", raw: true }
                ].map((t) => (
                  <div key={t.label} className="rounded-2xl border border-divider bg-default-50 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-foreground/45">{t.label}</div>
                    <div className={`text-lg font-bold tabular-nums ${t.cls}`}>
                      {t.raw ? t.value : formatMoney(t.value as number)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue bars per period */}
              {reportLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Spinner size="sm" />
                </div>
              ) : reportBuckets.length ? (
                <div className="flex h-44 items-stretch gap-2 overflow-x-auto pb-1">
                  {reportBuckets.map((b) => {
                    const heightPct = (b.revenue / maxReportRevenue) * 100;
                    return (
                      <div
                        key={b.key}
                        className="group flex h-full min-w-[36px] flex-1 flex-col items-center justify-end gap-1.5"
                        title={`${b.label} — Revenue ${formatMoney(b.revenue)} · Cost ${formatMoney(b.cost)} · Profit ${formatMoney(b.profit)} · ${b.orders} orders`}
                      >
                        <div className="flex w-full max-w-[40px] flex-1 items-end rounded-lg bg-default-100/70">
                          <div
                            className="w-full rounded-lg bg-gradient-to-t from-primary to-primary/60 transition-all group-hover:to-primary/80"
                            style={{ height: `${Math.max(heightPct, b.revenue > 0 ? 6 : 0)}%` }}
                          />
                        </div>
                        <div className="w-full truncate text-center text-[10px] font-medium text-foreground/55">
                          {b.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-foreground/60">No paid orders in this range.</div>
              )}

              {/* Detailed breakdown */}
              {reportBuckets.length ? (
                <Table removeWrapper aria-label="Revenue report">
                  <TableHeader>
                    <TableColumn>Period</TableColumn>
                    <TableColumn>Revenue</TableColumn>
                    <TableColumn>Cost</TableColumn>
                    <TableColumn>Profit</TableColumn>
                    <TableColumn>Margin</TableColumn>
                    <TableColumn>Orders</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {reportBuckets.map((b) => (
                      <TableRow key={b.key}>
                        <TableCell className="font-medium">{b.label}</TableCell>
                        <TableCell className="tabular-nums">{formatMoney(b.revenue)}</TableCell>
                        <TableCell className="tabular-nums text-amber-600">{formatMoney(b.cost)}</TableCell>
                        <TableCell className="tabular-nums font-semibold text-emerald-600">
                          {formatMoney(b.profit)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {b.revenue > 0 ? `${((b.profit / b.revenue) * 100).toFixed(1)}%` : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">{b.orders}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardBody>
          </Card>

          {/* Seller accounting + payout management */}
          <Card className="border border-divider shadow-sm">
            <CardHeader className="flex items-center justify-between p-6 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-foreground/70" />
                <div>
                  <div className="text-lg font-semibold">Seller accounting</div>
                  <div className="text-sm text-foreground/60">
                    Each store&apos;s commission, earnings, and what you owe. Edit the rate or record a payout.
                  </div>
                </div>
              </div>
              <Chip size="sm" variant="flat">
                {stores.length} store{stores.length === 1 ? "" : "s"}
              </Chip>
            </CardHeader>
            <CardBody className="p-0">
              <Table removeWrapper aria-label="Seller accounting">
                <TableHeader>
                  <TableColumn>Store</TableColumn>
                  <TableColumn>Commission %</TableColumn>
                  <TableColumn>Earned</TableColumn>
                  <TableColumn>Paid out</TableColumn>
                  <TableColumn>Balance</TableColumn>
                  <TableColumn>Payout details</TableColumn>
                  <TableColumn>{canWrite ? "Action" : ""}</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No stores yet.">
                  {stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div className="font-medium">{store.name}</div>
                        <div className="text-xs text-foreground/50">{store.owner?.email ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            size="sm"
                            className="w-20"
                            value={commissionEdits[store.id] ?? String(store.commissionPercent)}
                            onValueChange={(v) => setCommissionEdits((c) => ({ ...c, [store.id]: v }))}
                            isDisabled={!canWrite}
                            endContent={<span className="text-xs text-foreground/50">%</span>}
                          />
                          {canWrite &&
                          commissionEdits[store.id] != null &&
                          commissionEdits[store.id] !== String(store.commissionPercent) ? (
                            <Button size="sm" variant="flat" onPress={() => saveCommission(store)}>
                              Save
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatMoney(fromCents(store.earnedCents))}</TableCell>
                      <TableCell className="tabular-nums">{formatMoney(fromCents(store.paidOutCents))}</TableCell>
                      <TableCell>
                        <span className="font-semibold tabular-nums text-primary">
                          {formatMoney(fromCents(store.balanceCents))}
                        </span>
                      </TableCell>
                      <TableCell>
                        {store.hasDetails ? (
                          <Chip size="sm" color="success" variant="flat">
                            On file
                          </Chip>
                        ) : (
                          <Chip size="sm" variant="flat">
                            Missing
                          </Chip>
                        )}
                      </TableCell>
                      <TableCell>
                        {canWrite ? (
                          <Button
                            size="sm"
                            color="primary"
                            isDisabled={store.balanceCents <= 0}
                            onPress={() => {
                              setPayTarget(store);
                              setPayAmount((store.balanceCents / 100).toFixed(2));
                              setNote("");
                            }}
                          >
                            Pay
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}

      {/* Record payout modal */}
      <Modal isOpen={!!payTarget} onClose={() => setPayTarget(null)}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Record payout
            <span className="text-sm font-normal text-foreground/60">{payTarget?.name}</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-foreground/60">
              Outstanding balance: <strong>{payTarget ? formatMoney(fromCents(payTarget.balanceCents)) : ""}</strong>.
              Record what you&apos;re sending — it settles against their balance.
            </p>
            {payTarget && !payTarget.hasDetails ? (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                This seller hasn&apos;t added payout details yet.
              </p>
            ) : null}
            {payTarget?.payoutDetails || payTarget?.payoutAccountNumber ? (
              <div className="rounded-xl border border-divider bg-content2 p-3 text-xs text-foreground/70">
                {payTarget.payoutMethod ? <div>Method: {payTarget.payoutMethod}</div> : null}
                {payTarget.payoutBankName ? <div>Bank: {payTarget.payoutBankName}</div> : null}
                {payTarget.payoutAccountName ? <div>Name: {payTarget.payoutAccountName}</div> : null}
                {payTarget.payoutAccountNumber ? <div>Account: {payTarget.payoutAccountNumber}</div> : null}
                {payTarget.payoutRoutingNumber ? <div>Routing: {payTarget.payoutRoutingNumber}</div> : null}
                {payTarget.payoutDetails ? <div>Notes: {payTarget.payoutDetails}</div> : null}
              </div>
            ) : null}
            <Input
              type="number"
              label="Amount (USD)"
              value={payAmount}
              onValueChange={setPayAmount}
              startContent={<span className="text-foreground/50">$</span>}
            />
            <Input label="Note (optional)" value={note} onValueChange={setNote} placeholder="Transfer reference" />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setPayTarget(null)}>
              Cancel
            </Button>
            <Button color="primary" isLoading={busy} onPress={submitPay}>
              Record payout
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
