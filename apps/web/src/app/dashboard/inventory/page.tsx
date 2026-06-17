"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Image,
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
import { Boxes, Search, Warehouse } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useUsers } from "@/queries/users";
import { useInventory, useReceiveInventory } from "@/queries/inventory";
import { formatMoney } from "@/lib/money";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { InventoryItem, InventoryMovement } from "@/modules/inventory/types";

function formatUserName(user?: { firstName?: string | null; lastName?: string | null; email: string } | null) {
  if (!user) return "Guest";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

function formatInventoryStatus(status: InventoryItem["inventoryStatus"]) {
  if (status === "PENDING_RECEIPT") return "Pending receipt";
  if (status === "PARTIALLY_RECEIVED") return "Partially received";
  return "Available";
}

function formatMovementType(type: InventoryMovement["type"]) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInventoryStatusColor(status: InventoryItem["inventoryStatus"]) {
  if (status === "AVAILABLE") return "success";
  if (status === "PARTIALLY_RECEIVED") return "warning";
  return "default";
}

export default function InventoryPage() {
  const { data: user } = useMe();
  const isCustomer = hasPermission(user, "inventory.self.read");
  const canRead = hasAnyPermission(user, ["inventory.read", "inventory.assigned.read", "inventory.self.read"]);
  const canReceive = hasPermission(user, "inventory.adjust");
  const canShip = hasAnyPermission(user, [
    "shipping.shipments.write",
    "shipping.shipments.assigned.write",
    "shipping.shipments.self.write"
  ]);
  const canFilterByCustomer = hasPermission(user, "inventory.read");

  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");

  const deferredSearch = useDeferredValue(search);
  const params = useMemo(
    () => ({
      search: deferredSearch || undefined,
      userId: canFilterByCustomer && userId ? userId : undefined
    }),
    [canFilterByCustomer, deferredSearch, userId]
  );

  const { data, isLoading, isFetching, isError, error } = useInventory(params, canRead);
  const { data: users = [] } = useUsers({}, canRead && canFilterByCustomer);
  const receiveInventoryMutation = useReceiveInventory();

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view inventory.</CardBody>
      </Card>
    );
  }

  const items = data?.items ?? [];
  const summary = data?.summary ?? {
    totalStoredQuantity: 0,
    totalStorageCost: 0,
    orderCount: 0,
    skuCount: 0
  };
  const recentMovements = data?.recentMovements ?? [];

  const handleReceiveInventory = async (item: InventoryItem) => {
    if (!canReceive || item.pendingReceiptQuantity <= 0) {
      return;
    }

    try {
      await receiveInventoryMutation.mutateAsync({
        orderId: item.orderId,
        items: [
          {
            orderItemId: item.id,
            quantity: item.pendingReceiptQuantity
          }
        ]
      });

      addToast({
        title: "Inventory received",
        description: `${item.pendingReceiptQuantity} unit(s) were moved into available warehouse inventory.`,
        color: "success"
      });
    } catch (e: any) {
      addToast({
        title: "Receive failed",
        description: e?.message ?? "Unable to receive inventory.",
        color: "danger"
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="text-sm text-foreground/60">Available to ship</div>
            <div className="text-3xl font-semibold">{summary.totalStoredQuantity}</div>
          </div>
          <div>
            <div className="text-sm text-foreground/60">Storage cost</div>
            <div className="text-3xl font-semibold">{formatMoney(summary.totalStorageCost, "USD")}</div>
          </div>
          <div>
            <div className="text-sm text-foreground/60">Orders in warehouse</div>
            <div className="text-3xl font-semibold">{summary.orderCount}</div>
          </div>
          <div>
            <div className="text-sm text-foreground/60">Tracked line items</div>
            <div className="text-3xl font-semibold">{summary.skuCount}</div>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody
          className={[
            "grid gap-4 border-b border-divider px-6 py-5",
            canFilterByCustomer ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "lg:grid-cols-[minmax(0,1fr)]"
          ].join(" ")}
        >
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search inventory"
            startContent={<Search className="size-4 text-foreground/40" />}
          />

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
                .filter((entry) => entry.role.name === "Customer")
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
          <Table removeWrapper aria-label="Inventory table">
            <TableHeader>
              <TableColumn>Product</TableColumn>
              <TableColumn>Customer</TableColumn>
              <TableColumn>Availability</TableColumn>
              <TableColumn>Warehouse Status</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading || isFetching}
              loadingContent={<Spinner label="Loading inventory..." />}
              emptyContent={
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                  <div
                    className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundImage: "var(--primary-gradient)" }}
                  >
                    <Boxes className="size-6" />
                  </div>
                  <div>
                    <div className="font-semibold">No warehouse inventory yet</div>
                    <div className="text-sm text-foreground/60">
                      Inventory appears here only after stock is received into the warehouse.
                    </div>
                  </div>
                </div>
              }
            >
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-content2">
                        {item.imageUrl ? (
                          <Image removeWrapper src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                        ) : (
                          <Boxes className="size-5 text-foreground/40" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-foreground/55">{item.variantName || "Standard"}</div>
                        <div className="text-xs text-foreground/55">Order #{item.orderId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{formatUserName(item.user)}</div>
                      <div className="text-xs text-foreground/55">{item.user?.email || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Chip size="sm" color="primary" variant="flat">
                        Available {item.storedQuantity}
                      </Chip>
                      <Chip size="sm" variant="flat">
                        Pending receipt {item.pendingReceiptQuantity}
                      </Chip>
                      <Chip size="sm" variant="flat">
                        Shipped {item.shippedQuantity}
                      </Chip>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Chip size="sm" color={getInventoryStatusColor(item.inventoryStatus)} variant="flat">
                        {formatInventoryStatus(item.inventoryStatus)}
                      </Chip>
                      <div className="text-xs text-foreground/55">
                        Last movement {new Date(item.lastMovementAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-foreground/55">
                        Storage cost {formatMoney(item.storageCost, item.currency)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/orders/${item.orderId}`}>
                        <Button size="sm" variant="bordered">
                          View order
                        </Button>
                      </Link>

                      {canShip && item.storedQuantity > 0 ? (
                        <Link href={`/dashboard/orders/${item.orderId}/shipping`}>
                          <Button
                            size="sm"
                            color="primary"
                            style={{ backgroundImage: "var(--primary-gradient)" }}
                          >
                            Send swag
                          </Button>
                        </Link>
                      ) : null}

                      {canReceive && item.pendingReceiptQuantity > 0 ? (
                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<Warehouse className="size-4" />}
                          isLoading={receiveInventoryMutation.isPending}
                          onPress={() => void handleReceiveInventory(item)}
                        >
                          Receive stock
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Unable to load inventory."}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardHeader className="flex items-center justify-between p-6 pb-0">
          <div>
            <div className="text-xl font-semibold">Recent inventory movements</div>
            <div className="text-sm text-foreground/60">
              Warehouse receipts, shipment allocations, and manual adjustments are tracked here.
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-3 p-6">
          {!recentMovements.length ? (
            <div className="text-sm text-foreground/60">No inventory movements have been logged yet.</div>
          ) : (
            recentMovements.map((movement) => (
              <div
                key={movement.id}
                className="flex flex-col gap-3 rounded-3xl border border-divider p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="flat">
                      {formatMovementType(movement.type)}
                    </Chip>
                    <Chip size="sm" variant="flat" color={movement.quantityDelta >= 0 ? "success" : "warning"}>
                      {movement.quantityDelta > 0 ? `+${movement.quantityDelta}` : movement.quantityDelta}
                    </Chip>
                  </div>
                  <div className="font-medium">
                    {movement.orderItem.productName}
                    {movement.orderItem.variantName ? ` · ${movement.orderItem.variantName}` : ""}
                  </div>
                  <div className="text-xs text-foreground/55">
                    Order #{movement.orderId}
                    {movement.shipmentId ? ` · Shipment #${movement.shipmentId}` : ""}
                    {movement.note ? ` · ${movement.note}` : ""}
                  </div>
                </div>

                <div className="space-y-1 text-sm text-foreground/60 lg:text-right">
                  <div>{new Date(movement.createdAt).toLocaleString()}</div>
                  <div>{movement.performedBy ? formatUserName(movement.performedBy) : "System"}</div>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
