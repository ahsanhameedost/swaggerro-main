import { z } from "zod";

export const storeStatusSchema = z.enum(["DRAFT", "ACTIVE", "SUSPENDED"]);

const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color");

const themeSchema = z
  .object({
    primary: hexColor.optional(),
    primarySoft: hexColor.optional(),
    primaryForeground: hexColor.optional()
  })
  .optional();

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and dashes");

export const listStoresQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
  status: storeStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15)
});

export const createStoreSchema = z.object({
  name: z.string().trim().min(1, "Store name is required").max(160),
  slug: slugSchema.optional(),
  companyName: z.string().trim().max(200).optional().nullable(),
  status: storeStatusSchema.optional(),
  ownerUserId: z.string().trim().optional().nullable(),
  heroHeadline: z.string().trim().max(200).optional().nullable(),
  heroSubcopy: z.string().trim().max(2000).optional().nullable(),
  logoUrl: z.string().url().max(2048).optional().nullable(),
  logoKey: z.string().max(500).optional().nullable(),
  theme: themeSchema,
  productIds: z.array(z.string().trim()).max(500).optional()
});

export const updateStoreSchema = createStoreSchema.partial();

// Sellers can edit their branding + curated products, but never the slug,
// status, or owner of their store.
export const updateOwnStoreSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  companyName: z.string().trim().max(200).optional().nullable(),
  heroHeadline: z.string().trim().max(200).optional().nullable(),
  heroSubcopy: z.string().trim().max(2000).optional().nullable(),
  logoUrl: z.string().url().max(2048).optional().nullable(),
  logoKey: z.string().max(500).optional().nullable(),
  theme: themeSchema,
  productIds: z.array(z.string().trim()).max(500).optional()
});

export type ListStoresQuery = z.infer<typeof listStoresQuerySchema>;
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type UpdateOwnStoreInput = z.infer<typeof updateOwnStoreSchema>;
