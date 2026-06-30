import type { CatalogProductListItem } from "@/modules/catalog/products/types";

export type StoreStatus = "DRAFT" | "ACTIVE" | "SUSPENDED";

// Per-product logo placement (matches the seller mockup editor + API).
export type LogoPlacement = {
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
};

export type ProductBranding = {
  logoUrl: string | null;
  placement: LogoPlacement | null;
};

// A curated store product card, plus the seller's optional logo branding.
export type StoreProductCard = CatalogProductListItem & {
  branding: ProductBranding | null;
  // Seller's chosen sale price (null => uses the catalog price).
  customPrice?: number | null;
};

export type ProductBrandingInput = {
  productId: string;
  logoUrl?: string | null;
  logoKey?: string | null;
  placement?: LogoPlacement | null;
  // Seller's chosen sale price (null/omitted => catalog price).
  customPrice?: number | null;
};

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
  // Store-level default commission %, fallback for products without their own.
  commissionPercent?: number;
  productCount: number;
  products: StoreProductCard[];
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
  productBranding?: ProductBrandingInput[];
};

export type CreateStoreInput = UpdateStoreInput & { name: string };

export type UpdateOwnStoreInput = Omit<UpdateStoreInput, "slug" | "status" | "ownerUserId">;
