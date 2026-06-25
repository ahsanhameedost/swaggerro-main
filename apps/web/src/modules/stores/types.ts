import type { CatalogProductListItem } from "@/modules/catalog/products/types";

export type StoreStatus = "DRAFT" | "ACTIVE" | "SUSPENDED";

export type StoreTheme = {
  primary: string;
  primarySoft: string;
  primaryForeground: string;
};

export type Store = {
  id: string;
  slug: string;
  name: string;
  companyName: string | null;
  status: StoreStatus;
  ownerUserId: string | null;
  owner: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  applicationId: string | null;
  heroHeadline: string | null;
  heroSubcopy: string | null;
  logoUrl: string | null;
  logoKey: string | null;
  theme: StoreTheme;
  productCount: number;
  products: CatalogProductListItem[];
  createdAt: string;
  updatedAt: string;
};

export type StoresResponse = {
  items: Store[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type ListStoresParams = {
  search?: string;
  status?: StoreStatus;
  page?: number;
  pageSize?: number;
};

export type StoreThemeInput = Partial<StoreTheme>;

export type UpdateStoreInput = {
  name?: string;
  slug?: string;
  companyName?: string | null;
  status?: StoreStatus;
  ownerUserId?: string | null;
  heroHeadline?: string | null;
  heroSubcopy?: string | null;
  logoUrl?: string | null;
  logoKey?: string | null;
  theme?: StoreThemeInput;
  productIds?: string[];
};

export type CreateStoreInput = UpdateStoreInput & { name: string };

export type UpdateOwnStoreInput = Omit<UpdateStoreInput, "slug" | "status" | "ownerUserId">;
