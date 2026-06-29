import { apiFetch } from "@/lib/api";

export type StoreCheckoutItemInput = {
  productId: string;
  productCatalogVariantId?: string | null;
  quantity: number;
};

export type CreateStoreCheckoutInput = {
  storeSlug: string;
  name: string;
  email: string;
  phone?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  items: StoreCheckoutItemInput[];
};

export type StoreCheckoutSession = {
  orderId: string;
  testMode: boolean;
  clientSecret: string | null;
  publishableKey: string | null;
  amount: number;
  currency: string;
};

export async function createStoreCheckout(input: CreateStoreCheckoutInput) {
  return apiFetch<StoreCheckoutSession>("/catalog/store-checkout", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function confirmStoreCheckout(input: { orderId: string; paymentIntentId: string }) {
  return apiFetch<{ orderId: string; paymentStatus: "PAID"; alreadyPaid: boolean }>(
    "/catalog/store-checkout/confirm",
    { method: "POST", body: JSON.stringify(input) }
  );
}
