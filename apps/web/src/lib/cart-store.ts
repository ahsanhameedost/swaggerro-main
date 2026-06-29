import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CatalogPricingOption } from "./catalog";
import { createDefaultSwagPackName } from "./catalog-cart";

type CartItemBase = {
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  productCatalogVariantId?: string | null;
  variantName?: string | null;
  basePrice: number;
  compareAtPrice?: number | null;
  stock: number;
  minQty: number;
  currency: string;
  pricingOptions: CatalogPricingOption[];
  // White-label store the item was added from (drives payout attribution).
  // Absent for items added from the global shop.
  storeId?: string | null;
  storeSlug?: string | null;
};

export type BulkCartItem = CartItemBase & {
  quantity: number;
  isPackaging?: false;
};

export type SwagPackCartItem = CartItemBase & {
  quantityPerPack: number;
  isPackaging?: false;
};

export type SwagPackPackagingItem = CartItemBase & {
  quantityPerPack: 1;
  isPackaging: true;
};

export type CatalogCartSnapshot = {
  bulkItems: BulkCartItem[];
  swagPackItems: SwagPackCartItem[];
  swagPackPackaging: SwagPackPackagingItem | null;
  swagPackQuantity: number;
  swagPackName: string;
  swagPackLogoUrl: string | null;
  swagPackLogoKey: string | null;
};

// Logo + placement captured in the Mockup Studio builder, carried to the order
// (logoUrl persists for printing; `note` describes placement for the designer).
export type CartBranding = {
  logoUrl: string | null;
  logoKey: string | null;
  mockupUrl: string | null;
  note: string | null;
};

type CatalogCartStore = CatalogCartSnapshot & {
  branding: CartBranding;
  setBranding: (branding: Partial<CartBranding> | null) => void;
  addBulkItem: (item: BulkCartItem) => void;
  addSwagPackItem: (item: SwagPackCartItem) => void;
  updateBulkQuantity: (key: string, quantity: number) => void;
  updateSwagPackQuantityPerPack: (key: string, quantityPerPack: number) => void;
  removeBulkItem: (key: string) => void;
  removeSwagPackItem: (key: string) => void;
  setSwagPackPackaging: (item: SwagPackPackagingItem | null) => void;
  setSwagPackQuantity: (quantity: number) => void;
  setSwagPackName: (name: string) => void;
  setSwagPackLogo: (logo: { url: string; key: string | null } | null) => void;
  clearBulkItems: () => void;
  clearSwagPackItems: () => void;
  clearSwagPack: () => void;
  clearCart: () => void;
};

function getItemKey(
  item: Pick<CartItemBase, "productId" | "productCatalogVariantId" | "storeId">
) {
  // Same product bought from different stores (or the global shop) are distinct
  // cart lines so each keeps its own store attribution.
  return `${item.storeId ?? "shop"}:${item.productId}:${item.productCatalogVariantId ?? "base"}`;
}

function upsertBulk(items: BulkCartItem[], nextItem: BulkCartItem) {
  const key = getItemKey(nextItem);
  const existing = items.find((item) => getItemKey(item) === key);

  if (!existing) {
    return [...items, nextItem];
  }

  return items.map((item) =>
    getItemKey(item) === key
      ? {
          ...item,
          quantity: item.quantity + nextItem.quantity,
          imageUrl: nextItem.imageUrl ?? item.imageUrl
        }
      : item
  );
}

function upsertSwagPack(items: SwagPackCartItem[], nextItem: SwagPackCartItem) {
  const key = getItemKey(nextItem);
  const existing = items.find((item) => getItemKey(item) === key);

  if (!existing) {
    return [...items, nextItem];
  }

  return items.map((item) =>
    getItemKey(item) === key
      ? {
          ...item,
          quantityPerPack: item.quantityPerPack + nextItem.quantityPerPack,
          imageUrl: nextItem.imageUrl ?? item.imageUrl
        }
      : item
  );
}

export function getCartItemKey(
  item: Pick<CartItemBase, "productId" | "productCatalogVariantId" | "storeId">
) {
  return getItemKey(item);
}

export const useCatalogCartStore = create<CatalogCartStore>()(
  persist(
    (set) => ({
      bulkItems: [],
      swagPackItems: [],
      swagPackPackaging: null,
      swagPackQuantity: 25,
      swagPackName: createDefaultSwagPackName(),
      swagPackLogoUrl: null,
      swagPackLogoKey: null,
      branding: { logoUrl: null, logoKey: null, mockupUrl: null, note: null },
      setBranding: (branding) =>
        set((state) => ({
          branding: branding
            ? { ...state.branding, ...branding }
            : { logoUrl: null, logoKey: null, mockupUrl: null, note: null }
        })),
      addBulkItem: (item) =>
        set((state) => ({
          bulkItems: upsertBulk(state.bulkItems, item)
        })),
      addSwagPackItem: (item) =>
        set((state) => ({
          swagPackItems: upsertSwagPack(state.swagPackItems, item)
        })),
      updateBulkQuantity: (key, quantity) =>
        set((state) => ({
          bulkItems: state.bulkItems
            .map((item) => (getItemKey(item) === key ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0)
        })),
      updateSwagPackQuantityPerPack: (key, quantityPerPack) =>
        set((state) => ({
          swagPackItems: state.swagPackItems
            .map((item) => (getItemKey(item) === key ? { ...item, quantityPerPack } : item))
            .filter((item) => item.quantityPerPack > 0)
        })),
      removeBulkItem: (key) =>
        set((state) => ({
          bulkItems: state.bulkItems.filter((item) => getItemKey(item) !== key)
        })),
      removeSwagPackItem: (key) =>
        set((state) => ({
          swagPackItems: state.swagPackItems.filter((item) => getItemKey(item) !== key)
        })),
      setSwagPackPackaging: (item) =>
        set({
          swagPackPackaging: item ? { ...item, quantityPerPack: 1, isPackaging: true } : null
        }),
      setSwagPackQuantity: (quantity) =>
        set({
          swagPackQuantity: Math.max(25, Math.floor(quantity || 25))
        }),
      setSwagPackName: (name) =>
        set({
          swagPackName: name.trim() || createDefaultSwagPackName()
        }),
      setSwagPackLogo: (logo) =>
        set({
          swagPackLogoUrl: logo?.url ?? null,
          swagPackLogoKey: logo?.key ?? null
        }),
      clearBulkItems: () => set({ bulkItems: [] }),
      clearSwagPackItems: () =>
        set((state) => ({
          swagPackItems: [],
          swagPackPackaging: null,
          swagPackQuantity: 25,
          swagPackName: state.swagPackName || createDefaultSwagPackName(),
          swagPackLogoUrl: null,
          swagPackLogoKey: null
        })),
      clearSwagPack: () =>
        set({
          swagPackItems: [],
          swagPackPackaging: null,
          swagPackQuantity: 25,
          swagPackName: createDefaultSwagPackName(),
          swagPackLogoUrl: null,
          swagPackLogoKey: null
        }),
      clearCart: () =>
        set({
          bulkItems: [],
          swagPackItems: [],
          swagPackPackaging: null,
          swagPackQuantity: 25,
          swagPackName: createDefaultSwagPackName(),
          swagPackLogoUrl: null,
          swagPackLogoKey: null,
          branding: { logoUrl: null, logoKey: null, mockupUrl: null, note: null }
        })
    }),
    {
      name: "soaswag-catalog-cart",
      version: 4,
      // Only persist cart data, never the action functions.
      partialize: (state) => ({
        bulkItems: state.bulkItems,
        swagPackItems: state.swagPackItems,
        swagPackPackaging: state.swagPackPackaging,
        swagPackQuantity: state.swagPackQuantity,
        swagPackName: state.swagPackName,
        swagPackLogoUrl: state.swagPackLogoUrl,
        swagPackLogoKey: state.swagPackLogoKey,
        branding: state.branding
      }),
      // Carts saved under an older schema are incompatible — discard them and
      // fall back to the store's default state instead of throwing.
      migrate: () => undefined
    }
  )
);

// True once the persisted cart has been read from localStorage on the client.
// Use this to avoid SSR/client hydration mismatches when rendering cart state
// (e.g. the navbar cart count) — render the persisted value only after hydration.
export function useCartHydrated() {
  // Start false so the server render and the first client render agree (no
  // persisted data exists on the server). Read the real status in an effect,
  // which only runs on the client where `persist` is available.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const api = useCatalogCartStore.persist;
    if (!api) {
      setHydrated(true);
      return;
    }
    const unsubFinish = api.onFinishHydration(() => setHydrated(true));
    if (api.hasHydrated()) setHydrated(true);
    return unsubFinish;
  }, []);

  return hydrated;
}
