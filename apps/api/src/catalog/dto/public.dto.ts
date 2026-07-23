import { z } from "zod";

export const listPublicProductsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  collection: z.string().trim().max(120).optional(),
  isPackaging: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12)
});

const bulkOrderItemSchema = z.object({
  productId: z.string().trim().min(1),
  productCatalogVariantId: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().min(1),
  // One-time imprint/setup fee (frontend imprint config), added to the line.
  setupFee: z.coerce.number().min(0).max(100000).optional()
});

const swagPackOrderItemSchema = z.object({
  productId: z.string().trim().min(1),
  productCatalogVariantId: z.string().trim().optional().nullable(),
  quantityPerPack: z.coerce.number().int().min(1)
});

const swagPackPackagingSchema = z.object({
  productId: z.string().trim().min(1),
  productCatalogVariantId: z.string().trim().optional().nullable()
});

export const createPublicProjectUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"])
});

// Public order tracking: match an order by its sequential number + the email on
// the order (no account required). Accepts "SW-044", "044" or "44".
export const trackOrderQuerySchema = z
  .object({
    // Direct "magic link" token = the order's opaque id. When present it alone
    // authorizes tracking (the unguessable link is the secret), so no email is
    // needed. Otherwise fall back to order number + email.
    token: z.string().trim().min(1).optional(),
    // preprocess (not `.transform().pipe().optional()`): on this Zod version an
    // optional pipe still parses `undefined` through its string input and fails
    // with "expected string, received undefined" — which broke token-only
    // (magic-link) tracking. preprocess maps a missing value to undefined first.
    orderNumber: z.preprocess((value) => {
      if (value === undefined || value === null || value === "") return undefined;
      const digits = String(value)
        .replace(/^SW-?/i, "")
        .replace(/\D/g, "");
      return digits ? Number(digits) : undefined;
    }, z.number().int().positive().optional()),
    email: z.string().trim().email().optional()
  })
  .refine((q) => !!q.token || (q.orderNumber != null && !!q.email), {
    message: "Provide a tracking link, or an order number and email."
  });

export const createPublicOrderSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email(),
    companyName: z.string().trim().max(120).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
    notes: z.string().trim().max(4000).optional().nullable(),
    budgetPerPerson: z.coerce.number().min(0).optional().nullable(),
    neededByDate: z.coerce.date().optional().nullable(),
    logoUrl: z.string().url().max(2048).optional().nullable(),
    logoKey: z.string().max(500).optional().nullable(),
    bulkItems: z.array(bulkOrderItemSchema).default([]),
    swagPack: z
      .object({
        name: z.string().trim().min(1).max(160),
        packQuantity: z.coerce.number().int().min(5).default(5),
        items: z.array(swagPackOrderItemSchema).default([]),
        packaging: swagPackPackagingSchema.optional().nullable()
      })
      .optional()
      .nullable()
  })
  .superRefine((value, ctx) => {
    const hasBulkItems = value.bulkItems.some((item) => item.quantity > 0);
    const hasSwagPackItems = value.swagPack?.items.some((item) => item.quantityPerPack > 0) ?? false;

    if (!hasBulkItems && !hasSwagPackItems) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bulkItems"],
        message: "Add at least one bulk item or one swag pack item"
      });
    }

    if (hasSwagPackItems && !value.swagPack?.packaging) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["swagPack", "packaging"],
        message: "Packaging is required for swag pack checkout"
      });
    }
  });

export type TrackOrderQuery = z.infer<typeof trackOrderQuerySchema>;
export type ListPublicProductsQuery = z.infer<typeof listPublicProductsQuerySchema>;
export type CreatePublicProjectUploadDto = z.infer<typeof createPublicProjectUploadSchema>;
export type CreatePublicOrderDto = z.infer<typeof createPublicOrderSchema>;
