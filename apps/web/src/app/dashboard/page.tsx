"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  PackageCheck,
  Palette,
  ShoppingCart,
  Wallet
} from "lucide-react";
import { useMe } from "@/queries/auth";
import { useCatalogOrders, useCatalogOrderStats } from "@/lib/queries.catalog";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUSES, buildUserDisplayName } from "@/lib/order-flow";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

function formatCompactMoney(amount: number, currency = "USD") {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1
    }).format(amount);
  }
  return formatMoney(amount, currency);
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending review",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled"
};

const STATUS_HEX: Record<string, string> = {
  PENDING_REVIEW: "#f5a524",
  IN_REVIEW: "#2196ff",
  APPROVED: "#17c964",
  REJECTED: "#f31260",
  CANCELLED: "#a1a1aa"
};

type AccentColor = "emerald" | "blue" | "amber" | "violet" | "rose" | "sky";

const ACCENT: Record<AccentColor, { soft: string; text: string; bar: string }> = {
  emerald: { soft: "bg-emerald-500/10", text: "text-emerald-600", bar: "bg-emerald-500" },
  blue: { soft: "bg-blue-500/10", text: "text-blue-600", bar: "bg-blue-500" },
  amber: { soft: "bg-amber-500/10", text: "text-amber-600", bar: "bg-amber-500" },
  violet: { soft: "bg-violet-500/10", text: "text-violet-600", bar: "bg-violet-500" },
  rose: { soft: "bg-rose-500/10", text: "text-rose-600", bar: "bg-rose-500" },
  sky: { soft: "bg-sky-500/10", text: "text-sky-600", bar: "bg-sky-500" }
};

function DonutChart({
  segments,
  total
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
}) {
  const radius = 56;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <svg viewBox="0 0 150 150" className="h-full w-full -rotate-90">
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-default-100"
            strokeWidth={stroke}
          />
          {total > 0 &&
            segments.map((seg) => {
              if (seg.value <= 0) return null;
              const fraction = seg.value / total;
              const dash = fraction * circumference;
              const circle = (
                <circle
                  key={seg.label}
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += dash;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none">{total}</span>
          <span className="text-xs text-foreground/55">orders</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: seg.color }} />
            <span className="min-w-0 flex-1 truncate text-foreground/70">{seg.label}</span>
            <span className="font-semibold">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChip({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return (
      <Chip size="sm" variant="flat" className="text-foreground/60">
        New
      </Chip>
    );
  }

  const positive = value >= 0;
  return (
    <Chip
      size="sm"
      variant="flat"
      color={positive ? "success" : "danger"}
      startContent={
        positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />
      }
    >
      {positive ? "+" : ""}
      {value.toFixed(0)}%
    </Chip>
  );
}

function StatCard({
  label,
  value,
  icon,
  trend,
  hint,
  color = "blue"
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: number | null;
  hint?: string;
  color?: AccentColor;
}) {
  const accent = ACCENT[color];
  return (
    <Card className="overflow-hidden border border-divider shadow-sm transition-shadow hover:shadow-md">
      <div className={`h-1 w-full ${accent.bar}`} />
      <CardBody className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent.soft} ${accent.text}`}
          >
            {icon}
          </div>
          {trend !== undefined && <TrendChip value={trend} />}
        </div>
        <div>
          <div className="text-sm text-foreground/60">{label}</div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-foreground/50">{hint}</div>}
        </div>
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: user, isLoading } = useMe();
  const canReadOrders = hasAnyPermission(user, [
    "catalog.orders.read",
    "orders.assigned.read",
    "orders.self.read"
  ]);

  const enabled = !!user && canReadOrders;
  const { data: stats, isFetching } = useCatalogOrderStats(enabled);
  // Recent orders need the full per-order detail (totals, design state) — fetch
  // just a handful; the heavy analytics come from the lightweight stats endpoint.
  const { data: recent } = useCatalogOrders({ page: 1, pageSize: 6 }, enabled);

  // SUPER_ADMIN holds every permission (incl. orders.self.read), so a pure
  // customer is someone who has self.read but no staff/admin order access.
  const canReadAllOrders = hasPermission(user, "catalog.orders.read");
  const isAssignedTeamView = hasPermission(user, "orders.assigned.read") && !canReadAllOrders;
  const isCustomer =
    hasPermission(user, "orders.self.read") && !canReadAllOrders && !isAssignedTeamView;
  const showSales = !isCustomer;

  const recentOrders = recent?.items ?? [];
  const attention = stats?.needsAttention;
  const maxBucket = Math.max(1, ...(stats?.monthly ?? []).map((b) => b.total));

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading dashboard..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
          <div>
            <h1 className="font-jakarta text-2xl font-bold tracking-tight">
              Welcome back{user.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-sm text-foreground/60">
              {isCustomer
                ? "Track your submitted orders and approve designs as they move through the mockup flow."
                : isAssignedTeamView
                  ? "Review your assigned orders, design jobs, and shipment requests from one place."
                  : "Here's how sales and fulfillment are tracking across your store."}
            </p>
          </div>
          {isFetching && <Spinner size="sm" />}
        </div>

        {showSales ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              color="emerald"
              label="Paid revenue"
              value={formatMoney(stats?.paidRevenue ?? 0)}
              icon={<CircleDollarSign className="h-5 w-5" />}
              trend={stats?.revenueTrend ?? null}
              hint="From orders marked paid"
            />
            <StatCard
              color="blue"
              label="Total orders"
              value={String(stats?.totalOrders ?? 0)}
              icon={<ShoppingCart className="h-5 w-5" />}
              trend={stats?.ordersTrend ?? null}
              hint="All time"
            />
            <StatCard
              color="amber"
              label="Outstanding"
              value={formatMoney(stats?.outstanding ?? 0)}
              icon={<Wallet className="h-5 w-5" />}
              hint="Approved/awaiting payment"
            />
            <StatCard
              color="violet"
              label="Avg order value"
              value={formatMoney(stats?.avgOrderValue ?? 0)}
              icon={<ClipboardList className="h-5 w-5" />}
              hint="Across paid orders"
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              color="blue"
              label="My orders"
              value={String(stats?.totalOrders ?? 0)}
              icon={<ShoppingCart className="h-5 w-5" />}
            />
            <StatCard
              color="violet"
              label="In design"
              value={String(attention?.inDesign ?? 0)}
              icon={<Palette className="h-5 w-5" />}
              hint="Awaiting design approval"
            />
            <StatCard
              color="amber"
              label="Outstanding total"
              value={formatMoney(stats?.outstanding ?? 0)}
              icon={<Wallet className="h-5 w-5" />}
              hint="Awaiting payment"
            />
          </div>
        )}

        {showSales && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border border-divider shadow-sm lg:col-span-2">
              <CardHeader className="flex items-center justify-between p-6 pb-2">
                <div>
                  <div className="text-lg font-semibold">Revenue</div>
                  <div className="text-sm text-foreground/60">Paid revenue over the last 6 months</div>
                </div>
                <Chip size="sm" variant="flat" color="success">
                  {formatMoney((stats?.monthly ?? []).reduce((s, b) => s + b.total, 0))}
                </Chip>
              </CardHeader>
              <CardBody className="p-6 pt-4">
                <div className="flex h-52 items-end justify-between gap-3 sm:gap-5">
                  {(stats?.monthly ?? []).map((bucket) => {
                    const heightPct = (bucket.total / maxBucket) * 100;
                    return (
                      <div key={bucket.label} className="flex flex-1 flex-col items-center gap-2">
                        <div className="h-4 text-xs font-semibold text-foreground/70">
                          {bucket.total > 0 ? formatCompactMoney(bucket.total) : ""}
                        </div>
                        {/* Faint full-height track so empty months read as 0, not broken */}
                        <div className="flex h-full w-full max-w-[44px] items-end rounded-xl bg-default-100/70">
                          <div
                            className="w-full rounded-xl bg-gradient-to-t from-primary to-primary/60 transition-all duration-500"
                            style={{ height: `${Math.max(heightPct, bucket.total > 0 ? 6 : 0)}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium text-foreground/60">{bucket.label}</div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            <Card className="border border-divider shadow-sm">
              <CardHeader className="p-6 pb-2">
                <div className="text-lg font-semibold">Orders by status</div>
              </CardHeader>
              <CardBody className="flex items-center justify-center p-6 pt-2">
                <DonutChart
                  total={stats?.totalOrders ?? 0}
                  segments={ORDER_STATUSES.map((status) => ({
                    label: STATUS_LABELS[status],
                    value: stats?.statusCounts?.[status] ?? 0,
                    color: STATUS_HEX[status]
                  }))}
                />
              </CardBody>
            </Card>
          </div>
        )}

        {showSales && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AttentionCard
              color="amber"
              icon={<Clock className="h-5 w-5" />}
              label="Pending review"
              value={attention?.pendingReview ?? 0}
              href="/dashboard/orders"
            />
            <AttentionCard
              color="violet"
              icon={<Palette className="h-5 w-5" />}
              label="In design"
              value={attention?.inDesign ?? 0}
              href="/dashboard/designs"
            />
            <AttentionCard
              color="emerald"
              icon={<PackageCheck className="h-5 w-5" />}
              label="Ready to order"
              value={attention?.readyToOrder ?? 0}
              href="/dashboard/orders"
            />
            <AttentionCard
              color="sky"
              icon={<Wallet className="h-5 w-5" />}
              label="Awaiting payment"
              value={attention?.unpaid ?? 0}
              href="/dashboard/orders"
            />
          </div>
        )}

        <Card className="border border-divider shadow-sm">
          <CardHeader className="flex items-center justify-between p-6 pb-2">
            <div>
              <div className="text-lg font-semibold">Recent orders</div>
              <div className="text-sm text-foreground/60">
                {isCustomer
                  ? "Your latest submitted requests."
                  : isAssignedTeamView
                    ? "Latest requests currently assigned to you."
                    : "Latest requests visible to your permissions."}
              </div>
            </div>
            <Link href="/dashboard/orders" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardBody className="space-y-3 p-6 pt-3">
            {recentOrders.length ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-2xl border border-divider p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {order.project?.swagPackName || order.project?.name || `Order #${order.id}`}
                    </div>
                    <div className="text-sm text-foreground/60">
                      {showSales ? `${buildUserDisplayName(order.customer)} · ` : ""}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {showSales && (
                      <span className="text-sm font-semibold">{formatMoney(order.totalDue)}</span>
                    )}
                    <Chip
                      size="sm"
                      variant="flat"
                      color={order.paymentStatus === "PAID" ? "success" : "default"}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Chip>
                    <Chip size="sm" variant="flat" color={order.allItemsReadyToOrder ? "success" : "warning"}>
                      {order.allItemsReadyToOrder ? "Ready" : "In design"}
                    </Chip>
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-foreground/60">
                {canReadOrders
                  ? "No orders are available yet."
                  : "Your account does not have order access."}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

function AttentionCard({
  icon,
  label,
  value,
  href,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  color: AccentColor;
}) {
  const accent = ACCENT[color];
  return (
    <Link href={href}>
      <Card className="border border-divider shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardBody className="flex flex-row items-center gap-3 p-5">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent.soft} ${accent.text}`}
          >
            {icon}
          </div>
          <div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs text-foreground/60">{label}</div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
