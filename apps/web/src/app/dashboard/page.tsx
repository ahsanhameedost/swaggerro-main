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
  Store,
  Wallet
} from "lucide-react";
import { useMe } from "@/queries/auth";
import { useCatalogOrders, useCatalogOrderStats } from "@/lib/queries.catalog";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUSES, buildUserDisplayName, formatOrderDisplayName, formatOrderNumber } from "@/lib/order-flow";
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

// Each accent drives a soft gradient icon tile plus a matching hover border so
// the cards read as one system across every role's dashboard view.
const ACCENT: Record<AccentColor, { icon: string; hover: string }> = {
  emerald: {
    icon: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    hover: "hover:border-emerald-400/60"
  },
  blue: {
    icon: "bg-gradient-to-br from-blue-400 to-blue-600",
    hover: "hover:border-blue-400/60"
  },
  amber: {
    icon: "bg-gradient-to-br from-amber-400 to-amber-600",
    hover: "hover:border-amber-400/60"
  },
  violet: {
    icon: "bg-gradient-to-br from-violet-400 to-violet-600",
    hover: "hover:border-violet-400/60"
  },
  rose: {
    icon: "bg-gradient-to-br from-rose-400 to-rose-600",
    hover: "hover:border-rose-400/60"
  },
  sky: {
    icon: "bg-gradient-to-br from-sky-400 to-sky-600",
    hover: "hover:border-sky-400/60"
  }
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
  color = "blue",
  href
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: number | null;
  hint?: string;
  color?: AccentColor;
  href?: string;
}) {
  const accent = ACCENT[color];
  const card = (
    <Card
      className={[
        "group relative h-full overflow-hidden border border-divider shadow-sm transition-all duration-200",
        accent.hover,
        href ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg" : "hover:shadow-md"
      ].join(" ")}
    >
      <CardBody className="space-y-3 p-5">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm ${accent.icon}`}
          >
            {icon}
          </div>
          {trend !== undefined ? (
            <TrendChip value={trend} />
          ) : href ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-default-100 text-foreground/40 transition-all group-hover:bg-default-200 group-hover:text-foreground/70">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          ) : null}
        </div>
        <div>
          <div className="text-sm text-foreground/60">{label}</div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-foreground/50">{hint}</div>}
        </div>
      </CardBody>
    </Card>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
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
  // Revenue/sales widgets require true all-orders access. Assigned-team users
  // (e.g. Designers) and customers must never see platform revenue figures.
  const showSales = canReadAllOrders;

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
              {showSales
                ? "Here's how sales and fulfillment are tracking across your store."
                : isAssignedTeamView
                  ? "Track the orders assigned to you and keep every design job moving."
                  : isCustomer
                    ? "Track your submitted orders and approve designs as they move through the mockup flow."
                    : "Manage your store, products, and payouts from your seller dashboard."}
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
              href="/dashboard/orders"
            />
            <StatCard
              color="blue"
              label="Total orders"
              value={String(stats?.totalOrders ?? 0)}
              icon={<ShoppingCart className="h-5 w-5" />}
              trend={stats?.ordersTrend ?? null}
              hint="All time"
              href="/dashboard/orders"
            />
            <StatCard
              color="amber"
              label="Outstanding"
              value={formatMoney(stats?.outstanding ?? 0)}
              icon={<Wallet className="h-5 w-5" />}
              hint="Approved/awaiting payment"
              href="/dashboard/orders?status=APPROVED"
            />
            <StatCard
              color="violet"
              label="Avg order value"
              value={formatMoney(stats?.avgOrderValue ?? 0)}
              icon={<ClipboardList className="h-5 w-5" />}
              hint="Across paid orders"
              href="/dashboard/orders"
            />
          </div>
        ) : isAssignedTeamView ? (
          // Designer / assigned-team view — design work only, no order/revenue stats.
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              color="violet"
              label="In design"
              value={String(attention?.inDesign ?? 0)}
              icon={<Palette className="h-5 w-5" />}
              hint="Currently working"
              href="/dashboard/designs"
            />
            <StatCard
              color="emerald"
              label="Ready to deliver"
              value={String(attention?.readyToOrder ?? 0)}
              icon={<PackageCheck className="h-5 w-5" />}
              hint="Designs completed"
              href="/dashboard/designs"
            />
          </div>
        ) : isCustomer ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              color="blue"
              label="My orders"
              value={String(stats?.totalOrders ?? 0)}
              icon={<ShoppingCart className="h-5 w-5" />}
              hint="Submitted requests"
              href="/dashboard/orders"
            />
            <StatCard
              color="violet"
              label="In design"
              value={String(attention?.inDesign ?? 0)}
              icon={<Palette className="h-5 w-5" />}
              hint="Awaiting your approval"
              href="/dashboard/designs"
            />
            <StatCard
              color="emerald"
              label="Total spent"
              value={formatMoney(stats?.paidRevenue ?? 0)}
              icon={<CircleDollarSign className="h-5 w-5" />}
              hint="Across paid orders"
              href="/dashboard/orders"
            />
            <StatCard
              color="amber"
              label="Outstanding total"
              value={formatMoney(stats?.outstanding ?? 0)}
              icon={<Wallet className="h-5 w-5" />}
              hint="Awaiting payment"
              href="/dashboard/orders?status=APPROVED"
            />
          </div>
        ) : (
          // Seller (or any role without order access) — point them to their store.
          <Card className="border border-divider shadow-sm">
            <CardBody className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-sm">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Your store dashboard</div>
                  <div className="text-sm text-foreground/60">
                    Manage products, orders, and payouts for your white-label store.
                  </div>
                </div>
              </div>
              <Link
                href="/seller"
                className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Open store dashboard
              </Link>
            </CardBody>
          </Card>
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
            <StatCard
              color="amber"
              icon={<Clock className="h-5 w-5" />}
              label="Pending review"
              value={String(attention?.pendingReview ?? 0)}
              href="/dashboard/orders?status=PENDING_REVIEW"
            />
            <StatCard
              color="violet"
              icon={<Palette className="h-5 w-5" />}
              label="In design"
              value={String(attention?.inDesign ?? 0)}
              href="/dashboard/designs"
            />
            <StatCard
              color="emerald"
              icon={<PackageCheck className="h-5 w-5" />}
              label="Ready to order"
              value={String(attention?.readyToOrder ?? 0)}
              href="/dashboard/orders"
            />
            <StatCard
              color="sky"
              icon={<Wallet className="h-5 w-5" />}
              label="Awaiting payment"
              value={String(attention?.unpaid ?? 0)}
              href="/dashboard/orders?status=APPROVED"
            />
          </div>
        )}

        {canReadOrders && !isAssignedTeamView && (
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
              <Link
                href={isAssignedTeamView ? "/dashboard/designs" : "/dashboard/orders"}
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardBody className="space-y-3 p-6 pt-3">
              {recentOrders.length ? (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 rounded-2xl border border-divider p-4 transition-colors hover:border-foreground/20 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip size="sm" variant="flat" color="primary" className="font-semibold">
                          {formatOrderNumber(order.orderNumber)}
                        </Chip>
                        <span className="font-semibold">{formatOrderDisplayName(order)}</span>
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
                        href={isAssignedTeamView ? "/dashboard/designs" : `/dashboard/orders/${order.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-foreground/60">No orders are available yet.</div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}
