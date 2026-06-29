import { z } from "zod";

export const storeCheckoutItemSchema = z.object({
  productId: z.string().trim().min(1),
  productCatalogVariantId: z.string().trim().min(1).optional().nullable(),
  quantity: z.number().int().min(1).max(100000)
});

// Direct pay-now purchase from a white-label storefront.
export const createStoreCheckoutSchema = z.object({
  storeSlug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1, "Name is required").max(160),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  shippingAddress: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(storeCheckoutItemSchema).min(1, "Cart is empty").max(100)
});

export const confirmStoreCheckoutSchema = z.object({
  orderId: z.string().trim().min(1),
  paymentIntentId: z.string().trim().min(1)
});

export type CreateStoreCheckoutInput = z.infer<typeof createStoreCheckoutSchema>;
export type ConfirmStoreCheckoutInput = z.infer<typeof confirmStoreCheckoutSchema>;
