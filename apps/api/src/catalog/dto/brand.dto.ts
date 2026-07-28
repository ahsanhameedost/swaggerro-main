
import { z } from "zod";

export const listBrandsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15)
});

export const createBrandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().url().max(2048).optional().nullable(),
  imageKey: z.string().max(500).optional().nullable()
});

export const updateBrandSchema = createBrandSchema.partial().extend({
  removeImage: z.boolean().optional()
});

export type ListBrandsQuery = z.infer<typeof listBrandsQuerySchema>;
export type CreateBrandDto = z.infer<typeof createBrandSchema>;
export type UpdateBrandDto = z.infer<typeof updateBrandSchema>;
