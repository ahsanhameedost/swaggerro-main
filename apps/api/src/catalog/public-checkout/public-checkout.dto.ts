import { z } from "zod";

export const publicCheckoutItemSchema = z.object({
  productId: z.string().trim().min(1),
  productCatalogVariantId: z.string().trim().min(1).optional().nullable(),
  quantity: z.number().int().min(1).max(100000),
  // One-time imprint/setup fee chosen on the product page (imprint config is
  // frontend-only), added on top of the unit price for this line.
  setupFee: z.number().min(0).max(100000).optional()
});

// Direct pay-now purchase from the global (non-store) Swaggeroo shop. Used by the
// B2C small-quantity flow where the shopper skips the quote/design step.
export const createPublicCheckoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  shippingAddress: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(publicCheckoutItemSchema).min(1, "Cart is empty").max(100)
});

export const confirmPublicCheckoutSchema = z.object({
  orderId: z.string().trim().min(1),
  paymentIntentId: z.string().trim().min(1)
});

export type CreatePublicCheckoutInput = z.infer<typeof createPublicCheckoutSchema>;
export type ConfirmPublicCheckoutInput = z.infer<typeof confirmPublicCheckoutSchema>;
