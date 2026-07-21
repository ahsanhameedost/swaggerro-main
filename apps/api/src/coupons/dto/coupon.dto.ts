import { z } from "zod";

export const couponDiscountTypeSchema = z.enum(["PERCENT", "FIXED"]);

const baseCouponObject = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code must be at least 3 characters")
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Use only letters, numbers, - or _"),
  description: z.string().trim().max(200).optional().nullable(),
  discountType: couponDiscountTypeSchema.default("PERCENT"),
  discountValue: z.coerce.number().positive("Enter a value above 0").max(1_000_000),
  // Admin only — sellers always get their own store forced server-side.
  storeId: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  productIds: z.array(z.string()).max(200).optional().default([]),
  minSubtotal: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  maxDiscount: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  usageLimit: z.coerce.number().int().min(1).max(1_000_000).optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  active: z.boolean().optional().default(true),
});

function refineCoupon(v: z.infer<typeof baseCouponObject>, ctx: z.RefinementCtx) {
  if (v.discountType === "PERCENT" && v.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountValue"],
      message: "A percentage can't be more than 100",
    });
  }
  if (v.startsAt && v.expiresAt && v.expiresAt <= v.startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiresAt"],
      message: "End date must be after the start date",
    });
  }
}

export const createCouponSchema = baseCouponObject.superRefine(refineCoupon);
export const updateCouponSchema = baseCouponObject.partial().superRefine((v, ctx) =>
  refineCoupon(v as z.infer<typeof baseCouponObject>, ctx)
);

export const listCouponsQuerySchema = z.object({
  search: z.string().trim().optional(),
  scope: z.enum(["platform", "store", "all"]).optional(),
});

// A cart line the coupon may apply to — used by the validate endpoint and the
// checkout services so product-restricted coupons compute the right amount.
export const couponLineSchema = z.object({
  productId: z.string(),
  lineTotal: z.coerce.number().min(0),
});

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code"),
  storeId: z.string().optional().nullable(),
  lines: z.array(couponLineSchema).min(1, "Cart is empty"),
});

export type CreateCouponDto = z.infer<typeof createCouponSchema>;
export type UpdateCouponDto = z.infer<typeof updateCouponSchema>;
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
export type ValidateCouponDto = z.infer<typeof validateCouponSchema>;
