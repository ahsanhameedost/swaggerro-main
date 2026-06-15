"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Search, Truck } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useUsers } from "@/queries/users";
import { useShipments, useUpdateShipmentStatus, useUpdateShipmentTracking } from "@/queries/shipping";
import type { ShippingShipment } from "@/modules/shipping/types";
import { formatMoney } from "@/lib/money";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

const STATUSES: Array<ShippingShipment["status"]> = [
  "DRAFT",
  "ESTIMATED",
  "SCHEDULED",
  "IN_REVIEW",
  "ON_THE_WAY",
  "DELIVERED",
  "FAILURE",
  "RETURN_TO_SENDER",
  "AVAILABLE_FOR_PICKUP",
  "CANCELLED"
];

function formatStatusLabel(status: ShippingShipment["status"]) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ShipmentTrackingEditor({
  shipment,
  canWrite
}: {
  shipment: ShippingShipment;
  canWrite: boolean;
}) {
  const updateStatusMutation = useUpdateShipmentStatus();
  const updateTrackingMutation = useUpdateShipmentTracking();
  const [trackingNumber, setTrackingNumber] = useState(shipment.trackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(shipment.trackingUrl ?? "");
  const [carrier, setCarrier] = useState(shipment.carrier ?? "");

  const handleStatusChange = async (value: ShippingShipment["status"]) => {
    if (!canWrite) return;

    try {
      await updateStatusMutation.mutateAsync({ id: shipment.id, status: value });
      addToast({ title: "Shipment updated", color: "success" });
    } catch (e: any) {
      addToast({
        title: "Update failed",
        description: e?.message ?? "Unable to update shipment.",
        color: "danger"
      });
    }
  };

  const handleSaveTracking = async () => {
    if (!canWrite) return;

    try {
      await updateTrackingMutation.mutateAsync({
        id: shipment.id,
        input: {
          carrier: carrier.trim() || null,
          trackingNumber: trackingNumber.trim() || null,
          trackingUrl: trackingUrl.trim() || null
        }
      });
      addToast({ title: "Tracking saved", color: "success" });
    } catch (e: any) {
      addToast({
        title: "Save failed",
        description: e?.message ?? "Unable to save tracking.",
        color: "danger"
      });
    }
  };

  return (
    <div className="space-y-3">
      <Select
        aria-label="Shipment status"
        selectedKeys={[shipment.status]}
        onSelectionChange={(keys) => {
          const value = Array.from(keys as Set<string>)[0] as ShippingShipment["status"];
          if (value) {
            void handleStatusChange(value);
          }
        }}
        isDisabled={!canWrite}
      >
        {STATUSES.map((status) => (
          <SelectItem key={status}>{formatStatusLabel(status)}</SelectItem>
        ))}
      </Select>

      <Input label="Carrier" value={carrier} onValueChange={setCarrier} isDisabled={!canWrite} />
      <Input label="Tracking number" value={trackingNumber} onValueChange={setTrackingNumber} isDisabled={!canWrite} />
      <Input label="Tracking URL" value={trackingUrl} onValueChange={setTrackingUrl} isDisabled={!canWrite} />

      {canWrite ? (
        <Button
          size="sm"
          color="primary"
          isLoading={updateTrackingMutation.isPending}
          onPress={() => void handleSaveTracking()}
          style={{ backgroundImage: "var(--primary-gradient)" }}
        >
          Save tracking
        </Button>
      ) : null}
    </div>
  );
}

function getPaymentChipColor(paymentStatus: ShippingShipment["paymentStatus"]) {
  if (paymentStatus === "PAID") {
    return "success";
  }

  if (paymentStatus === "FAILED" || paymentStatus === "REFUNDED") {
    return "danger";
  }

  if (paymentStatus === "PENDING") {
    return "warning";
  }

  return "default";
}

export default function ShipmentsPage() {
  const { data: user } = useMe();
  const isCustomer = hasPermission(user, "shipping.shipments.self.read");
  const canRead = hasAnyPermission(user, [
    "shipping.shipments.read",
    "shipping.shipments.assigned.read",
    "shipping.shipments.self.read"
  ]);
  const canWrite = hasAnyPermission(user, [
    "shipping.shipments.write",
    "shipping.shipments.assigned.write"
  ]);
  const canFilterByCustomer = hasPermission(user, "shipping.shipments.read");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ShippingShipment["status"] | "">("");
  const [userId, setUserId] = useState("");

  const deferredSearch = useDeferredValue(search);

  const params = useMemo(
    () => ({
      search: deferredSearch || undefined,
      status: status || undefined,
      userId: canFilterByCustomer && userId ? userId : undefined
    }),
    [canFilterByCustomer, deferredSearch, status, userId]
  );

  const {
    data: shipments = [],
    isLoading,
    isFetching,
    isError,
    error
  } = useShipments(params, canRead);
  const { data: users = [] } = useUsers({}, canRead && canFilterByCustomer);

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view shipments.</CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Shipments</h1>
            <p className="text-sm text-foreground/60">
              {isCustomer
                ? "Track recipient deliveries and pay any separate shipment charges created after your order was already funded."
                : "Track all shipment activity, statuses, and recipient deliveries from one place."}
            </p>
          </div>

          {!isCustomer ? (
            <Chip color="primary" variant="flat">
              Team tracking view
            </Chip>
          ) : null}
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody
          className={[
            "grid gap-4 border-b border-divider px-6 py-5",
            canFilterByCustomer ? "lg:grid-cols-[minmax(0,1fr)_240px_240px]" : "lg:grid-cols-[minmax(0,1fr)_240px]"
          ].join(" ")}
        >
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search shipments"
            startContent={<Search className="size-4 text-foreground/40" />}
          />

          <Select
            aria-label="Filter by status"
            selectedKeys={status ? [status] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys as Set<string>)[0] as ShippingShipment["status"] | undefined;
              setStatus(value ?? "");
            }}
            placeholder="All statuses"
          >
            {STATUSES.map((statusValue) => (
              <SelectItem key={statusValue}>{formatStatusLabel(statusValue)}</SelectItem>
            ))}
          </Select>

          {canFilterByCustomer ? (
            <Select
              aria-label="Filter by customer"
              selectedKeys={userId ? [userId] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys as Set<string>)[0];
                setUserId(String(value ?? ""));
              }}
              placeholder="All customers"
            >
              {users
                .filter((entry) => entry.role.name === "USER")
                .map((entry) => (
                  <SelectItem key={entry.id}>
                    {entry.firstName || entry.lastName
                      ? `${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim()
                      : entry.email}
                  </SelectItem>
                ))}
            </Select>
          ) : null}
        </CardBody>

        <CardBody className="p-0">
          <Table removeWrapper aria-label="Shipments table">
            <TableHeader>
              <TableColumn>Shipment</TableColumn>
              <TableColumn>Recipient</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Total</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading || isFetching}
              loadingContent={<Spinner label="Loading shipments..." />}
              emptyContent={
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                  <div
                    className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundImage: "var(--primary-gradient)" }}
                  >
                    <Truck className="size-6" />
                  </div>
                  <div>
                    <div className="font-semibold">No shipments yet</div>
                    <div className="text-sm text-foreground/60">
                      Create shipment plans from your order management view to start tracking them here.
                    </div>
                  </div>
                </div>
              }
            >
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="font-medium">#{shipment.id}</div>
                      <div className="text-xs text-foreground/55">Order #{shipment.orderId}</div>
                      <div className="text-xs text-foreground/55">
                        {shipment.destinationCountryName} · {shipment.serviceLevel}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Chip size="sm" variant="flat">
                          {shipment.billingType === "SEPARATE_PAYMENT" ? "Separate payment" : "Included in order"}
                        </Chip>
                        <Chip size="sm" variant="flat" color={getPaymentChipColor(shipment.paymentStatus)}>
                          {shipment.paymentStatus}
                        </Chip>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {shipment.recipientName ||
                          (shipment.recipient
                            ? `${shipment.recipient.firstName} ${shipment.recipient.lastName}`
                            : "Recipient")}
                      </div>
                      <div className="text-xs text-foreground/55">{shipment.recipientEmail || "-"}</div>
                      <div className="text-xs text-foreground/55">
                        {shipment.city}
                        {shipment.state ? `, ${shipment.state}` : ""} {shipment.postalCode}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={shipment.status === "DELIVERED" ? "success" : shipment.status === "FAILURE" ? "danger" : "default"}
                      >
                        {formatStatusLabel(shipment.status)}
                      </Chip>
                      <div className="space-y-1 text-xs text-foreground/55">
                        <div>{shipment.trackingNumber || "Tracking pending"}</div>
                        {shipment.trackingUrl ? (
                          <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                            Open tracking
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{formatMoney(shipment.totalCost, shipment.currency)}</div>
                      <div className="text-xs text-foreground/55">
                        {shipment.packageCount} package{shipment.packageCount === 1 ? "" : "s"}
                      </div>
                      {shipment.paidAt ? (
                        <div className="text-xs text-foreground/55">
                          Paid {new Date(shipment.paidAt).toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <Link href={`/dashboard/orders/${shipment.orderId}`}>
                        <Button size="sm" variant="bordered">
                          View order
                        </Button>
                      </Link>

                      {shipment.billingType === "SEPARATE_PAYMENT" && shipment.paymentStatus !== "PAID" && isCustomer ? (
                        <Link href={`/dashboard/shipments/${shipment.id}/checkout`}>
                          <Button
                            size="sm"
                            color="primary"
                            style={{ backgroundImage: "var(--primary-gradient)" }}
                          >
                            Pay shipment charge
                          </Button>
                        </Link>
                      ) : null}

                      {canWrite ? <ShipmentTrackingEditor shipment={shipment} canWrite={canWrite} /> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Unable to load shipments."}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
