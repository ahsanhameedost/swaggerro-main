"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardBody, Chip, Divider, Image, Spinner } from "@heroui/react";
import { ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";
import { useCatalogOrder } from "@/lib/queries.catalog";
import { formatMoney } from "@/lib/money";
import { useMe } from "@/queries/auth";
import { StripeCardPaymentForm } from "@/app/components/dashboard/orders/StripeCardPaymentForm";
import { TestPaymentForm } from "@/app/components/dashboard/orders/TestPaymentForm";
import { formatItemTypeLabel, formatOrderTypeLabel } from "@/lib/order-flow";
import { hasPermission } from "@/lib/permissions";

const PAYMENTS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENTS_TEST_MODE === "true";

const CHECKOUT_STEPS = [
  { key: "review", label: "Review Order" },
  { key: "funds", label: "Add Funds" },
  { key: "payment", label: "Payment Method" },
  { key: "summary", label: "Order Summary" }
] as const;

function CheckoutStepper() {
  return (
    <div className="rounded-3xl border border-divider bg-background px-6 py-5 shadow-sm">
      <div className="mb-6 h-1 rounded-full bg-primary/15">
        <div className="h-full w-full rounded-full bg-primary" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {CHECKOUT_STEPS.map((step, index) => {
          const isComplete = index < 2;
          const isCurrent = index === 2;
          const isFinal = index === 3;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={[
                  "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                  isCurrent
                    ? "bg-primary text-white"
                    : isComplete || isFinal
                      ? "bg-default-200 text-foreground/70"
                      : "bg-default-100 text-foreground/50"
                ].join(" ")}
              >
                {isFinal ? "✓" : index + 1}
              </div>
              <div className={isCurrent ? "font-medium text-primary" : "text-foreground/60"}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderCheckoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data: user, isLoading: isLoadingUser } = useMe();
  const isCustomer = hasPermission(user, "orders.self.read");
  const { data, isLoading, isError, error } = useCatalogOrder(orderId ?? "", !!orderId && isCustomer);
  const order = data?.order;

  if (isLoadingUser) {
    return (
      <Card>
        <CardBody className="flex min-h-[320px] items-center justify-center">
          <Spinner label="Loading checkout..." />
        </CardBody>
      </Card>
    );
  }

  if (!isCustomer) {
    return (
      <Card>
        <CardBody>You do not have permission to access checkout.</CardBody>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex min-h-[320px] items-center justify-center">
          <Spinner label="Loading checkout..." />
        </CardBody>
      </Card>
    );
  }

  if (isError || !order) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <div className="text-lg font-semibold text-danger">Unable to load checkout.</div>
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

  if (!order.allItemsReadyToOrder) {
    return (
      <div className="flex flex-col gap-6">
        <Link href={`/dashboard/orders/${order.id}`} className="inline-flex items-center gap-2 text-sm text-foreground/60">
          <ArrowLeft className="size-4" />
          Back to order
        </Link>

        <Card className="border border-warning/30 shadow-sm">
          <CardBody className="space-y-4 p-8">
            <div className="text-2xl font-semibold">Checkout is locked</div>
            <div className="text-sm text-foreground/60">
              You can proceed with the Request once all the Products are Approved.
            </div>
            <div>
              <Link href={`/dashboard/orders/${order.id}`}>
                <Button color="primary" style={{ backgroundImage: "var(--primary-gradient)" }}>
                  Review designs
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (order.paymentStatus === "PAID") {
    return (
      <div className="flex flex-col gap-6">
        <Link href={`/dashboard/orders/${order.id}`} className="inline-flex items-center gap-2 text-sm text-foreground/60">
          <ArrowLeft className="size-4" />
          Back to order
        </Link>

        <Card className="border border-success/30 shadow-sm">
          <CardBody className="space-y-5 p-8">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-8 text-success" />
              <div>
                <div className="text-2xl font-semibold">Payment complete</div>
                <div className="text-sm text-foreground/60">
                  Order #{order.id} was paid successfully{order.paidAt ? ` on ${new Date(order.paidAt).toLocaleString()}` : ""}.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-divider bg-content1 p-5">
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground/50">
                Amount paid
              </div>
              <div className="text-3xl font-semibold">{formatMoney(order.totalDue, order.currency)}</div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/dashboard/orders/${order.id}`}>
                <Button color="primary" style={{ backgroundImage: "var(--primary-gradient)" }}>
                  Back to order
                </Button>
              </Link>
              <Link href="/dashboard/orders">
                <Button variant="bordered">My orders</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/dashboard/orders/${order.id}`} className="inline-flex items-center gap-2 text-sm text-foreground/60">
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="flex items-center gap-2 rounded-full bg-content1 px-4 py-2 text-sm text-foreground/65">
          <LockKeyhole className="size-4" />
          {PAYMENTS_TEST_MODE ? "Test checkout (no real charge)" : "Secure checkout powered by Stripe"}
        </div>
      </div>

      <CheckoutStepper />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <div className="space-y-6">
          <Card className="border border-divider shadow-sm">
            <CardBody className="space-y-6 p-6">
              <div>
                <div className="text-3xl font-semibold tracking-tight">Review your order</div>
                <div className="mt-2 text-sm text-foreground/60">
                  Confirm your items and submit payment to place the order.
                </div>
              </div>

              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-4 rounded-3xl border border-divider p-5 md:grid-cols-[140px_minmax(0,1fr)_auto]"
                  >
                    <div className="flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-3xl bg-default-100">
                      {item.imageUrl ? (
                        <Image
                          removeWrapper
                          src={item.imageUrl}
                          alt={item.productName}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="text-sm text-foreground/35">No image</div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-2xl font-semibold">{item.productName}</div>
                        <Chip size="sm" variant="flat">
                          {formatItemTypeLabel(item.itemType)}
                        </Chip>
                        <Chip size="sm" variant="flat" color="success">
                          Approved
                        </Chip>
                      </div>

                      <div className="text-base text-foreground/70">{item.variantName || "Standard"}</div>
                      <div className="text-sm text-foreground/60">
                        {item.itemType === "BULK"
                          ? `Item Count: ${item.quantity}`
                          : `${item.quantityPerPack ?? 1} / pack · ${item.quantity} total`}
                      </div>
                      <div className="text-sm text-foreground/60">
                        Cost: {formatMoney(item.unitPrice, order.currency)} per unit
                      </div>
                    </div>

                    <div className="space-y-2 text-right">
                      <div className="text-sm text-foreground/60">{formatOrderTypeLabel(order.type)}</div>
                      <div className="text-3xl font-semibold">{formatMoney(item.totalPrice, order.currency)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-3xl border border-divider bg-content1 px-5 py-4">
                <div className="text-sm text-foreground/60">
                  Shipping is added from saved shipment plans and any unallocated quantity stays in warehouse storage at $1 per unit, then appears in Inventory after payment.
                </div>
                <div className="text-2xl font-semibold">
                  Subtotal: {formatMoney(order.totalPrice, order.currency)}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm">
            <CardBody className="space-y-5 p-6">
              <div>
                <div className="text-2xl font-semibold">Payment method</div>
                <div className="mt-2 text-sm text-foreground/60">
                  Enter your card details below to complete your order.
                </div>
              </div>

              {PAYMENTS_TEST_MODE ? (
                <TestPaymentForm
                  orderId={order.id}
                  amount={order.totalDue}
                  currency={order.currency}
                  onSuccess={() => router.refresh()}
                />
              ) : (
                <StripeCardPaymentForm
                  orderId={order.id}
                  amount={order.totalDue}
                  currency={order.currency}
                  customerName={order.name}
                  email={order.email}
                  phone={order.phone}
                  onSuccess={() => router.refresh()}
                />
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="border border-divider shadow-sm">
          <CardBody className="space-y-5 p-6">
            <div>
              <div className="text-3xl font-semibold">Order Summary</div>
              <div className="mt-2 text-sm text-foreground/60">Order #{order.id}</div>
            </div>

            <div className="space-y-3">
              <div className="text-xl font-semibold">Products</div>
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-foreground/55">
                      {formatMoney(item.unitPrice, order.currency)} x {item.quantity}
                    </div>
                  </div>
                  <div className="font-medium">{formatMoney(item.totalPrice, order.currency)}</div>
                </div>
              ))}
            </div>

            <Divider />

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground/60">Subtotal</span>
                <span>{formatMoney(order.totalPrice, order.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60">Rush Production</span>
                <span>{formatMoney(0, order.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60">Funds for Future Shipments</span>
                <span>{formatMoney(0, order.currency)}</span>
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
            </div>

            <Divider />

            <div className="flex items-center justify-between text-3xl font-semibold">
              <span>Total</span>
              <span>{formatMoney(order.totalDue, order.currency)}</span>
            </div>

            <div className="rounded-3xl border border-divider bg-content1 px-4 py-3 text-xs text-foreground/55">
              Orders are charged with Stripe — your card is confirmed securely in the browser, then verified server-side before the order is marked paid.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
