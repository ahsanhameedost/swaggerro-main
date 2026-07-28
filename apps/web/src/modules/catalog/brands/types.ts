
import type { PaginationMeta } from "../shared";

export type CatalogBrand = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListBrandsParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type CreateBrandInput = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
};

export type UpdateBrandInput = {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  removeImage?: boolean;
};

export type ListBrandsResponse = {
  items: CatalogBrand[];
  pagination: PaginationMeta;
};

export type BrandResponse = {
  brand: CatalogBrand;
};
