"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Image,
  Select,
  SelectItem,
  Spinner,
  Textarea,
  Tooltip
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Boxes, ContactRound, Download, Truck, UploadCloud } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  useCreateCatalogOrderDesignUpload,
  useCatalogOrder,
  useUpdateCatalogOrderItemDesign,
  useUpdateCatalogOrderStatus,
  useAssignCatalogOrderEmployee,
  useEmployees
} from "@/lib/queries.catalog";
import { uploadFileToPresignedUrl } from "@/modules/catalog/public/api";
import { downloadApiFile } from "@/lib/download";
import { formatMoney } from "@/lib/money";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import {
  DESIGN_PHASES,
  buildUserDisplayName,
  formatDesignPhaseLabel,
  formatItemTypeLabel,
  formatOrderTypeLabel,
  getPreferredDesignImage
} from "@/lib/order-flow";
import type { CatalogOrderItem, CatalogOrderDesignPhase, CatalogOrderStatus } from "@/modules/catalog/orders/types";

const ORDER_STATUSES: CatalogOrderStatus[] = [
  "PENDING_REVIEW",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED"
];

function formatOrderStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function TeamItemCard({
  orderId,
  item,
  currency
}: {
  orderId: string;
  item: CatalogOrderItem;
  currency: string;
}) {
  const uploadMutation = useCreateCatalogOrderDesignUpload();
  const updateItemMutation = useUpdateCatalogOrderItemDesign();
  const [adminNotes, setAdminNotes] = useState(item.adminNotes ?? "");
  const mockupInputRef = useRef<HTMLInputElement | null>(null);
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  const uploadAsset = async (
    file: File,
    type: "mockups" | "proofs",
    nextPhase: CatalogOrderDesignPhase
  ) => {
    try {
      const upload = await uploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        type
      });

      await uploadFileToPresignedUrl(upload.uploadUrl, file);

      await updateItemMutation.mutateAsync({
        orderId,
        itemId: item.id,
        input:
          type === "mockups"
            ? {
                mockupImageUrl: upload.publicUrl,
                mockupImageKey: upload.key,
                designPhase: nextPhase,
                adminNotes: adminNotes.trim() || null,
                resolveOpenRevision: true
              }
            : {
                proofImageUrl: upload.publicUrl,
                proofImageKey: upload.key,
                designPhase: nextPhase,
                adminNotes: adminNotes.trim() || null
              }
      });

      addToast({
        title: type === "mockups" ? "Mockup uploaded" : "Proof uploaded",
        color: "success"
      });
    } catch (e: any) {
      addToast({
        title: "Upload failed",
        description: e?.message ?? "Unable to upload design asset.",
        color: "danger"
      });
    }
  };

  return (
    <div className="rounded-3xl border border-divider p-5">
      <div className="grid gap-5 lg:grid-cols-[150px_minmax(0,1fr)]">
        <div className="flex h-[150px] items-center justify-center overflow-hidden rounded-3xl bg-default-100">
          {getPreferredDesignImage(item) ? (
            <Image
              removeWrapper
              src={getPreferredDesignImage(item)!}
              alt={item.productName}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="text-sm text-foreground/50">No preview yet</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-semibold">{item.productName}</div>
                <Chip size="sm" variant="flat">
                  {formatItemTypeLabel(item.itemType)}
                </Chip>
              </div>
              <div className="text-sm text-foreground/60">{item.variantName || "Standard"}</div>
              <div className="text-sm text-foreground/60">
                {item.itemType === "BULK"
                  ? `Quantity: ${item.quantity}`
                  : `${item.quantityPerPack ?? 1} / pack · ${item.quantity} total`}
              </div>
            </div>

            <Select
              aria-label="Design phase"
              selectedKeys={[item.designPhase]}
              onSelectionChange={async (keys) => {
                const nextPhase = Array.from(keys as Set<string>)[0] as CatalogOrderDesignPhase;

                try {
                  await updateItemMutation.mutateAsync({
                    orderId,
                    itemId: item.id,
                    input: {
                      designPhase: nextPhase,
                      adminNotes: adminNotes.trim() || null
                    }
                  });
                  addToast({ title: "Phase updated", color: "success" });
                } catch (e: any) {
                  addToast({
                    title: "Update failed",
                    description: e?.message ?? "Unable to update phase.",
                    color: "danger"
                  });
                }
              }}
              className="min-w-[240px]"
            >
              {["MOCKUP_IN_PROGRESS", ...DESIGN_PHASES.slice(1), "REVISION_REQUESTED"].map((phase) => (
                <SelectItem key={phase}>{formatDesignPhaseLabel(phase as CatalogOrderDesignPhase)}</SelectItem>
              ))}
            </Select>
          </div>

          {item.revisions.length ? (
            <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
              <div className="mb-2 text-sm font-semibold">Revision history</div>
              <div className="space-y-3 text-sm text-foreground/70">
                {item.revisions.map((revision) => (
                  <div key={revision.id} className="rounded-2xl border border-divider bg-background p-3">
                    <div className="font-medium">
                      {revision.status === "OPEN" ? "Open revision request" : "Resolved revision"}
                    </div>
                    <div>{revision.notes}</div>
                    {revision.logoUrl ? (
                      <a
                        href={revision.logoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-primary underline"
                      >
                        View uploaded revision logo
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <Textarea
            label="Admin notes"
            value={adminNotes}
            onValueChange={setAdminNotes}
            placeholder="Internal notes for decoration, placement, or proof details"
          />

          <div className="flex flex-wrap gap-3">
            <input
              ref={mockupInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadAsset(file, "mockups", "REVIEW_MOCKUP_DESIGN");
                }
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={proofInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadAsset(file, "proofs", "REVIEW_FINAL_DESIGN");
                }
                event.currentTarget.value = "";
              }}
            />

            <Button
              variant="bordered"
              startContent={<UploadCloud className="size-4" />}
              onPress={() => mockupInputRef.current?.click()}
              isLoading={uploadMutation.isPending}
            >
              {item.mockupImageUrl ? "Replace mockup" : "Upload mockup"}
            </Button>

            <Button
              variant="bordered"
              startContent={<UploadCloud className="size-4" />}
              onPress={() => proofInputRef.current?.click()}
              isLoading={uploadMutation.isPending}
            >
              {item.proofImageUrl ? "Replace proof" : "Upload proof"}
            </Button>

            <Button
              color="primary"
              onPress={async () => {
                try {
                  await updateItemMutation.mutateAsync({
                    orderId,
                    itemId: item.id,
                    input: {
                      adminNotes: adminNotes.trim() || null
                    }
                  });
                  addToast({ title: "Notes saved", color: "success" });
                } catch (e: any) {
                  addToast({
                    title: "Save failed",
                    description: e?.message ?? "Unable to save notes.",
                    color: "danger"
                  });
                }
              }}
              isLoading={updateItemMutation.isPending}
              style={{ backgroundImage: "var(--primary-gradient)" }}
            >
              Save notes
            </Button>

            <div className="ml-auto text-right text-sm">
              <div className="text-foreground/60">
                {formatMoney(item.unitPrice, currency)} / {item.itemType === "BULK" ? "item" : "unit"}
              </div>
              <div className="font-semibold">{formatMoney(item.totalPrice, currency)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function formatShipmentStatusLabel(
  status:
    | "DRAFT"
    | "ESTIMATED"
    | "SCHEDULED"
    | "IN_REVIEW"
    | "ON_THE_WAY"
    | "DELIVERED"
    | "FAILURE"
    | "RETURN_TO_SENDER"
    | "AVAILABLE_FOR_PICKUP"
    | "CANCELLED"
) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data: user } = useMe();
  // Staff (admin / manager / designer) see the management view. A customer is a
  // user who can ONLY read their own orders — note SUPER_ADMIN also holds
  // orders.self.read, so staff must be detected via team/design permissions.
  const isStaffView = hasAnyPermission(user, [
    "catalog.orders.read",
    "catalog.orders.update",
    "orders.assigned.read",
    "design.write"
  ]);
  const isCustomer = !isStaffView;
  const canManageStatus = hasPermission(user, "catalog.orders.update");
  const canAssign = hasPermission(user, "admin.users.write");
  const canRead = hasAnyPermission(user, ["catalog.orders.read", "orders.assigned.read", "orders.self.read"]);

  const statusMutation = useUpdateCatalogOrderStatus();
  const assignMutation = useAssignCatalogOrderEmployee();
  const { data: employees = [] } = useEmployees("", canAssign);
  const canPlanShipping = hasAnyPermission(user, [
    "shipping.shipments.write",
    "shipping.shipments.assigned.write",
    "shipping.shipments.self.write"
  ]);

  const { data, isLoading, isError, error } = useCatalogOrder(orderId ?? "", canRead && !!orderId);
  const order = data?.order;

  const groupedItems = useMemo(
    () => ({
      bulk: order?.items.filter((item) => item.itemType === "BULK") ?? [],
      swagPack: order?.items.filter((item) => item.itemType === "SWAG_PACK") ?? [],
      packaging: order?.items.filter((item) => item.itemType === "PACKAGING") ?? []
    }),
    [order]
  );

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view this order.</CardBody>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex min-h-[320px] items-center justify-center">
          <Spinner label="Loading order..." />
        </CardBody>
      </Card>
    );
  }

  if (isError || !order) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <div className="text-lg font-semibold text-danger">Unable to load order.</div>
          <div className="text-sm text-foreground/60">
            {error instanceof Error ? error.message : "Order not found."}
          </div>
          <Link href="/dashboard/orders">
            <Button variant="bordered">Back to orders</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-4 p-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm" variant="flat">
                {formatOrderTypeLabel(order.type)}
              </Chip>
              <Chip size="sm" variant="flat">
                {order.status}
              </Chip>
              <Chip size="sm" variant="flat">
                {order.paymentStatus}
              </Chip>
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Order #{order.id}</h1>
              <p className="text-sm text-foreground/60">
                Submitted on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="bordered"
              startContent={<Download className="size-4" />}
              onPress={() => void downloadApiFile(`/catalog/orders/${order.id}/assets.zip`, `order-${order.id}-assets.zip`)}
            >
              Download request assets
            </Button>
            <Button
              variant="bordered"
              startContent={<Download className="size-4" />}
              onPress={() => void downloadApiFile(`/catalog/orders/${order.id}/mockups.pdf`, `order-${order.id}-mockups.pdf`)}
            >
              Download mockup PDF
            </Button>
            <Link href={`/dashboard/orders/${order.id}/shipping`}>
              <Button color="primary" style={{ backgroundImage: "var(--primary-gradient)" }}>
                {isCustomer ? "Plan shipping & storage" : "Open shipping planner"}
              </Button>
            </Link>
            <Link href="/dashboard/orders">
              <Button variant="bordered">Back to orders</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {!isCustomer && (canManageStatus || canAssign) ? (
        <Card className="border border-divider shadow-sm">
          <CardBody className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-4">
              {canManageStatus ? (
                <Select
                  label="Order status"
                  aria-label="Order status"
                  selectedKeys={[order.status]}
                  className="min-w-[220px]"
                  isDisabled={statusMutation.isPending}
                  onSelectionChange={async (keys) => {
                    const next = Array.from(keys as Set<string>)[0] as CatalogOrderStatus;
                    if (!next || next === order.status) return;
                    try {
                      await statusMutation.mutateAsync({ id: order.id, status: next });
                      addToast({
                        title: "Order status updated",
                        description: `Status is now ${formatOrderStatusLabel(next)}.`,
                        color: "success"
                      });
                    } catch (e: any) {
                      addToast({
                        title: "Update failed",
                        description: e?.message ?? "Unable to update status.",
                        color: "danger"
                      });
                    }
                  }}
                >
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s}>{formatOrderStatusLabel(s)}</SelectItem>
                  ))}
                </Select>
              ) : null}

              {canAssign ? (
                <Select
                  label="Assign designer / staff"
                  aria-label="Assign designer or staff"
                  selectedKeys={[order.assignedEmployee?.id ?? "__unassigned__"]}
                  className="min-w-[260px]"
                  isDisabled={assignMutation.isPending}
                  onSelectionChange={async (keys) => {
                    const value = Array.from(keys as Set<string>)[0] as string;
                    const assignedEmployeeId = value === "__unassigned__" ? null : value;
                    try {
                      await assignMutation.mutateAsync({ id: order.id, assignedEmployeeId });
                      addToast({
                        title: "Assignment updated",
                        description: assignedEmployeeId
                          ? "The assignee was notified by email."
                          : "Order is now unassigned.",
                        color: "success"
                      });
                    } catch (e: any) {
                      addToast({
                        title: "Assign failed",
                        description: e?.message ?? "Unable to assign.",
                        color: "danger"
                      });
                    }
                  }}
                >
                  {[
                    { key: "__unassigned__", label: "Unassigned" },
                    ...employees.map((employee) => ({
                      key: employee.id,
                      label: `${buildUserDisplayName(employee)} · ${employee.role.name}`
                    }))
                  ].map((option) => (
                    <SelectItem key={option.key}>{option.label}</SelectItem>
                  ))}
                </Select>
              ) : null}
            </div>

            <div className="max-w-sm text-sm text-foreground/60">
              Approve the order, then assign it to a designer to start the mockup workflow. The
              designer works the design phases below and the customer sees each update.
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_420px]">
        <div className="space-y-6">
          <Card className="border border-divider shadow-sm">
            <CardBody className="grid gap-6 p-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
                  Contact
                </div>
                <div className="text-lg font-semibold">{order.name}</div>
                <div className="text-sm text-foreground/70">{order.email}</div>
                <div className="text-sm text-foreground/70">{order.phone || "-"}</div>
                <div className="text-sm text-foreground/70">{order.companyName || "-"}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
                  Project
                </div>
                <div className="text-sm text-foreground/70">Project: {order.project?.name || "-"}</div>
                <div className="text-sm text-foreground/70">
                  Swag pack name: {order.project?.swagPackName || "-"}
                </div>
                <div className="text-sm text-foreground/70">
                  Budget per person:{" "}
                  {order.project?.budgetPerPerson != null
                    ? formatMoney(order.project.budgetPerPerson, order.currency)
                    : "-"}
                </div>
                <div className="text-sm text-foreground/70">
                  Needed by:{" "}
                  {order.project?.neededByDate
                    ? new Date(order.project.neededByDate).toLocaleDateString()
                    : "-"}
                </div>
                {!isCustomer ? (
                  <div className="text-sm text-foreground/70">
                    Assignee:{" "}
                    {order.assignedEmployee
                      ? buildUserDisplayName(order.assignedEmployee)
                      : "Manage myself"}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
                  Notes
                </div>
                <div className="rounded-2xl border border-divider bg-content1 px-4 py-3 text-sm text-foreground/70">
                  {order.notes || "No notes provided."}
                </div>
              </div>

              {order.logoUrl ? (
                <div className="space-y-2 md:col-span-2">
                  <div className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
                    Requested logo
                  </div>
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-divider bg-content1">
                    <Image
                      removeWrapper
                      src={order.logoUrl}
                      alt="Order logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {[groupedItems.bulk, groupedItems.swagPack, groupedItems.packaging].map((section, index) =>
            section.length ? (
              <Card key={index} className="border border-divider shadow-sm">
                <CardBody className="space-y-4 p-6">
                  <div className="text-xl font-semibold">
                    {index === 0 ? "Bulk products" : index === 1 ? "Swag pack items" : "Packaging"}
                  </div>

                  <div className="space-y-4">
                    {section.map((item) =>
                      isCustomer ? (
                        <div
                          key={item.id}
                          className="grid gap-4 rounded-3xl border border-divider p-5 md:grid-cols-[110px_minmax(0,1fr)_auto]"
                        >
                          <div className="flex h-[110px] w-[110px] items-center justify-center overflow-hidden rounded-3xl bg-default-100">
                            {getPreferredDesignImage(item) ? (
                              <Image
                                removeWrapper
                                src={getPreferredDesignImage(item)!}
                                alt={item.productName}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="text-xs font-semibold text-foreground/35">
                                {item.productName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold">{item.productName}</div>
                              <Chip size="sm" variant="flat">
                                {formatItemTypeLabel(item.itemType)}
                              </Chip>
                              <Chip size="sm" variant="flat">
                                {formatDesignPhaseLabel(item.designPhase)}
                              </Chip>
                            </div>
                            <div className="text-sm text-foreground/60">{item.variantName || "Standard"}</div>
                            <div className="text-sm text-foreground/60">
                              {item.itemType === "BULK"
                                ? `Quantity: ${item.quantity}`
                                : `${item.quantityPerPack ?? 1} / pack · ${item.quantity} total`}
                            </div>
                            {item.adminNotes ? (
                              <div className="text-sm text-foreground/70">{item.adminNotes}</div>
                            ) : null}
                          </div>

                          <div className="space-y-1 text-right">
                            <div className="text-sm text-foreground/60">
                              {formatMoney(item.unitPrice, order.currency)} / {item.itemType === "BULK" ? "item" : "unit"}
                            </div>
                            <div className="font-semibold">{formatMoney(item.totalPrice, order.currency)}</div>
                          </div>
                        </div>
                      ) : (
                        <TeamItemCard
                          key={item.id}
                          orderId={order.id}
                          item={item}
                          currency={order.currency}
                        />
                      )
                    )}
                  </div>
                </CardBody>
              </Card>
            ) : null
          )}
        </div>

        <Card className="border border-divider shadow-sm">
          <CardBody className="space-y-5 p-6">
            <div className="space-y-1">
              <div className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
                {isCustomer ? "Order Summary" : "Summary"}
              </div>
              <div className="text-3xl font-semibold">{formatMoney(order.totalDue, order.currency)}</div>
              <div className="text-sm text-foreground/60">
                {order.itemCount} item{order.itemCount === 1 ? "" : "s"} · Pack quantity {order.packQuantity} · {order.shipmentCount} shipment{order.shipmentCount === 1 ? "" : "s"}
              </div>
            </div>

            <div className="space-y-3 border-t border-divider pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground/60">Products subtotal</span>
                <span>{formatMoney(order.totalPrice, order.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60">Storage ({order.storageQuantity} units)</span>
                <span>{formatMoney(order.storageCost, order.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60">Shipping ({order.shipmentCount} saved)</span>
                <span>{formatMoney(order.shippingCost, order.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60">Estimated taxes & fees</span>
                <span>{formatMoney(order.taxesAndFees, order.currency)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-divider pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatMoney(order.totalDue, order.currency)}</span>
              </div>
            </div>

            <div className="space-y-3 rounded-3xl border border-divider bg-content1 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Boxes className="size-4" />
                Storage and inventory
              </div>
              <div className="text-sm text-foreground/60">
                {order.inventorySummary?.availableQuantity
                  ? `${order.inventorySummary.availableQuantity} unit(s) are currently available in inventory.`
                  : order.inventorySummary?.pendingWarehouseQuantity
                    ? `${order.inventorySummary.pendingWarehouseQuantity} unit(s) are pending warehouse receipt before they appear in inventory.`
                    : order.storageQuantity > 0
                      ? `${order.storageQuantity} unit(s) will remain in warehouse storage after payment.`
                      : "Everything on this order is currently allocated to saved shipments."}
              </div>
              {order.paymentStatus === "PAID" ? (
                <Link href="/dashboard/inventory">
                  <Button variant="bordered" className="w-full">
                    View inventory
                  </Button>
                </Link>
              ) : null}
            </div>

            <div className="space-y-3 rounded-3xl border border-divider bg-content1 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="size-4" />
                Shipment tracking
              </div>

              {!order.shipments.length ? (
                <div className="text-sm text-foreground/60">
                  No recipient shipments saved yet. Use the shipping planner to pick a recipient and add delivery costs before checkout.
                </div>
              ) : (
                <div className="space-y-3">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="rounded-2xl border border-divider bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {shipment.recipientName ||
                              (shipment.recipient
                                ? `${shipment.recipient.firstName} ${shipment.recipient.lastName}`
                                : "Recipient")}
                          </div>
                          <div className="text-xs text-foreground/55">
                            {shipment.destinationCountryName} · {shipment.serviceLevel}
                          </div>
                          <div className="text-xs text-foreground/55">
                            {formatMoney(shipment.totalCost, order.currency)} · {shipment.packageCount} package{shipment.packageCount === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Chip
                            size="sm"
                            variant="flat"
                            color={shipment.status === "DELIVERED" ? "success" : shipment.status === "FAILURE" ? "danger" : "default"}
                          >
                            {formatShipmentStatusLabel(shipment.status)}
                          </Chip>
                          <Chip size="sm" variant="flat">
                            {shipment.billingType === "SEPARATE_PAYMENT" ? "Separate payment" : "Included in order"}
                          </Chip>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={shipment.paymentStatus === "PAID" ? "success" : shipment.paymentStatus === "PENDING" ? "warning" : "default"}
                          >
                            {shipment.paymentStatus}
                          </Chip>
                        </div>
                      </div>

                      {shipment.billingType === "SEPARATE_PAYMENT" && shipment.paymentStatus !== "PAID" && isCustomer ? (
                        <div className="mt-3">
                          <Link href={`/dashboard/shipments/${shipment.id}/checkout`}>
                            <Button size="sm" color="primary" style={{ backgroundImage: "var(--primary-gradient)" }}>
                              Pay shipment charge
                            </Button>
                          </Link>
                        </div>
                      ) : null}

                      {(shipment.trackingNumber || shipment.trackingUrl || shipment.carrier) ? (
                        <div className="mt-3 space-y-1 text-xs text-foreground/60">
                          <div>{shipment.carrier || "Carrier pending"}</div>
                          <div>{shipment.trackingNumber || "Tracking number pending"}</div>
                          {shipment.trackingUrl ? (
                            <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                              Open tracking
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {canPlanShipping ? (
                  <Link href={`/dashboard/orders/${order.id}/shipping`}>
                    <Button
                      className="w-full"
                      color="primary"
                      startContent={<Truck className="size-4" />}
                      style={{ backgroundImage: "var(--primary-gradient)" }}
                    >
                      {isCustomer ? "Plan shipping & storage" : "Manage shipment plans"}
                    </Button>
                  </Link>
                ) : null}
                {isCustomer ? (
                  <Link href="/dashboard/recipients">
                    <Button className="w-full" variant="bordered" startContent={<ContactRound className="size-4" />}>
                      Manage recipients
                    </Button>
                  </Link>
                ) : null}
                <Link href="/dashboard/shipments">
                  <Button className="w-full" variant="flat">
                    Open shipments history
                  </Button>
                </Link>
              </div>
            </div>

            {isCustomer ? (
              <Tooltip content="You can proceed with the Request once all the Products are Approved.">
                <div className="w-full">
                  {order.paymentStatus === "PAID" ? (
                    <Button className="w-full" color="success" isDisabled>
                      Order paid
                    </Button>
                  ) : order.allItemsReadyToOrder ? (
                    <Link href={`/dashboard/orders/${order.id}/checkout`}>
                      <Button
                        className="w-full"
                        color="primary"
                        style={{ backgroundImage: "var(--primary-gradient)" }}
                      >
                        Continue
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full"
                      color="primary"
                      isDisabled
                      style={{ backgroundImage: "var(--primary-gradient)" }}
                    >
                      Continue
                    </Button>
                  )}
                </div>
              </Tooltip>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
