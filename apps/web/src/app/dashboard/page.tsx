"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { useMe } from "@/queries/auth";
import { useCatalogOrders } from "@/lib/queries.catalog";
import { formatMoney } from "@/lib/money";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

export default function DashboardPage() {
  const { data: user, isLoading } = useMe();
  const canReadOrders = hasAnyPermission(user, ["catalog.orders.read", "orders.assigned.read", "orders.self.read"]);
  const { data } = useCatalogOrders({ page: 1, pageSize: 5 }, !!user && canReadOrders);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading dashboard..." />
      </main>
    );
  }

  const recentOrders = data?.items ?? [];
  const isCustomer = hasPermission(user, "orders.self.read");
  const isAssignedTeamView =
    hasPermission(user, "orders.assigned.read") && !hasPermission(user, "catalog.orders.read");

  return (
    <main className="min-h-screen bg-background">
      <div className="flex flex-col gap-6">
        <Card className="border border-divider shadow-sm">
          <CardHeader className="flex flex-col items-start gap-1 p-6">
            <div className="text-2xl font-semibold">
              Welcome back{user.firstName ? `, ${user.firstName}` : ""}
            </div>
            <div className="text-sm text-foreground/60">
              {isCustomer
                ? "Track your submitted orders and approve designs as they move through the mockup flow."
                : isAssignedTeamView
                  ? "Review your assigned orders, design jobs, and shipment requests from one place."
                  : "Manage submitted orders, design approvals, and employee assignments from one place."}
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-divider shadow-sm">
            <CardBody className="space-y-2 p-6">
              <div className="text-sm text-foreground/60">
                {isCustomer ? "My Orders" : isAssignedTeamView ? "Assigned orders" : "Orders queue"}
              </div>
              <div className="text-3xl font-semibold">{recentOrders.length}</div>
              <Link href="/dashboard/orders" className="text-sm text-primary underline">
                Open orders
              </Link>
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm">
            <CardBody className="space-y-2 p-6">
              <div className="text-sm text-foreground/60">
                {isCustomer ? "Design reviews" : isAssignedTeamView ? "Assigned design jobs" : "Design jobs"}
              </div>
              <div className="text-3xl font-semibold">
                {recentOrders.reduce((sum, order) => sum + order.items.length, 0)}
              </div>
              <Link href="/dashboard/designs" className="text-sm text-primary underline">
                Open designs
              </Link>
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm">
            <CardBody className="space-y-2 p-6">
              <div className="text-sm text-foreground/60">
                {isCustomer ? "Pending total" : "Recent order value"}
              </div>
              <div className="text-3xl font-semibold">
                {formatMoney(recentOrders[0]?.totalDue ?? 0)}
              </div>
              <div className="text-xs text-foreground/50">
                {isCustomer
                  ? "Includes any planned storage and shipping saved before checkout."
                  : "Latest visible request total including storage and planned shipping."}
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="border border-divider shadow-sm">
          <CardHeader className="p-6 pb-0">
            <div>
              <div className="text-xl font-semibold">Recent orders</div>
              <div className="text-sm text-foreground/60">
                {isCustomer
                  ? "Your latest submitted requests."
                  : isAssignedTeamView
                    ? "Latest requests currently assigned to you."
                    : "Latest requests visible to your permissions."}
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4 p-6">
            {recentOrders.length ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-3xl border border-divider p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {order.project?.swagPackName || order.project?.name || `Order #${order.id}`}
                    </div>
                    <div className="text-sm text-foreground/60">
                      Order #{order.id} · {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Chip size="sm" variant="flat">
                      {order.status}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      {order.allItemsReadyToOrder ? "Ready" : "In design"}
                    </Chip>
                    <Link href={`/dashboard/orders/${order.id}`} className="text-sm text-primary underline">
                      View details
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-foreground/60">
                {canReadOrders ? "No orders are available yet." : "Your account does not have order access."}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
