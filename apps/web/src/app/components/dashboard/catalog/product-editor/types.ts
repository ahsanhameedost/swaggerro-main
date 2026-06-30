import type { Key } from "react";
import type {
  CatalogImage,
  CatalogPricingOption,
  CreateProductInput,
  ProductCatalogVariantSelection,
  SwagCommissionType
} from "@/lib/catalog";

export type ProductEditorMode = "create" | "edit";
export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type VariantType = "COLOR" | "TEXT";
export type SelectKeys = "all" | Set<Key>;

export type EditorImage = CatalogImage & {
  clientId: string;
};

export type EditorVariantOption = {
  id?: string;
  clientId: string;
  code: string;
  label: string;
  colorHex: string | null;
  sortOrder: number;
};

export type EditorVariantDefinition = {
  id?: string;
  clientId: string;
  name: string;
  type: VariantType;
  sortOrder: number;
  options: EditorVariantOption[];
};

export type EditorProductCatalogVariant = {
  id?: string;
  clientId: string;
  title: string;
  selectedOptionIds: string[];
  selectedOptions: ProductCatalogVariantSelection[];
  price: number;
  stock: number;
  minQty: number;
  isDefault: boolean;
  sortOrder: number;
  imageIds: string[];
  pricingOptions: CatalogPricingOption[];
};

export type ProductEditorState = {
  name: string;
  shortDescription: string;
  description: string;
  status: ProductStatus;
  categoryId: string;
  collectionIds: string[];
  isPackaging: boolean;
  bulkPricingEnabled: boolean;
  shippingProfileId: string;
  weightOz: number | null;
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
  basePrice: number | null;
  compareAtPrice: number | null;
  minQty: number;
  baseStock: number;
  commissionType: SwagCommissionType;
  commissionValue: number | null;
  images: EditorImage[];
  variantDefinitions: EditorVariantDefinition[];
  productCatalogVariants: EditorProductCatalogVariant[];
  pricingOptions: CatalogPricingOption[];
};

export type PricingModalTarget =
  | { type: "product" }
  | { type: "variant"; variantRef: string }
  | { type: "variant-group"; title: string; variantRefs: string[] }
  | null;

export type ImagePickerTarget = {
  title: string;
  variantRefs: string[];
  selectedImageIds: string[];
} | null;

export type GroupDraftState = Record<
  string,
  {
    price: string;
    stock: string;
    minQty: string;
  }
>;

export type ProductEditorPageProps = {
  mode: ProductEditorMode;
};

export type BuildPayloadResult = CreateProductInput;