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
};

type CatalogCartStore = CatalogCartSnapshot & {
  addBulkItem: (item: BulkCartItem) => void;
  addSwagPackItem: (item: SwagPackCartItem) => void;
  updateBulkQuantity: (key: string, quantity: number) => void;
  updateSwagPackQuantityPerPack: (key: string, quantityPerPack: number) => void;
  removeBulkItem: (key: string) => void;
  removeSwagPackItem: (key: string) => void;
  setSwagPackPackaging: (item: SwagPackPackagingItem | null) => void;
  setSwagPackQuantity: (quantity: number) => void;
  setSwagPackName: (name: string) => void;
  clearBulkItems: () => void;
  clearSwagPackItems: () => void;
  clearSwagPack: () => void;
  clearCart: () => void;
};

function getItemKey(item: Pick<CartItemBase, "productId" | "productCatalogVariantId">) {
  return `${item.productId}:${item.productCatalogVariantId ?? "base"}`;
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

export function getCartItemKey(item: Pick<CartItemBase, "productId" | "productCatalogVariantId">) {
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
      clearBulkItems: () => set({ bulkItems: [] }),
      clearSwagPackItems: () =>
        set((state) => ({
          swagPackItems: [],
          swagPackPackaging: null,
          swagPackQuantity: 25,
          swagPackName: state.swagPackName || createDefaultSwagPackName()
        })),
      clearSwagPack: () =>
        set({
          swagPackItems: [],
          swagPackPackaging: null,
          swagPackQuantity: 25,
          swagPackName: createDefaultSwagPackName()
        }),
      clearCart: () =>
        set({
          bulkItems: [],
          swagPackItems: [],
          swagPackPackaging: null,
          swagPackQuantity: 25,
          swagPackName: createDefaultSwagPackName()
        })
    }),
    {
      name: "soaswag-catalog-cart",
      version: 2
    }
  )
);
