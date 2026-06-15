"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type Key } from "react";
import { useParams } from "next/navigation";
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
  Textarea
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { ArrowLeft, ContactRound, PackageCheck, Truck } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useRecipients } from "@/queries/recipients";
import {
  useCreateShipment,
  useEstimateShipment,
  useOrderShippingPlanner,
  useUpdateShipmentStatus
} from "@/queries/shipping";
import { SHIPPING_COUNTRIES } from "@/modules/shipping";
import type { ShipmentEstimate, ShippingPlanner, ShippingShipment } from "@/modules/shipping/types";
import type { Recipient } from "@/modules/recipients/types";
import { formatMoney } from "@/lib/money";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

const SERVICE_LEVELS = [
  { key: "STANDARD", label: "Standard" },
  { key: "EXPRESS", label: "Express" }
] as const;

const SHIPMENT_STATUSES = [
  { key: "DRAFT", label: "Draft" },
  { key: "ESTIMATED", label: "Estimated" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "IN_REVIEW", label: "In review" },
  { key: "ON_THE_WAY", label: "On the way" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "FAILURE", label: "Failure" },
  { key: "RETURN_TO_SENDER", label: "Return to sender" },
  { key: "AVAILABLE_FOR_PICKUP", label: "Available for pickup" },
  { key: "CANCELLED", label: "Cancelled" }
] as const;

function getSingleSelection(keys: "all" | Set<Key>) {
  if (keys === "all") {
    return "";
  }

  return String(Array.from(keys)[0] ?? "");
}

function getCountryName(code: string) {
  return SHIPPING_COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

function formatServiceLabel(serviceLevel: "STANDARD" | "EXPRESS") {
  return SERVICE_LEVELS.find((item) => item.key === serviceLevel)?.label ?? serviceLevel;
}

function formatPackageTypeLabel(value: "BULK_ITEM" | "PACK" | "MAILER_PACK") {
  if (value === "MAILER_PACK") {
    return "Mailer pack";
  }

  if (value === "BULK_ITEM") {
    return "Bulk item";
  }

  return "Pack";
}

function formatShipmentStatusLabel(status: ShippingShipment["status"]) {
  return SHIPMENT_STATUSES.find((item) => item.key === status)?.label ?? status;
}

function countTotalRemainingItems(planner: ShippingPlanner | undefined) {
  return (planner?.items ?? []).reduce((sum, item) => sum + item.remainingQuantity, 0);
}

function countTotalAllocatedItems(planner: ShippingPlanner | undefined) {
  return (planner?.items ?? []).reduce((sum, item) => sum + item.allocatedQuantity, 0);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatRecipientName(recipient: Recipient) {
  return [recipient.firstName, recipient.lastName].filter(Boolean).join(" ").trim() || recipient.email || "Recipient";
}

function applyRecipientToFields(recipient: Recipient, setters: {
  setDestinationCountryCode: (value: string) => void;
  setRecipientName: (value: string) => void;
  setRecipientEmail: (value: string) => void;
  setRecipientPhone: (value: string) => void;
  setAddressLine1: (value: string) => void;
  setAddressLine2: (value: string) => void;
  setCity: (value: string) => void;
  setStateRegion: (value: string) => void;
  setPostalCode: (value: string) => void;
}) {
  setters.setDestinationCountryCode(recipient.countryCode);
  setters.setRecipientName(formatRecipientName(recipient));
  setters.setRecipientEmail(recipient.email ?? "");
  setters.setRecipientPhone(recipient.phone ?? "");
  setters.setAddressLine1(recipient.addressLine1);
  setters.setAddressLine2(recipient.addressLine2 ?? "");
  setters.setCity(recipient.city);
  setters.setStateRegion(recipient.state ?? "");
  setters.setPostalCode(recipient.postalCode);
}

export default function OrderShippingPlannerPage() {
  const params = useParams<{ id: string }>();
  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data: user } = useMe();
  const isCustomer = hasPermission(user, "orders.self.read");
  const canRead = hasAnyPermission(user, [
    "shipping.shipments.read",
    "shipping.shipments.assigned.read",
    "shipping.shipments.self.read"
  ]);
  const canWrite = hasAnyPermission(user, [
    "shipping.shipments.write",
    "shipping.shipments.assigned.write",
    "shipping.shipments.self.write"
  ]);
  const canEstimate = hasAnyPermission(user, [
    "shipping.estimate",
    "shipping.assigned.estimate",
    "shipping.self.estimate"
  ]);

  const {
    data: planner,
    isLoading,
    isError,
    error
  } = useOrderShippingPlanner(orderId ?? "", canRead && !!orderId);

  const recipientQueryUserId = !isCustomer ? planner?.order.userId ?? undefined : undefined;
  const {
    data: recipients = [],
    isLoading: isRecipientsLoading
  } = useRecipients(
    {
      userId: recipientQueryUserId
    },
    canRead && (!!isCustomer || !!recipientQueryUserId)
  );

  const estimateMutation = useEstimateShipment();
  const createShipmentMutation = useCreateShipment();
  const updateStatusMutation = useUpdateShipmentStatus();

  const [destinationCountryCode, setDestinationCountryCode] = useState("US");
  const [serviceLevel, setServiceLevel] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [lineQuantities, setLineQuantities] = useState<Record<string, string>>({});
  const [estimate, setEstimate] = useState<ShipmentEstimate | null>(null);

  const selectedRecipient = useMemo(
    () => recipients.find((recipient) => recipient.id === selectedRecipientId) ?? null,
    [recipients, selectedRecipientId]
  );

  useEffect(() => {
    if (!planner?.items?.length) {
      return;
    }

    setLineQuantities((current) => {
      if (Object.keys(current).length > 0) {
        return current;
      }

      return Object.fromEntries(
        planner.items.map((item) => [item.orderItemId, item.remainingQuantity > 0 ? String(item.remainingQuantity) : "0"])
      );
    });
  }, [planner?.items]);

  useEffect(() => {
    if (!selectedRecipient) {
      return;
    }

    applyRecipientToFields(selectedRecipient, {
      setDestinationCountryCode,
      setRecipientName,
      setRecipientEmail,
      setRecipientPhone,
      setAddressLine1,
      setAddressLine2,
      setCity,
      setStateRegion,
      setPostalCode
    });
  }, [selectedRecipient]);

  useEffect(() => {
    if (selectedRecipientId || !recipients.length) {
      return;
    }

    const defaultRecipient = recipients.find((recipient) => recipient.isDefault);
    if (!defaultRecipient) {
      return;
    }

    setSelectedRecipientId(defaultRecipient.id);
  }, [recipients, selectedRecipientId]);

  const selectedLines = useMemo(
    () =>
      (planner?.items ?? [])
        .map((item) => ({
          ...item,
          selectedQuantity: Math.max(
            0,
            Math.min(item.remainingQuantity, Number(lineQuantities[item.orderItemId] || 0))
          )
        }))
        .filter((item) => item.selectedQuantity > 0),
    [lineQuantities, planner?.items]
  );

  const selectedQuantityTotal = useMemo(
    () => selectedLines.reduce((sum, item) => sum + item.selectedQuantity, 0),
    [selectedLines]
  );

  const estimatePayload = useMemo(
    () => ({
      orderId: orderId ?? "",
      recipientId: selectedRecipientId || null,
      destinationCountryCode,
      destinationCountryName: getCountryName(destinationCountryCode),
      recipientName: recipientName.trim() || null,
      recipientEmail: recipientEmail.trim() || null,
      recipientPhone: recipientPhone.trim() || null,
      addressLine1: addressLine1.trim() || null,
      addressLine2: addressLine2.trim() || null,
      city: city.trim() || null,
      state: stateRegion.trim() || null,
      postalCode: postalCode.trim() || null,
      serviceLevel,
      notes: notes.trim() || null,
      items: selectedLines.map((item) => ({
        orderItemId: item.orderItemId,
        quantity: item.selectedQuantity
      }))
    }),
    [
      addressLine1,
      addressLine2,
      city,
      destinationCountryCode,
      notes,
      orderId,
      postalCode,
      recipientEmail,
      recipientName,
      recipientPhone,
      selectedLines,
      selectedRecipientId,
      serviceLevel,
      stateRegion
    ]
  );

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to manage shipping for orders.</CardBody>
      </Card>
    );
  }

  const handleEstimate = async () => {
    if (!canEstimate) return;

    try {
      const response = await estimateMutation.mutateAsync(estimatePayload);
      setEstimate(response);

      if (response.issues.length) {
        addToast({
          title: "Estimate needs attention",
          description: response.issues[0],
          color: "warning"
        });
      } else {
        addToast({
          title: "Shipping estimated",
          description: `Estimated ${formatMoney(response.totalCost, response.currency)} for this shipment.`,
          color: "success"
        });
      }
    } catch (estimateError: any) {
      addToast({
        title: "Estimate failed",
        description: estimateError?.message ?? "Unable to estimate shipment",
        color: "danger"
      });
    }
  };

  const handleCreateShipment = async () => {
    if (!canWrite) return;

    try {
      const response = await createShipmentMutation.mutateAsync(estimatePayload);
      setEstimate(null);
      setLineQuantities({});

      addToast({
        title: "Shipment saved",
        description: `Shipment ${response.shipment.id} is now attached to this order.`,
        color: "success"
      });
    } catch (shipmentError: any) {
      addToast({
        title: "Save failed",
        description: shipmentError?.message ?? "Unable to save shipment",
        color: "danger"
      });
    }
  };

  const handleStatusChange = async (shipment: ShippingShipment, nextStatus: ShippingShipment["status"]) => {
    if (!canWrite || shipment.status === nextStatus) {
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({ id: shipment.id, status: nextStatus });
      addToast({ title: "Shipment status updated", color: "success" });
    } catch (statusError: any) {
      addToast({
        title: "Status update failed",
        description: statusError?.message ?? "",
        color: "danger"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex min-h-[360px] items-center justify-center">
          <Spinner label="Loading shipping planner..." />
        </CardBody>
      </Card>
    );
  }

  if (isError || !planner) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <div className="text-lg font-semibold text-danger">Unable to load shipping planner.</div>
          <div className="text-sm text-foreground/60">
            {error instanceof Error ? error.message : "Order planner not found."}
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/orders">
              <Button variant="bordered">Back to orders</Button>
            </Link>
            {orderId ? (
              <Link href={`/dashboard/orders/${orderId}`}>
                <Button color="primary">Open order</Button>
              </Link>
            ) : null}
          </div>
        </CardBody>
      </Card>
    );
  }

  const totalRemainingItems = countTotalRemainingItems(planner);
  const totalAllocatedItems = countTotalAllocatedItems(planner);
  const storageAfterCurrentPlans = totalRemainingItems;
  const isRecipientReadOnly = !!selectedRecipientId;

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-5 p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/60">
              <Link href="/dashboard/orders" className="inline-flex items-center gap-2 font-medium text-foreground">
                <ArrowLeft className="size-4" />
                Orders
              </Link>
              <span>/</span>
              <Link href={`/dashboard/orders/${planner.order.id}`} className="font-medium text-foreground">
                Order #{planner.order.id}
              </Link>
              <span>/</span>
              <span>Shipping & storage</span>
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Shipping planner</h1>
              <p className="text-sm text-foreground/60">
                Plan shipments to saved recipients, keep the rest in warehouse storage, and carry the charges into checkout.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border border-divider shadow-none">
              <CardBody className="p-4">
                <div className="text-xs uppercase tracking-wide text-foreground/50">Warehouse storage</div>
                <div className="mt-2 text-2xl font-semibold">{storageAfterCurrentPlans}</div>
                <div className="text-xs text-foreground/50">$1 per stored unit</div>
              </CardBody>
            </Card>

            <Card className="border border-divider shadow-none">
              <CardBody className="p-4">
                <div className="text-xs uppercase tracking-wide text-foreground/50">Allocated to shipments</div>
                <div className="mt-2 text-2xl font-semibold">{totalAllocatedItems}</div>
              </CardBody>
            </Card>

            <Card className="border border-divider shadow-none">
              <CardBody className="p-4">
                <div className="text-xs uppercase tracking-wide text-foreground/50">Saved shipments</div>
                <div className="mt-2 text-2xl font-semibold">{planner.shipments.length}</div>
              </CardBody>
            </Card>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
        <div className="space-y-6">
          <Card className="border border-divider shadow-sm">
            <CardHeader className="flex items-start justify-between gap-4 px-6 py-5">
              <div>
                <div className="text-xl font-semibold">Recipient and destination</div>
                <div className="text-sm text-foreground/60">
                  Pick a saved recipient or enter a one-off shipping address for this shipment.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard/recipients">
                  <Button variant="bordered" startContent={<ContactRound className="size-4" />}>
                    Manage recipients
                  </Button>
                </Link>
                {selectedRecipientId ? (
                  <Button
                    variant="flat"
                    onPress={() => setSelectedRecipientId("")}
                  >
                    Use manual entry
                  </Button>
                ) : null}
              </div>
            </CardHeader>

            <CardBody className="grid gap-4 px-6 pb-6 pt-0 md:grid-cols-2">
              <Select
                label="Saved recipient"
                selectedKeys={selectedRecipientId ? [selectedRecipientId] : []}
                onSelectionChange={(keys) => setSelectedRecipientId(getSingleSelection(keys))}
                placeholder={isRecipientsLoading ? "Loading recipients..." : "Select from saved recipients"}
                className="md:col-span-2"
              >
                {recipients.map((recipient) => (
                  <SelectItem key={recipient.id}>
                    {formatRecipientName(recipient)} · {recipient.countryName}
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Destination country"
                selectedKeys={[destinationCountryCode]}
                onSelectionChange={(keys) => setDestinationCountryCode(getSingleSelection(keys) || "US")}
                isDisabled={isRecipientReadOnly}
              >
                {SHIPPING_COUNTRIES.map((country) => (
                  <SelectItem key={country.code}>{country.name}</SelectItem>
                ))}
              </Select>

              <Select
                label="Service level"
                selectedKeys={[serviceLevel]}
                onSelectionChange={(keys) => setServiceLevel((getSingleSelection(keys) || "STANDARD") as "STANDARD" | "EXPRESS")}
              >
                {SERVICE_LEVELS.map((item) => (
                  <SelectItem key={item.key}>{item.label}</SelectItem>
                ))}
              </Select>

              <Input
                label="Recipient name"
                value={recipientName}
                onValueChange={setRecipientName}
                isReadOnly={isRecipientReadOnly}
              />
              <Input
                label="Recipient email"
                value={recipientEmail}
                onValueChange={setRecipientEmail}
                isReadOnly={isRecipientReadOnly}
              />
              <Input
                label="Recipient phone"
                value={recipientPhone}
                onValueChange={setRecipientPhone}
                isReadOnly={isRecipientReadOnly}
              />
              <Input
                label="Address line 1"
                value={addressLine1}
                onValueChange={setAddressLine1}
                isReadOnly={isRecipientReadOnly}
              />
              <Input
                label="Address line 2"
                value={addressLine2}
                onValueChange={setAddressLine2}
                isReadOnly={isRecipientReadOnly}
              />
              <Input
                label="City"
                value={city}
                onValueChange={setCity}
                isReadOnly={isRecipientReadOnly}
              />
              <Input
                label="State / region"
                value={stateRegion}
                onValueChange={setStateRegion}
                isReadOnly={isRecipientReadOnly}
              />
              <Input
                label="Postal code"
                value={postalCode}
                onValueChange={setPostalCode}
                isReadOnly={isRecipientReadOnly}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Shipment notes"
                  value={notes}
                  minRows={3}
                  onValueChange={setNotes}
                  placeholder="Special delivery notes or customs details"
                />
              </div>

              {!recipients.length ? (
                <div className="md:col-span-2 rounded-2xl border border-dashed border-divider px-4 py-4 text-sm text-foreground/60">
                  No saved recipients yet. Add one from the Recipients module or keep using manual address entry.
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm">
            <CardHeader className="flex items-center justify-between px-6 py-5">
              <div>
                <div className="text-xl font-semibold">Allocate order items</div>
                <div className="text-sm text-foreground/60">
                  {planner.order.paymentStatus === "PAID"
                    ? "Choose quantities from currently available inventory. Pending warehouse receipt stock cannot be shipped yet."
                    : "Choose the quantities that should ship now. Any remaining quantity stays in warehouse storage."}
                </div>
              </div>

              <Button
                variant="flat"
                onPress={() =>
                  setLineQuantities(
                    Object.fromEntries(
                      planner.items.map((item) => [item.orderItemId, String(item.remainingQuantity)])
                    )
                  )
                }
              >
                Ship all remaining
              </Button>
            </CardHeader>

            <CardBody className="space-y-4 px-6 pb-6 pt-0">
              {planner.items.map((item) => (
                <div
                  key={item.orderItemId}
                  className="grid gap-4 rounded-2xl border border-divider p-4 md:grid-cols-[84px_minmax(0,1fr)_132px]"
                >
                  <div className="flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-2xl bg-default-100">
                    {item.imageUrl ? (
                      <Image removeWrapper src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-xs font-semibold text-foreground/35">
                        {item.productName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold">{item.productName}</div>
                      <div className="text-sm text-foreground/60">{item.variantName || "Standard"}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.shipping.profileName ? (
                        <Chip size="sm" variant="flat">
                          {item.shipping.profileName}
                        </Chip>
                      ) : null}
                      {item.shipping.packageType ? (
                        <Chip size="sm" variant="flat">
                          {formatPackageTypeLabel(item.shipping.packageType)}
                        </Chip>
                      ) : null}
                      {item.shipping.badges.map((badge) => (
                        <Chip key={`${item.orderItemId}-${badge}`} size="sm" color="warning" variant="flat">
                          {badge}
                        </Chip>
                      ))}
                    </div>

                    <div className="grid gap-2 text-sm text-foreground/60 sm:grid-cols-3">
                      <div>Ordered: {item.quantity}</div>
                      <div>Already planned: {item.allocatedQuantity}</div>
                      <div>
                        {planner.order.paymentStatus === "PAID" ? "Available now" : "Still in storage"}: {item.remainingQuantity}
                      </div>
                    </div>
                    {planner.order.paymentStatus === "PAID" && (item.pendingWarehouseQuantity ?? 0) > 0 ? (
                      <div className="text-xs text-warning">
                        {item.pendingWarehouseQuantity} unit(s) still pending warehouse receipt
                      </div>
                    ) : null}
                  </div>

                  <Input
                    label="Ship qty"
                    type="number"
                    min={0}
                    max={item.remainingQuantity}
                    value={lineQuantities[item.orderItemId] ?? "0"}
                    onValueChange={(value) =>
                      setLineQuantities((current) => ({
                        ...current,
                        [item.orderItemId]: value
                      }))
                    }
                  />
                </div>
              ))}
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm">
            <CardHeader className="flex items-center justify-between px-6 py-5">
              <div>
                <div className="text-xl font-semibold">Estimate and save shipment</div>
                <div className="text-sm text-foreground/60">
                  {planner.order.paymentStatus === "PAID"
                    ? "Estimate first, then save a shipment charge for separate payment."
                    : "Estimate first to validate pricing and country restrictions. Saving the shipment updates the order summary."}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="flat"
                  onPress={handleEstimate}
                  isLoading={estimateMutation.isPending}
                  isDisabled={!canEstimate || selectedLines.length === 0}
                >
                  Estimate shipping
                </Button>
                <Button
                  color="primary"
                  className="text-white"
                  style={{ background: "var(--primary-gradient)" }}
                  startContent={<PackageCheck className="size-4" />}
                  onPress={handleCreateShipment}
                  isLoading={createShipmentMutation.isPending}
                  isDisabled={!canWrite || selectedLines.length === 0}
                >
                  Save shipment
                </Button>
              </div>
            </CardHeader>

            <CardBody className="space-y-4 px-6 pb-6 pt-0">
              {!estimate ? (
                <div className="rounded-2xl border border-dashed border-divider px-4 py-6 text-sm text-foreground/60">
                  Select a recipient, choose quantities, then run an estimate to preview shipping cost before checkout.
                </div>
              ) : (
                <>
                  {estimate.issues.length ? (
                    <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-900">
                      <div className="font-semibold">Shipment issues</div>
                      <ul className="mt-2 list-disc pl-5">
                        {estimate.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-divider p-4">
                      <div className="text-xs uppercase tracking-wide text-foreground/50">Zone</div>
                      <div className="mt-2 font-semibold">{estimate.zone.name}</div>
                    </div>
                    <div className="rounded-2xl border border-divider p-4">
                      <div className="text-xs uppercase tracking-wide text-foreground/50">Packages</div>
                      <div className="mt-2 font-semibold">{estimate.packageCount}</div>
                    </div>
                    <div className="rounded-2xl border border-divider p-4">
                      <div className="text-xs uppercase tracking-wide text-foreground/50">Weight</div>
                      <div className="mt-2 font-semibold">{estimate.totalWeightLb} lb</div>
                    </div>
                    <div className="rounded-2xl border border-divider p-4">
                      <div className="text-xs uppercase tracking-wide text-foreground/50">Total</div>
                      <div className="mt-2 font-semibold">{formatMoney(estimate.totalCost, estimate.currency)}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-divider bg-content1 p-4 text-sm">
                    <div className="font-semibold">
                      {estimate.recipientName || estimate.recipient?.firstName || "Recipient"}
                    </div>
                    <div className="mt-1 text-foreground/60">
                      {estimate.addressLine1 || "No address"}
                      {estimate.addressLine2 ? `, ${estimate.addressLine2}` : ""}
                    </div>
                    <div className="text-foreground/60">
                      {estimate.city || "-"}
                      {estimate.state ? `, ${estimate.state}` : ""} {estimate.postalCode || ""}
                    </div>
                    <div className="text-foreground/60">{estimate.destinationCountryName}</div>
                  </div>

                  <div className="space-y-3">
                    {estimate.rateBreakdown.map((group) => (
                      <div key={`${group.zoneId}-${group.packageType}-${group.serviceLevel}`} className="rounded-2xl border border-divider p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold">{formatPackageTypeLabel(group.packageType)}</div>
                            <div className="text-sm text-foreground/60">
                              {formatServiceLabel(group.serviceLevel)} · {group.totalQuantity} units · {group.totalWeightLb} lb
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-foreground/60">Group total</div>
                            <div className="font-semibold">{formatMoney(group.totalCost, group.currency)}</div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-foreground/60 sm:grid-cols-3">
                          <div>Base: {formatMoney(group.baseRate, group.currency)}</div>
                          <div>Handling: {formatMoney(group.handlingFeeTotal, group.currency)}</div>
                          <div>Fuel: {formatMoney(group.fuelSurchargeTotal, group.currency)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border border-divider shadow-sm">
            <CardHeader className="px-6 py-5">
              <div>
                <div className="text-xl font-semibold">Order summary</div>
                <div className="text-sm text-foreground/60">
                  {planner.order.paymentStatus === "PAID"
                    ? "This order is already funded. New shipments from warehouse inventory are billed separately."
                    : "Shipment plans and warehouse storage flow directly into the checkout totals."}
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 px-6 pb-6 pt-0">
              <div className="space-y-1">
                <div className="text-sm text-foreground/60">Customer</div>
                <div className="font-semibold">{planner.order.name}</div>
                <div className="text-sm text-foreground/60">{planner.order.email}</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-foreground/60">Products subtotal</div>
                <div className="font-semibold">{formatMoney(planner.order.totalPrice, planner.order.currency)}</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-foreground/60">Current shipment selection</div>
                <div className="font-semibold">{selectedQuantityTotal} unit(s)</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-foreground/60">Stored after current plans</div>
                <div className="font-semibold">
                  {storageAfterCurrentPlans} unit(s) · {formatMoney(storageAfterCurrentPlans, planner.order.currency)}
                </div>
              </div>

              {estimate ? (
                <div className="rounded-2xl border border-divider bg-content1 p-4">
                  <div className="text-sm text-foreground/60">Current estimate</div>
                  <div className="mt-2 text-2xl font-semibold">{formatMoney(estimate.totalCost, estimate.currency)}</div>
                  <div className="mt-1 text-xs text-foreground/55">
                    {planner.order.paymentStatus === "PAID"
                      ? "Save the shipment to create a separate shipment charge that can be paid from shipment history."
                      : "Save the shipment to add this cost to the order summary."}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-divider pt-4">
                <Link href={`/dashboard/orders/${planner.order.id}`}>
                  <Button variant="bordered" className="w-full">
                    Back to order
                  </Button>
                </Link>
                <Link href="/dashboard/shipments">
                  <Button variant="flat" className="w-full" startContent={<Truck className="size-4" />}>
                    Open shipment tracking
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm">
            <CardHeader className="px-6 py-5">
              <div>
                <div className="text-xl font-semibold">Saved shipments</div>
                <div className="text-sm text-foreground/60">
                  Track all saved shipment plans on this order. Team members can update status as fulfillment progresses.
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 px-6 pb-6 pt-0">
              {!planner.shipments.length ? (
                <div className="rounded-2xl border border-dashed border-divider px-4 py-6 text-sm text-foreground/60">
                  No shipments have been created for this order yet. If you skip shipping, all remaining units stay in storage after payment.
                </div>
              ) : (
                planner.shipments.map((shipment) => (
                  <div key={shipment.id} className="rounded-2xl border border-divider p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold">Shipment #{shipment.id}</div>
                        <div className="text-sm text-foreground/60">
                          {shipment.destinationCountryName} · {formatServiceLabel(shipment.serviceLevel)}
                        </div>
                        <div className="text-sm text-foreground/60">
                          {shipment.packageCount} packages · {shipment.totalWeightLb} lb · {formatMoney(shipment.totalCost, shipment.currency)}
                        </div>
                        <div className="text-sm text-foreground/60">
                          {shipment.recipientName ||
                            (shipment.recipient
                              ? `${shipment.recipient.firstName} ${shipment.recipient.lastName}`
                              : "Recipient")}
                          {shipment.city ? ` · ${shipment.city}` : ""}
                        </div>
                      </div>

                      <div className="w-full max-w-[220px]">
                        {canWrite && !isCustomer ? (
                          <Select
                            label="Status"
                            selectedKeys={[shipment.status]}
                            onSelectionChange={(keys) =>
                              handleStatusChange(
                                shipment,
                                getSingleSelection(keys) as ShippingShipment["status"]
                              )
                            }
                            isDisabled={!canWrite || updateStatusMutation.isPending}
                          >
                            {SHIPMENT_STATUSES.map((status) => (
                              <SelectItem key={status.key}>{status.label}</SelectItem>
                            ))}
                          </Select>
                        ) : (
                          <Chip
                            size="sm"
                            variant="flat"
                            color={shipment.status === "DELIVERED" ? "success" : shipment.status === "FAILURE" ? "danger" : "default"}
                          >
                            {formatShipmentStatusLabel(shipment.status)}
                          </Chip>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Chip size="sm" variant="flat" color={shipment.isInternational ? "warning" : "success"}>
                        {shipment.isInternational ? "International" : "Domestic"}
                      </Chip>
                      <Chip size="sm" variant="flat">
                        {shipment.items.length} line items
                      </Chip>
                      <Chip size="sm" variant="flat">
                        {shipment.billingType === "SEPARATE_PAYMENT" ? "Separate payment" : "Included in order"}
                      </Chip>
                      <Chip size="sm" variant="flat" color={shipment.paymentStatus === "PAID" ? "success" : shipment.paymentStatus === "PENDING" ? "warning" : "default"}>
                        {shipment.paymentStatus}
                      </Chip>
                      <Chip size="sm" variant="flat">
                        Updated {formatDateTime(shipment.updatedAt)}
                      </Chip>
                    </div>

                    {(shipment.trackingNumber || shipment.trackingUrl || shipment.carrier) ? (
                      <div className="mt-4 rounded-2xl border border-divider bg-content1 p-3 text-sm text-foreground/65">
                        <div className="font-medium text-foreground">Tracking</div>
                        <div className="mt-1">{shipment.carrier || "Carrier pending"}</div>
                        <div>{shipment.trackingNumber || "Tracking number pending"}</div>
                        {shipment.trackingUrl ? (
                          <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                            Open carrier tracking
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    {shipment.billingType === "SEPARATE_PAYMENT" && shipment.paymentStatus !== "PAID" && isCustomer ? (
                      <div className="mt-4">
                        <Link href={`/dashboard/shipments/${shipment.id}/checkout`}>
                          <Button
                            size="sm"
                            color="primary"
                            style={{ backgroundImage: "var(--primary-gradient)" }}
                          >
                            Pay shipment charge
                          </Button>
                        </Link>
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-2 text-sm text-foreground/60">
                      {shipment.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4">
                          <div className="min-w-0 truncate">
                            {item.productName}
                            {item.variantName ? ` · ${item.variantName}` : ""}
                          </div>
                          <div className="shrink-0">
                            {item.quantity} × {formatPackageTypeLabel(item.packageType)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
