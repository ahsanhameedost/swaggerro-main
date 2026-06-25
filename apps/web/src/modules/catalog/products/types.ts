import type { CatalogCategory } from "../categories/types";
import type { CatalogCollection } from "../collections/types";
import type { PaginationMeta } from "../shared";


export type CatalogProductShipping = {
  shippingProfileId?: string | null;
  profileName?: string | null;
  packageType?: "BULK_ITEM" | "PACK" | "MAILER_PACK" | null;
  shippingScope?: "DOMESTIC_ONLY" | "DOMESTIC_AND_INTERNATIONAL" | "INTERNATIONAL_REVIEW_REQUIRED" | null;
  weightOz?: number | null;
  dimensions?: {
    lengthIn?: number | null;
    widthIn?: number | null;
    heightIn?: number | null;
  } | null;
  requiresPhoneForInternational?: boolean;
  requiresEmailForInternational?: boolean;
  maxUnitsPerPackage?: number | null;
  allowCountries?: Array<{ code: string; name: string }>;
  blockCountries?: Array<{ code: string; name: string }>;
  badges: string[];
};

export type CatalogPricingOption = {
  id?: string;
  qtyFrom: number;
  qtyTo?: number | null;
  price: number;
  isOnward: boolean;
  sortOrder?: number;
  minQty?: number;
  priceCents?: number;
};

export type CatalogImage = {
  id?: string | null;
  url: string;
  key?: string | null;
  alt?: string | null;
  sortOrder?: number;
};

export type CatalogVariantType = "COLOR" | "TEXT";

export type CatalogVariantOption = {
  id?: string | null;
  code: string;
  label: string;
  colorHex?: string | null;
  sortOrder?: number;
};

export type CatalogVariantGroup = {
  id?: string | null;
  name: string;
  type: CatalogVariantType;
  sortOrder?: number;
  options: CatalogVariantOption[];
};

export type ProductCatalogVariantSelection = {
  variantId: string;
  variantName: string;
  variantType: "COLOR" | "TEXT";
  variantOptionId: string;
  code: string;
  label: string;
  colorHex?: string | null;
  sortOrder?: number;
  optionId?: string | null;
  type?: "COLOR" | "TEXT";
};

export type ProductCatalogVariant = {
  id?: string | null;
  title?: string | null;
  price: number;
  priceCents?: number;
  stock: number;
  minQty: number;
  isDefault?: boolean;
  sortOrder?: number;
  imageIds: string[];
  selectedOptions: ProductCatalogVariantSelection[];
  pricingOptions: CatalogPricingOption[];
};

export type CatalogProductListItem = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  category?: { id: string; name: string; slug?: string } | null;
  collections: Array<{ id: string; name: string; slug?: string }>;
  imageUrl?: string | null;
  variantCount: number;
  hasVariants: boolean;
  isPackaging: boolean;
  bulkPricingEnabled?: boolean;
  basePrice?: number | null;
  basePriceCents?: number | null;
  compareAtPrice?: number | null;
  compareAtPriceCents?: number | null;
  lowestPrice: number;
  highestPrice: number;
  floorPrice?: number;
  pricingOptions?: CatalogPricingOption[];
  swatches?: Array<{ name: string; hex: string | null }>;
  minPrice: number;
  minPriceCents?: number;
  maxPrice?: number;
  price?: number;
  priceCents?: number;
  baseStock: number;
  minQty: number;
  currency: string;
  shipping: CatalogProductShipping;
  createdAt: string;
  updatedAt: string;
};

export type CatalogProductDetail = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isPackaging: boolean;
  bulkPricingEnabled?: boolean;
  basePrice?: number | null;
  basePriceCents?: number | null;
  compareAtPrice?: number | null;
  compareAtPriceCents?: number | null;
  minQty: number;
  baseStock: number;
  currency: string;
  hasVariants: boolean;
  lowestPrice: number;
  highestPrice: number;
  minPrice: number;
  minPriceCents?: number;
  maxPrice?: number;
  category?: { id: string; name: string; slug: string } | null;
  collections: Array<{ id: string; name: string; slug: string }>;
  images: CatalogImage[];
  variantDefinitions: CatalogVariantGroup[];
  variantGroups: CatalogVariantGroup[];
  groupedOptions: Array<{ name: string; type?: CatalogVariantType; values: string[] }>;
  productCatalogVariants: ProductCatalogVariant[];
  pricingOptions: CatalogPricingOption[];
  shipping: CatalogProductShipping;
  createdAt: string;
  updatedAt: string;
};

export type ListProductsParams = {
  search?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId?: string;
  collectionId?: string;
  page?: number;
  pageSize?: number;
};

export type ListPublicProductsParams = {
  search?: string;
  category?: string;
  collection?: string;
  isPackaging?: boolean;
  shippingProfileId?: string | null;
  weightOz?: number | null;
  lengthIn?: number | null;
  widthIn?: number | null;
  heightIn?: number | null;
  page?: number;
  pageSize?: number;
};

export type CreateProductInput = {
  name: string;
  shortDescription: string;
  description?: string | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId?: string | null;
  collectionIds: string[];
  isPackaging?: boolean;
  bulkPricingEnabled?: boolean;
  shippingProfileId?: string | null;
  weightOz?: number | null;
  lengthIn?: number | null;
  widthIn?: number | null;
  heightIn?: number | null;
  basePrice?: number | null;
  compareAtPrice?: number | null;
  minQty: number;
  baseStock: number;
  currency?: string;
  images: CatalogImage[];
  variantGroups: CatalogVariantGroup[];
  productCatalogVariants: ProductCatalogVariant[];
  pricingOptions: CatalogPricingOption[];
};

export type UpdateProductInput = Partial<CreateProductInput>;

export type CatalogVariantOptionDefinition = {
  id: string;
  variantId?: string | null;
  code: string;
  label: string;
  colorHex: string | null;
  sortOrder: number;
};

export type CatalogVariantDefinition = {
  id: string;
  name: string;
  type: CatalogVariantType;
  sortOrder: number;
  options: CatalogVariantOptionDefinition[];
};

export type CatalogVariantSelection = ProductCatalogVariantSelection;

export type ListProductsResponse = {
  items: CatalogProductListItem[];
  pagination: PaginationMeta;
};

export type ProductResponse = {
  product: CatalogProductDetail;
};

export type PublicCategoriesResponse = {
  items: CatalogCategory[];
};

export type PublicCollectionsResponse = {
  items: CatalogCollection[];
};
