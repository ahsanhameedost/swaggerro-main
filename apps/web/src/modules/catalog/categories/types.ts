
import type { PaginationMeta } from "../shared";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListCategoriesParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type CreateCategoryInput = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
};

export type UpdateCategoryInput = {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  removeImage?: boolean;
};

export type ListCategoriesResponse = {
  items: CatalogCategory[];
  pagination: PaginationMeta;
};

export type CategoryResponse = {
  category: CatalogCategory;
};
