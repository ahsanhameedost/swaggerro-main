
import { z } from "zod";

export const listCategoriesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15)
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().url().max(2048).optional().nullable(),
  imageKey: z.string().max(500).optional().nullable()
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  removeImage: z.boolean().optional()
});

export const createCatalogImageUploadSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required").max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"])
});

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CreateCatalogImageUploadDto = z.infer<typeof createCatalogImageUploadSchema>;
