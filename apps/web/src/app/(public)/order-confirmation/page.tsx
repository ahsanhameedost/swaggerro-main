"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardBody } from "@heroui/react";
import { PackageSearch } from "lucide-react";
import { trackPublicOrderByToken } from "@/modules/catalog/public/api";
import { formatOrderNumber, formatOrderTypeLabel } from "@/lib/order-flow";

function OrderConfirmationContent() {
  const params = useSearchParams();
  const orderId = params.get("id");
  const email = params.get("email");

  // The URL only carries the internal order id; fetch the order (account-free,
  // by token) so we can show the human order number, items and dates instead of
  // the raw cuid.
  const { data, isLoading } = useQuery({
    queryKey: ["order-confirmation", orderId],
    queryFn: () => trackPublicOrderByToken(orderId!),
    enabled: Boolean(orderId),
    retry: false,
    staleTime: 60_000
  });
  const tracking = data?.tracking;

  return (
    <div className="container py-10 lg:py-14">
      <Card className="mx-auto max-w-2xl border border-black/10 bg-white shadow-sm">
        <CardBody className="space-y-6 p-8 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100 text-3xl">
            ✓
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-black">
              Thank you! Your request was received
            </h1>
            <p className="text-black/60">
              Our team will review your project and get back to you
              {email ? ` at ${email}` : ""} within 24–48 hours with mockups and a quote.
            </p>
          </div>

          {tracking ? (
            <div className="rounded-2xl border border-black/10 bg-zinc-50/70 p-5 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                    Order number
                  </p>
                  <p className="text-2xl font-bold text-black">
                    {formatOrderNumber(tracking.orderNumber)}
                  </p>
                </div>
                <span className="rounded-full border border-primary/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
                  {formatOrderTypeLabel(tracking.type)}
                </span>
              </div>

              <div className="mt-3 grid gap-1 text-sm text-black/60">
                {tracking.projectName ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-black/45">Project</span>
                    <span className="text-right font-medium text-black/80">
                      {tracking.projectName.replace(/\s*catalog order\s*$/i, "").trim()}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <span className="text-black/45">Placed</span>
                  <span className="text-right font-medium text-black/80">
                    {new Date(tracking.createdAt).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-black/45">Status</span>
                  <span className="text-right font-medium text-black/80">
                    {tracking.paymentStatus === "PAID" ? "Paid" : "Awaiting quote & approval"}
                  </span>
                </div>
              </div>

              {tracking.items.length ? (
                <div className="mt-4 border-t border-black/10 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/40">
                    Items
                  </p>
                  <ul className="space-y-1.5">
                    {tracking.items.map((item, i) => (
                      <li
                        key={`${item.productName}-${i}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-black/80">{item.productName}</span>
                        <span className="shrink-0 text-black/45">× {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : isLoading ? (
            <div className="mx-auto h-24 w-full max-w-md animate-pulse rounded-2xl bg-zinc-100" />
          ) : orderId ? (
            <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-black/60">
              Reference: <span className="font-semibold text-black">{orderId}</span>
            </div>
          ) : null}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {orderId ? (
              <Link href={`/track?token=${orderId}`}>
                <Button
                  color="primary"
                  className="h-12 w-full text-white sm:w-auto"
                  style={{ backgroundImage: "var(--primary-gradient)" }}
                  startContent={<PackageSearch className="size-4" />}
                >
                  Track your order
                </Button>
              </Link>
            ) : null}
            <Link href="/shop">
              <Button variant="bordered" className="h-12 w-full sm:w-auto">
                Continue shopping
              </Button>
            </Link>
            <Link href="/">
              <Button variant="light" className="h-12 w-full sm:w-auto">
                Back to home
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center text-black/50">Loading…</div>}>
      <OrderConfirmationContent />
    </Suspense>
  );
}
