"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardBody } from "@heroui/react";

function OrderConfirmationContent() {
  const params = useSearchParams();
  const orderId = params.get("id");
  const email = params.get("email");

  return (
    <div className="container">
      <Card className="mx-auto max-w-2xl border border-black/10 bg-white shadow-sm">
        <CardBody className="space-y-6 p-10 text-center">
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

          {orderId ? (
            <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-black/60">
              Reference: <span className="font-semibold text-black">{orderId}</span>
            </div>
          ) : null}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/shop">
              <Button variant="bordered" className="h-12 w-full sm:w-auto">
                Continue shopping
              </Button>
            </Link>
            <Link href="/">
              <Button
                color="primary"
                className="h-12 w-full text-white sm:w-auto"
                style={{ backgroundImage: "var(--primary-gradient)" }}
              >
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
