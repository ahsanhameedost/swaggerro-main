"use client";

import { useMemo } from "react";
import { Spinner } from "@heroui/react";
import { useMe } from "@/queries/auth";
import { useCatalogCartStore, getCartItemKey } from "@/lib/cart-store";
import { createPublicCheckout, confirmPublicCheckout } from "@/modules/public-checkout/api";
import { CheckoutView } from "@/app/components/checkout/CheckoutView";

export default function PublicCheckoutPage() {
  const { data: me, isLoading: meLoading } = useMe();

  const bulkItems = useCatalogCartStore((s) => s.bulkItems);
  const removeBulkItem = useCatalogCartStore((s) => s.removeBulkItem);

  // Only global-shop items (no store attribution). Store items check out through
  // their own /store/[slug]/checkout.
  const items = useMemo(() => bulkItems.filter((i) => !i.storeId), [bulkItems]);

  if (meLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading checkout…" />
      </div>
    );
  }

  return (
    <div className="swag-redesign">
      <CheckoutView
        items={items}
        authed={!!me}
        prefillName={me ? [me.firstName, me.lastName].filter(Boolean).join(" ") : ""}
        prefillEmail={me?.email ?? ""}
        prefillPhone={me?.phone ?? ""}
        backHref="/shop"
        backLabel="Back to shop"
        browseHref="/shop"
        browseLabel="Browse the shop"
        signInHref={`/login?next=${encodeURIComponent("/checkout")}`}
        emptyText="Your cart is empty."
        createSession={(payload) => createPublicCheckout(payload)}
        confirm={(orderId, paymentIntentId) => confirmPublicCheckout({ orderId, paymentIntentId })}
        onCleared={() => items.forEach((i) => removeBulkItem(getCartItemKey(i)))}
        primaryStyle={{ backgroundImage: "var(--primary-gradient)", backgroundColor: "var(--primary)" }}
      />
    </div>
  );
}
