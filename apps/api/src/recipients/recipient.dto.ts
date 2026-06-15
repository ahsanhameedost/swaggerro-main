import { z } from "zod";

const countryCodeSchema = z
  .string()
  .trim()
  .length(2, "Country code must be a 2-letter ISO code")
  .transform((value) => value.toUpperCase());

export const listRecipientsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  countryCode: countryCodeSchema.optional(),
  userId: z.string().trim().optional()
});

export const createRecipientSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  companyName: z.string().trim().max(160).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  addressLine1: z.string().trim().min(1).max(160),
  addressLine2: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().max(120).optional().nullable(),
  postalCode: z.string().trim().min(1).max(40),
  countryCode: countryCodeSchema,
  countryName: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional().nullable(),
  isDefault: z.boolean().default(false)
});

export const updateRecipientSchema = createRecipientSchema.partial();

export type ListRecipientsQueryDto = z.infer<typeof listRecipientsQuerySchema>;
export type CreateRecipientDto = z.infer<typeof createRecipientSchema>;
export type UpdateRecipientDto = z.infer<typeof updateRecipientSchema>;
