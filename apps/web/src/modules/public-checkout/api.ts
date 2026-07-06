import { apiFetch } from "@/lib/api";

export type PublicCheckoutItemInput = {
  productId: string;
  productCatalogVariantId?: string | null;
  quantity: number;
};

export type CreatePublicCheckoutInput = {
  name: string;
  email: string;
  phone?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  items: PublicCheckoutItemInput[];
};

export type PublicCheckoutSession = {
  orderId: string;
  testMode: boolean;
  clientSecret: string | null;
  publishableKey: string | null;
  amount: number;
  currency: string;
};

export async function createPublicCheckout(input: CreatePublicCheckoutInput) {
  return apiFetch<PublicCheckoutSession>("/catalog/public-checkout", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function confirmPublicCheckout(input: { orderId: string; paymentIntentId: string }) {
  return apiFetch<{ orderId: string; paymentStatus: "PAID"; alreadyPaid: boolean }>(
    "/catalog/public-checkout/confirm",
    { method: "POST", body: JSON.stringify(input) },
  );
}
