"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@heroui/react";
import { PackageOpen } from "lucide-react";
import { usePublicStore } from "@/queries/stores";
import { useMe } from "@/queries/auth";
import { useCatalogCartStore, getCartItemKey } from "@/lib/cart-store";
import { createStoreCheckout, confirmStoreCheckout } from "@/modules/store-checkout/api";
import { StoreBrandHeader, StoreBrandFooter } from "@/app/components/stores/StoreChrome";
import { CheckoutView } from "@/app/components/checkout/CheckoutView";

export default function StoreCheckoutPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { data: storeData, isLoading: storeLoading } = usePublicStore(slug ?? null);
  const store = storeData?.store;
  const { data: me, isLoading: meLoading } = useMe();

  const bulkItems = useCatalogCartStore((s) => s.bulkItems);
  const removeBulkItem = useCatalogCartStore((s) => s.removeBulkItem);

  const items = useMemo(
    () => bulkItems.filter((i) => i.storeId && store && i.storeId === store.id),
    [bulkItems, store],
  );

  const categories = useMemo(() => {
    if (!store) return [] as string[];
    const set = new Set<string>();
    store.products.forEach((p) => p.category?.name && set.add(p.category.name));
    return Array.from(set);
  }, [store]);

  if (storeLoading || meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading checkout…" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="swag-redesign flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <PackageOpen className="size-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Store not found</h1>
      </div>
    );
  }

  // Inject the tenant theme so the checkout re-skins to the store's brand.
  const themeVars = {
    "--primary": store.theme.primary,
    "--ring": store.theme.primary,
    "--brand-soft": store.theme.primarySoft,
    "--accent": store.theme.primarySoft,
    "--secondary": store.theme.secondary,
    "--secondary-foreground": "#ffffff",
    "--primary-foreground": store.theme.primaryForeground,
  } as React.CSSProperties;

  return (
    <div style={themeVars} className="swag-redesign flex min-h-screen flex-col bg-background">
      <StoreBrandHeader store={store} products={store.products} logoScale={store.logoScale} />

      <main className="flex-1">
        <CheckoutView
          items={items}
          authed={!!me}
          prefillName={me ? [me.firstName, me.lastName].filter(Boolean).join(" ") : ""}
          prefillEmail={me?.email ?? ""}
          prefillPhone={me?.phone ?? ""}
          backHref={`/store/${store.slug}`}
          backLabel={`Back to ${store.name}`}
          browseHref={`/store/${store.slug}`}
          browseLabel={`Browse ${store.name}`}
          signInHref={`/login?next=${encodeURIComponent(`/store/${store.slug}/checkout`)}`}
          emptyText="You have no items from this store in your cart."
          createSession={(payload) => createStoreCheckout({ storeSlug: store.slug, ...payload })}
          confirm={(orderId, paymentIntentId) => confirmStoreCheckout({ orderId, paymentIntentId })}
          onCleared={() => items.forEach((i) => removeBulkItem(getCartItemKey(i)))}
          primaryStyle={{ backgroundColor: "var(--primary)" }}
        />
      </main>

      <StoreBrandFooter store={store} categories={categories} logoScale={store.logoScale} footerColor={store.theme.footer} />
    </div>
  );
}
