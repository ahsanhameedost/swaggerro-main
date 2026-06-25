import { z } from "zod";
import { isBusinessEmail } from "../../common/utils/business-email";

export const sellerApplicationStatusSchema = z.enum([
  "NEW",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED"
]);

// Public submission. Business email is required for seller/partner applications
// (unlike general signup/checkout, which accept any valid email).
export const createSellerApplicationSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  contactName: z.string().trim().min(2, "Contact name is required").max(160),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(200)
    .refine(isBusinessEmail, { message: "Use your business email address" }),
  phone: z.string().trim().min(6, "Phone number is required").max(40),
  companyAddress: z.string().trim().min(1, "Company address is required").max(1000),
  businessDescription: z.string().trim().min(1, "Business description is required").max(4000),
  industry: z.string().trim().min(1, "Industry is required").max(160),
  country: z.string().trim().min(1, "Country is required").max(120),
  website: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  additionalInfo: z.string().trim().max(4000).optional(),
  logoUrl: z.string().url().max(2048).optional().nullable(),
  logoKey: z.string().max(500).optional().nullable()
});

export const listSellerApplicationsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
  status: sellerApplicationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15)
});

export const updateSellerApplicationStatusSchema = z.object({
  status: sellerApplicationStatusSchema,
  adminNotes: z.string().trim().max(4000).optional().nullable()
});

export type CreateSellerApplicationInput = z.infer<typeof createSellerApplicationSchema>;
export type ListSellerApplicationsQuery = z.infer<typeof listSellerApplicationsQuerySchema>;
export type UpdateSellerApplicationStatusInput = z.infer<
  typeof updateSellerApplicationStatusSchema
>;
