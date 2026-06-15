export type PublicBulkOrderItemInput = {
  productId: string;
  productCatalogVariantId?: string | null;
  quantity: number;
};

export type PublicSwagPackItemInput = {
  productId: string;
  productCatalogVariantId?: string | null;
  quantityPerPack: number;
};

export type PublicSwagPackPackagingInput = {
  productId: string;
  productCatalogVariantId?: string | null;
};

export type PublicCatalogCheckoutInput = {
  name: string;
  email: string;
  companyName?: string | null;
  phone?: string | null;
  notes?: string | null;
  budgetPerPerson?: number | null;
  neededByDate?: string | null;
  logoUrl?: string | null;
  logoKey?: string | null;
  bulkItems: PublicBulkOrderItemInput[];
  swagPack?: {
    name: string;
    packQuantity: number;
    items: PublicSwagPackItemInput[];
    packaging?: PublicSwagPackPackagingInput | null;
  } | null;
};
