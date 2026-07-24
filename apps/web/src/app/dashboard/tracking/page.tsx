"use client";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { MapPin, Truck } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useCatalogOrders } from "@/lib/queries.catalog";
import { OrderProgress } from "@/components/orders/order-progress";
import {
  formatOrderDisplayName,
  formatOrderNumber,
  formatOrderStatusLabel,
  formatOrderTypeLabel,
  getOrderStatusColor
} from "@/lib/order-flow";
import { hasAnyPermission } from "@/lib/permissions";

export default function OrderTrackingPage() {
  const { data: user } = useMe();
  const canRead = hasAnyPermission(user, [
    "catalog.orders.read",
    "orders.assigned.read",
    "orders.self.read"
  ]);
  const { data, isLoading, isFetching, isError, error } = useCatalogOrders(
    { page: 1, pageSize: 50 },
    canRead
  );
  const orders = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardHeader className="flex flex-col items-start gap-1 p-6">
          <div className="text-2xl font-semibold">Order Tracking</div>
          <div className="text-sm text-foreground/60">
            Follow every order from submitted to shipped, and grab tracking numbers as they ship.
          </div>
        </CardHeader>
      </Card>

      {isLoading || isFetching ? (
        <Card>
          <CardBody className="flex min-h-[240px] items-center justify-center">
            <Spinner label="Loading your orders…" />
          </CardBody>
        </Card>
      ) : isError ? (
        <Card>
          <CardBody className="text-danger">
            {error instanceof Error ? error.message : "Unable to load orders."}
          </CardBody>
        </Card>
      ) : orders.length ? (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="border border-divider shadow-sm">
              <CardBody className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold">
                        Order# {formatOrderNumber(order.orderNumber)}
                      </span>
                      <span className="text-foreground/60">·</span>
                      <span className="text-lg font-semibold">{formatOrderDisplayName(order)}</span>
                      <Chip size="sm" variant="flat">
                        {formatOrderTypeLabel(order.type)}
                      </Chip>
                      <Chip size="sm" variant="flat" color={getOrderStatusColor(order.status)}>
                        {formatOrderStatusLabel(order.status)}
                      </Chip>
                    </div>
                    <div className="text-sm text-foreground/55">
                      Placed {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Link href={`/dashboard/orders/${formatOrderNumber(order.orderNumber)}`}>
                    <Button size="sm" variant="bordered">
                      View order
                    </Button>
                  </Link>
                </div>

                <div className="rounded-2xl border border-divider bg-content1 p-4">
                  <OrderProgress
                    status={order.status}
                    productionStage={order.productionStage}
                    timestamps={order.stageTimestamps}
                    orientation="horizontal"
                  />
                </div>

                {order.shipments?.length ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Truck className="size-4 text-primary" /> Shipments
                    </div>
                    {order.shipments.map((shipment) => (
                      <div
                        key={shipment.id}
                        className="rounded-xl border border-divider bg-background px-4 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-medium">
                            <MapPin className="size-3.5 text-foreground/50" />
                            {shipment.destinationCountryName}
                          </span>
                          <span className="capitalize text-foreground/55">
                            {shipment.status.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </div>
                        {shipment.trackingNumber ? (
                          <div className="mt-1.5 text-xs text-foreground/55">
                            {shipment.carrier ? `${shipment.carrier} · ` : ""}
                            {shipment.trackingUrl ? (
                              <a
                                href={shipment.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline"
                              >
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
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="py-16 text-center text-foreground/60">
            You have no orders to track yet.
          </CardBody>
        </Card>
      )}
    </div>
  );
}
