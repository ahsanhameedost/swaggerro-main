"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardBody, Chip, Divider, Spinner } from "@heroui/react";
import { ArrowLeft, CreditCard, PackageCheck } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useShipment } from "@/queries/shipping";
import { formatMoney } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { SquareShipmentPaymentForm } from "@/app/components/dashboard/shipments/SquareShipmentPaymentForm";

export default function ShipmentCheckoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const shipmentId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data: user } = useMe();
  const canPay = hasPermission(user, "shipping.shipments.self.write");
  const { data: shipment, isLoading, isError, error } = useShipment(shipmentId ?? "", canPay && !!shipmentId);

  if (!canPay) {
    return (
      <Card>
        <CardBody>You do not have permission to pay for shipment charges.</CardBody>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex min-h-[320px] items-center justify-center">
          <Spinner label="Loading shipment payment..." />
        </CardBody>
      </Card>
    );
  }

  if (isError || !shipment) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <div className="text-lg font-semibold text-danger">Unable to load this shipment.</div>
          <div className="text-sm text-foreground/60">
            {error instanceof Error ? error.message : "Shipment not found."}
          </div>
          <Link href="/dashboard/shipments">
            <Button variant="bordered">Back to shipments</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const recipientName =
    shipment.recipientName ||
    (shipment.recipient ? `${shipment.recipient.firstName} ${shipment.recipient.lastName}` : "Recipient");

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-4 p-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm" variant="flat">
                Shipment #{shipment.id}
              </Chip>
              <Chip size="sm" variant="flat">
                {shipment.billingType === "SEPARATE_PAYMENT" ? "Separate payment" : "Included in order"}
              </Chip>
              <Chip size="sm" variant="flat">
                {shipment.paymentStatus}
              </Chip>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Pay shipment charge</h1>
              <p className="text-sm text-foreground/60">
                Complete this payment to release inventory for shipment fulfillment.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href={`/dashboard/orders/${shipment.orderId}`}>
              <Button variant="bordered" startContent={<ArrowLeft className="size-4" />}>
                Back to order
              </Button>
            </Link>
            <Link href="/dashboard/shipments">
              <Button variant="bordered">All shipments</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <Card className="border border-divider shadow-sm">
          <CardBody className="space-y-5 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-foreground/60">Recipient</div>
                <div className="font-semibold">{recipientName}</div>
                <div className="text-sm text-foreground/60">{shipment.destinationCountryName}</div>
              </div>
              <div>
                <div className="text-sm text-foreground/60">Service</div>
                <div className="font-semibold">{shipment.serviceLevel}</div>
                <div className="text-sm text-foreground/60">{shipment.packageCount} package(s)</div>
              </div>
            </div>

            <Divider />

            <div className="space-y-2">
              {shipment.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-foreground/55">{item.variantName || "Standard"}</div>
                  </div>
                  <div className="shrink-0">{item.quantity} units</div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-divider bg-content1 p-4 text-sm text-foreground/65">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <PackageCheck className="size-4" />
                Billing rule
              </div>
              <div className="mt-2">
                This shipment was created after the order was already paid, so its shipping charge is billed separately.
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-divider shadow-sm">
          <CardBody className="space-y-5 p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/50">
                <CreditCard className="size-4" />
                Shipment total
              </div>
              <div className="text-3xl font-semibold">{formatMoney(shipment.totalCost, shipment.currency)}</div>
              <div className="text-sm text-foreground/60">
                Pay now to reserve inventory and move this shipment into fulfillment.
              </div>
            </div>

            {shipment.paymentStatus === "PAID" ? (
              <Button className="w-full" color="success" isDisabled>
                Shipment already paid
              </Button>
            ) : (
              <SquareShipmentPaymentForm
                shipmentId={shipment.id}
                amount={shipment.totalCost}
                currency={shipment.currency}
                customerName={user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.email ?? "Customer"}
                email={user?.email ?? ""}
                onSuccess={async () => {
                  router.push(`/dashboard/orders/${shipment.orderId}`);
                  router.refresh();
                }}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
