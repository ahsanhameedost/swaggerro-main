
import type { PaginationMeta } from "../shared";

export type CatalogCollection = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListCollectionsParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type CreateCollectionInput = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
};

export type UpdateCollectionInput = {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  removeImage?: boolean;
};

export type ListCollectionsResponse = {
  items: CatalogCollection[];
  pagination: PaginationMeta;
};

export type CollectionResponse = {
  collection: CatalogCollection;
};
