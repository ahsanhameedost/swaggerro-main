import { z } from "zod";

export const productStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
export const catalogVariantTypeSchema = z.enum(["COLOR", "TEXT"]);

const moneySchema = z.coerce.number().min(0);

const pricingOptionSchema = z
  .object({
    qtyFrom: z.coerce.number().int().min(1),
    qtyTo: z.coerce.number().int().min(1).optional().nullable(),
    price: moneySchema,
    isOnward: z.boolean().default(false),
    sortOrder: z.coerce.number().int().min(0).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.isOnward && (value.qtyTo ?? null) === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qtyTo"],
        message: "To quantity is required unless onward is enabled"
      });
    }

    if (!value.isOnward && value.qtyTo != null && value.qtyTo <= value.qtyFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qtyTo"],
        message: "To quantity must be greater than from quantity"
      });
    }
  });

const pricingOptionsArraySchema = z.array(pricingOptionSchema).superRefine((rows, ctx) => {
  let previousTo: number | null = null;

  rows.forEach((row, index) => {
    if (previousTo !== null && row.qtyFrom <= previousTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "qtyFrom"],
        message: "From quantity must be greater than previous to quantity"
      });
    }

    if (row.isOnward && index !== rows.length - 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "isOnward"],
        message: "Onward pricing must be the last row"
      });
    }

    previousTo = row.isOnward ? null : row.qtyTo ?? null;
  });
});

const imageInputSchema = z.object({
  id: z.string().trim().optional().nullable(),
  url: z.string().url().max(2048),
  key: z.string().max(500).optional().nullable(),
  alt: z.string().trim().max(255).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional()
});

const variantOptionInputSchema = z.object({
  id: z.string().trim().optional().nullable(),
  code: z.string().trim().min(1, "Code is required").max(80),
  label: z.string().trim().min(1, "Label is required").max(80),
  colorHex: z.string().trim().max(20).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional()
});

const variantGroupInputSchema = z
  .object({
    id: z.string().trim().optional().nullable(),
    name: z.string().trim().min(1, "Variant name is required").max(80),
    type: catalogVariantTypeSchema,
    sortOrder: z.coerce.number().int().min(0).optional(),
    options: z.array(variantOptionInputSchema).min(1, "At least one option is required")
  })
  .superRefine((value, ctx) => {
    const seenCodes = new Set<string>();

    value.options.forEach((option, index) => {
      const normalizedCode = option.code.trim().toLowerCase();

      if (seenCodes.has(normalizedCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", index, "code"],
          message: "Option code must be unique inside a variant"
        });
      }

      seenCodes.add(normalizedCode);

      if (value.type === "COLOR" && !option.colorHex) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", index, "colorHex"],
          message: "Color is required for color variants"
        });
      }
    });
  });

const selectedOptionInputSchema = z.object({
  variantId: z.string().trim().optional().nullable(),
  variantName: z.string().trim().min(1).max(80),
  variantType: catalogVariantTypeSchema,
  optionId: z.string().trim().optional().nullable(),
  code: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  colorHex: z.string().trim().max(20).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional()
});

const productCatalogVariantInputSchema = z
  .object({
    id: z.string().trim().optional().nullable(),
    title: z.string().trim().max(255).optional().nullable(),
    price: moneySchema,
    stock: z.coerce.number().int().min(0),
    minQty: z.coerce.number().int().min(1).default(1),
    isDefault: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    imageIds: z.array(z.string().trim()).default([]),
    selectedOptions: z.array(selectedOptionInputSchema).min(1, "Select at least one option"),
    pricingOptions: pricingOptionsArraySchema.default([])
  })
  .superRefine((value, ctx) => {
    value.pricingOptions.forEach((tier, index) => {
      if (tier.price > value.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricingOptions", index, "price"],
          message: "Tier unit price cannot exceed the variant price"
        });
      }
    });

    const uniqueVariants = new Set<string>();

    value.selectedOptions.forEach((option, index) => {
      const key = option.variantName.trim().toLowerCase();

      if (uniqueVariants.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selectedOptions", index, "variantName"],
          message: "Only one option can be selected per variant"
        });
      }

      uniqueVariants.add(key);
    });
  });

export const listProductsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: productStatusSchema.optional(),
  categoryId: z.string().trim().optional(),
  collectionId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15)
});

const productSchemaBase = z.object({
  name: z.string().trim().min(1, "Product name is required").max(160),
  shortDescription: z.string().trim().min(1, "Short description is required").max(255),
  description: z.string().trim().max(40000).optional().nullable(),
  status: productStatusSchema.default("DRAFT"),
  categoryId: z.string().trim().optional().nullable(),
  collectionIds: z.array(z.string().trim()).default([]),
  isPackaging: z.boolean().default(false),
  bulkPricingEnabled: z.boolean().default(true),
  shippingProfileId: z.string().trim().optional().nullable(),
  weightOz: z.coerce.number().min(0).optional().nullable(),
  lengthIn: z.coerce.number().min(0).optional().nullable(),
  widthIn: z.coerce.number().min(0).optional().nullable(),
  heightIn: z.coerce.number().min(0).optional().nullable(),
  basePrice: moneySchema.optional().nullable(),
  compareAtPrice: moneySchema.optional().nullable(),
  minQty: z.coerce.number().int().min(1).default(1),
  baseStock: z.coerce.number().int().min(0).default(0),
  currency: z.string().trim().min(3).max(8).default("USD"),
  // Swaggeroo's per-product commission. PERCENT value is capped 0-15;
  // FLAT value is a dollar amount taken at the catalog base price.
  commissionType: z.enum(["PERCENT", "FLAT"]).default("PERCENT"),
  commissionValue: z.coerce.number().min(0).max(1000000).optional().nullable(),
  images: z.array(imageInputSchema).default([]),
  variantGroups: z.array(variantGroupInputSchema).default([]),
  variants: z.array(variantGroupInputSchema).optional(),
  productCatalogVariants: z.array(productCatalogVariantInputSchema).default([]),
  pricingOptions: pricingOptionsArraySchema.default([])
});

const validateCommission = (
  value: { commissionType?: "PERCENT" | "FLAT"; commissionValue?: number | null },
  ctx: z.RefinementCtx
) => {
  if (value.commissionType === "PERCENT" && value.commissionValue != null && value.commissionValue > 15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["commissionValue"],
      message: "Commission percentage cannot exceed 15%"
    });
  }
};

const validateTiersAgainstBasePrice = (
  value: { basePrice?: number | null; pricingOptions?: { price: number }[] },
  ctx: z.RefinementCtx
) => {
  if (value.basePrice == null || !value.pricingOptions?.length) {
    return;
  }

  value.pricingOptions.forEach((tier, index) => {
    if (tier.price > (value.basePrice as number)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pricingOptions", index, "price"],
        message: "Tier unit price cannot exceed the base product price"
      });
    }
  });
};

export const createProductSchema = productSchemaBase.superRefine((value, ctx) => {
  if (!value.productCatalogVariants.length && value.basePrice == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["basePrice"],
      message: "Base price is required when there are no product variants"
    });
  }

  if (value.compareAtPrice != null && value.basePrice != null && value.compareAtPrice < value.basePrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["compareAtPrice"],
      message: "Compare at price must be greater than or equal to base price"
    });
  }

  validateTiersAgainstBasePrice(value, ctx);
  validateCommission(value, ctx);
});

export const updateProductSchema = productSchemaBase.partial().superRefine((value, ctx) => {
  if (value.compareAtPrice != null && value.basePrice != null && value.compareAtPrice < value.basePrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["compareAtPrice"],
      message: "Compare at price must be greater than or equal to base price"
    });
  }

  validateTiersAgainstBasePrice(value, ctx);
  validateCommission(value, ctx);
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
