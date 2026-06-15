import { z } from "zod";

const ContactProductSchema = z.object({
  productCategory: z.string().min(1).max(200),
  totalQuantity: z.coerce.number().int().min(1),
  productDescription: z.string().max(1000).optional(),
  colors: z.string().max(200).optional(),
  targetUnitPrice: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().min(0).optional()
  ),
  decorationMethod: z.string().max(100).optional(),
  decorationNotes: z.string().max(1000).optional()
});

export const ContactCreateSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(6).max(30),
  shippingAddress: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  eventName: z.string().max(200).optional(),
  inHandDate: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.date().optional()
  ),
  budget: z.string().max(100).optional(),
  artworkReady: z.string().max(100).optional(),
  additionalNotes: z.string().max(4000).optional(),
  products: z.array(ContactProductSchema).optional()
});

export const contactMessagesQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15)
});

export type ContactCreateInput = z.infer<typeof ContactCreateSchema>;
export type ContactMessagesQuery = z.infer<typeof contactMessagesQuerySchema>;
