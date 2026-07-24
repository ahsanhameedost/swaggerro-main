"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Image,
  Input,
  Spinner,
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  Loader2,
  MapPin,
  LockKeyhole,
} from "lucide-react";
import { useCatalogOrder } from "@/lib/queries.catalog";
import { validateCoupon } from "@/modules/coupons/api";
import { formatMoney } from "@/lib/money";
import { downloadApiFile } from "@/lib/download";
import { useMe } from "@/queries/auth";
import { StripeCardPaymentForm } from "@/app/components/dashboard/orders/StripeCardPaymentForm";
import { TestPaymentForm } from "@/app/components/dashboard/orders/TestPaymentForm";
import {
  formatItemTypeLabel,
  formatOrderNumber,
  formatOrderTypeLabel,
} from "@/lib/order-flow";
import { hasPermission } from "@/lib/permissions";

// Lightweight, dependency-free confetti burst for the success screen.
function Confetti() {
  const pieces = [
    { left: "8%", color: "#005CFE", delay: "0s", dur: "2.6s" },
    { left: "18%", color: "#22c55e", delay: "0.15s", dur: "2.9s" },
    { left: "28%", color: "#f59e0b", delay: "0.05s", dur: "2.7s" },
    { left: "38%", color: "#005CFE", delay: "0.25s", dur: "3.1s" },
    { left: "48%", color: "#ef4444", delay: "0.1s", dur: "2.5s" },
    { left: "58%", color: "#22c55e", delay: "0.3s", dur: "2.8s" },
    { left: "68%", color: "#f59e0b", delay: "0.18s", dur: "3s" },
    { left: "78%", color: "#005CFE", delay: "0.08s", dur: "2.6s" },
    { left: "88%", color: "#ef4444", delay: "0.22s", dur: "2.9s" },
    { left: "13%", color: "#22c55e", delay: "0.4s", dur: "2.7s" },
    { left: "63%", color: "#005CFE", delay: "0.35s", dur: "3.2s" },
    { left: "83%", color: "#f59e0b", delay: "0.45s", dur: "2.6s" },
  ];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0 overflow-visible"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="cc-confetti"
          style={{
            left: p.left,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
      <style>{`
        .cc-confetti{position:absolute;top:0;width:8px;height:14px;border-radius:2px;opacity:0;transform:translateY(-24px);animation-name:cc-fall;animation-timing-function:cubic-bezier(.3,.6,.4,1);animation-fill-mode:forwards;}
        @keyframes cc-fall{0%{opacity:1;transform:translateY(-24px) rotate(0deg)}100%{opacity:0;transform:translateY(360px) rotate(600deg)}}
        @media (prefers-reduced-motion: reduce){.cc-confetti{display:none}}
      `}</style>
    </div>
  );
}

const PAYMENTS_TEST_MODE =
  process.env.NEXT_PUBLIC_PAYMENTS_TEST_MODE === "true";

const CHECKOUT_STEPS = [
  { key: "review", label: "Review Order" },
  { key: "payment", label: "Payment Method" },
  { key: "summary", label: "Order Summary" },
] as const;

function CheckoutStepper() {
  const currentIndex = 1; // Payment Method

  return (
    <div className="rounded-3xl border border-divider bg-background px-6 py-4 shadow-sm">
      <div className="flex items-center">
        {CHECKOUT_STEPS.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === CHECKOUT_STEPS.length - 1;

          return (
            <div
              key={step.key}
              className={isLast ? "flex items-center" : "flex flex-1 items-center"}
            >
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    isComplete
                      ? "bg-primary text-white"
                      : isCurrent
                        ? "bg-primary text-white ring-4 ring-primary/15"
                        : "bg-default-100 text-foreground/50",
                  ].join(" ")}
                >
                  {isComplete ? <Check className="size-4" /> : index + 1}
                </div>
                <div
                  className={[
                    "whitespace-nowrap text-sm",
                    isCurrent
                      ? "font-semibold text-primary"
                      : isComplete
                        ? "font-medium text-foreground/80"
                        : "text-foreground/50",
                  ].join(" ")}
                >
                  {step.label}
                </div>
              </div>

              {!isLast ? (
                <div
                  className={[
                    "mx-4 h-0.5 flex-1 rounded-full",
                    isComplete ? "bg-primary" : "bg-default-200",
                  ].join(" ")}
                />
              ) : null}
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
  const { data, isLoading, isError, error } = useCatalogOrder(
    orderId ?? "",
    !!orderId && isCustomer,
  );
  const order = data?.order;

  // Coupon (optional) — previewed against this order's items, then applied at
  // payment time via the payment-intent call so the charge reflects the discount.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || !order) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await validateCoupon({
        code,
        storeId: null,
        lines: order.items.map((i) => ({
          productId: (i as { productId?: string }).productId ?? i.id,
          lineTotal: i.totalPrice,
        })),
      });
      setAppliedCoupon({ code: res.code, discount: res.discountAmount });
      addToast({ title: `Coupon ${res.code} applied`, color: "success" });
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.message ?? "That coupon can't be used.");
    } finally {
      setApplyingCoupon(false);
    }
  };

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
          <div className="text-lg font-semibold text-danger">
            Unable to load checkout.
          </div>
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
        <Link
          href={`/dashboard/orders/${formatOrderNumber(order.orderNumber)}`}
          className="inline-flex items-center gap-2 text-sm text-foreground/60"
        >
          <ArrowLeft className="size-4" />
          Back to order
        </Link>

        <Card className="border border-warning/30 shadow-sm">
          <CardBody className="space-y-4 p-8">
            <div className="text-2xl font-semibold">Checkout is locked</div>
            <div className="text-sm text-foreground/60">
              You can proceed with the Request once all the Products are
              Approved.
            </div>
            <div>
              <Link
                href={`/dashboard/orders/${formatOrderNumber(order.orderNumber)}`}
              >
                <Button
                  color="primary"
                  style={{ backgroundImage: "var(--primary-gradient)" }}
                >
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
        <Link
          href={`/dashboard/orders/${formatOrderNumber(order.orderNumber)}`}
          className="inline-flex items-center gap-2 text-sm text-foreground/60"
        >
          <ArrowLeft className="size-4" />
          Back to order
        </Link>

        <Card className="relative overflow-hidden border border-success/30 shadow-sm">
          <Confetti />
          <CardBody className="items-center gap-5 p-10 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success/12">
              <CheckCircle2 className="size-9 text-success" />
            </div>

            <div className="space-y-1.5">
              <div className="font-display text-3xl font-bold tracking-tight">
                Your order is paid 🎉
              </div>
              <div className="text-sm text-foreground/60">
                Order{" "}
                <span className="font-semibold text-foreground">
                  {formatOrderNumber(order.orderNumber)}
                </span>{" "}
                is confirmed
                {order.paidAt
                  ? ` — paid on ${new Date(order.paidAt).toLocaleDateString()}`
                  : ""}
                . We're getting to work; you can track it any time.
              </div>
            </div>

            <div className="w-full max-w-xs rounded-2xl border border-divider bg-content1 p-5">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                Amount paid
              </div>
              <div className="font-display text-4xl font-bold text-success">
                {formatMoney(order.totalDue, order.currency)}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/dashboard/orders/${formatOrderNumber(order.orderNumber)}`}
              >
                <Button
                  color="primary"
                  startContent={<MapPin className="size-4" />}
                  style={{
                    backgroundImage: "var(--primary-gradient)",
                    color: "#fff",
                  }}
                >
                  Track your order
                </Button>
              </Link>
              <Button
                variant="bordered"
                startContent={<Download className="size-4" />}
                onPress={() =>
                  void downloadApiFile(
                    `/catalog/orders/${order.id}/invoice.pdf`,
                    `swaggeroo-invoice-${formatOrderNumber(order.orderNumber)}.pdf`,
                  )
                }
              >
                Download invoice
              </Button>
              <Link href="/dashboard/orders">
                <Button variant="light">My orders</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const discount = appliedCoupon
    ? Math.min(appliedCoupon.discount, order.totalDue)
    : 0;
  const payTotal = Math.max(0, order.totalDue - discount);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/orders/${formatOrderNumber(order.orderNumber)}`}
          className="inline-flex items-center gap-2 text-sm text-foreground/60"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="flex items-center gap-2 rounded-full bg-content1 px-4 py-2 text-sm text-foreground/65">
          <LockKeyhole className="size-4" />
          {PAYMENTS_TEST_MODE
            ? "Test checkout (no real charge)"
            : "Secure checkout powered by Stripe"}
        </div>
      </div>

      <CheckoutStepper />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <div className="space-y-6">
          <Card className="border border-divider shadow-sm">
            <CardBody className="space-y-6 p-6">
              <div>
                <div className="text-3xl font-semibold tracking-tight">
                  Review your order
                </div>
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
                        <div className="text-sm text-foreground/35">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-2xl font-semibold">
                          {item.productName}
                        </div>
                        <Chip size="sm" variant="flat">
                          {formatItemTypeLabel(item.itemType)}
                        </Chip>
                        <Chip size="sm" variant="flat" color="success">
                          Approved
                        </Chip>
                      </div>

                      <div className="text-base text-foreground/70">
                        {item.variantName || "Standard"}
                      </div>
                      <div className="text-sm text-foreground/60">
                        {item.itemType === "BULK"
                          ? `Item Count: ${item.quantity}`
                          : `${item.quantityPerPack ?? 1} / pack · ${item.quantity} total`}
                      </div>
                      <div className="text-sm text-foreground/60">
                        Cost: {formatMoney(item.unitPrice, order.currency)} per
                        unit
                      </div>
                    </div>

                    <div className="space-y-2 text-right">
                      <div className="text-sm text-foreground/60">
                        {formatOrderTypeLabel(order.type)}
                      </div>
                      <div className="text-3xl font-semibold">
                        {formatMoney(item.totalPrice, order.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-3xl border border-divider bg-content1 px-5 py-4">
                <div className="text-sm text-foreground/60">
                  Shipping is added from saved shipment plans and any
                  unallocated quantity stays in warehouse storage at $1 per
                  unit, then appears in Inventory after payment.
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
                <div className="text-3xl font-semibold">Order Summary</div>
                <div className="mt-2 text-sm text-foreground/60">
                  Order {formatOrderNumber(order.orderNumber)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xl font-semibold">Products</div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-foreground/55">
                        {formatMoney(item.unitPrice, order.currency)} x{" "}
                        {item.quantity}
                      </div>
                    </div>
                    <div className="font-medium">
                      {formatMoney(item.totalPrice, order.currency)}
                    </div>
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
                  <span className="text-foreground/60">
                    Funds for Future Shipments
                  </span>
                  <span>{formatMoney(0, order.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/60">
                    Storage ({order.storageQuantity} units)
                  </span>
                  <span>{formatMoney(order.storageCost, order.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/60">
                    Shipping ({order.shipmentCount} saved)
                  </span>
                  <span>{formatMoney(order.shippingCost, order.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/60">
                    Estimated taxes & fees
                  </span>
                  <span>{formatMoney(order.taxesAndFees, order.currency)}</span>
                </div>
                {discount > 0 ? (
                  <div className="flex items-center justify-between font-medium text-success">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>−{formatMoney(discount, order.currency)}</span>
                  </div>
                ) : null}
              </div>

              <Divider />

              {/* Coupon code */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-2xl border border-success/40 bg-success/5 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-success">
                    <CheckCircle2 className="size-4" /> {appliedCoupon.code}{" "}
                    applied
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput("");
                    }}
                    className="text-xs font-medium text-foreground/60 hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <Input
                      size="sm"
                      placeholder="Coupon code"
                      value={couponInput}
                      onValueChange={(v) => {
                        setCouponInput(v.toUpperCase());
                        setCouponError(null);
                      }}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="bordered"
                      isDisabled={applyingCoupon || !couponInput.trim()}
                      onPress={() => void applyCoupon()}
                    >
                      {applyingCoupon ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  {couponError ? (
                    <p className="mt-1.5 text-xs text-danger">{couponError}</p>
                  ) : null}
                </div>
              )}

              <div className="flex items-center justify-between text-3xl font-semibold">
                <span>Total</span>
                <span>{formatMoney(payTotal, order.currency)}</span>
              </div>

              <div className="rounded-3xl border border-divider bg-content1 px-4 py-3 text-xs text-foreground/55">
                Orders are charged with Stripe — your card is confirmed securely
                in the browser, then verified server-side before the order is
                marked paid.
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
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
                  amount={payTotal}
                  currency={order.currency}
                  couponCode={appliedCoupon?.code ?? null}
                  onSuccess={() => router.refresh()}
                />
              ) : (
                <StripeCardPaymentForm
                  orderId={order.id}
                  amount={payTotal}
                  currency={order.currency}
                  customerName={order.name}
                  email={order.email}
                  phone={order.phone}
                  couponCode={appliedCoupon?.code ?? null}
                  onSuccess={() => router.refresh()}
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
