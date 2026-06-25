import type {
  CatalogPricingOption,
  CatalogProductDetail,
  CreateProductInput,
  ProductCatalogVariantSelection
} from "@/lib/catalog";
import type {
  BuildPayloadResult,
  EditorImage,
  EditorProductCatalogVariant,
  EditorVariantDefinition,
  EditorVariantOption,
  ProductEditorState,
  ProductStatus,
  SelectKeys,
  VariantType
} from "./types";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_MB = 5;
export const EMPTY_CATEGORY_KEY = "__none__";
export const EMPTY_GROUP_BY_KEY = "__group_none__";

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toInputNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toTrimmedHtmlValue(value: string) {
  const normalized = value
    .replace(/<p><\/p>/g, "")
    .replace(/<p><br><\/p>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();

  return normalized ? value : "";
}

export function getSingleSelectedKey(selection: SelectKeys) {
  if (selection === "all") return "";
  const first = selection.values().next().value;
  return typeof first === "string" ? first : first != null ? String(first) : "";
}

export function getMultiSelectedKeys(selection: SelectKeys, fallback: string[] = []) {
  if (selection === "all") {
    return fallback;
  }

  return Array.from(selection)
    .map((value) => (typeof value === "string" ? value : String(value)))
    .filter(Boolean);
}

export function getImageRef(image: Pick<EditorImage, "id" | "clientId">) {
  return image.id || image.clientId;
}

export function getVariantDefinitionRef(variant: Pick<EditorVariantDefinition, "id" | "clientId">) {
  return variant.id || variant.clientId;
}

export function getVariantOptionRef(option: Pick<EditorVariantOption, "id" | "clientId">) {
  return option.id || option.clientId;
}

export function getProductCatalogVariantRef(
  variant: Pick<EditorProductCatalogVariant, "id" | "clientId">
) {
  return variant.id || variant.clientId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function createEmptyPricingOption(): CatalogPricingOption {
  return {
    qtyFrom: 1,
    qtyTo: null,
    price: 0,
    isOnward: false,
    sortOrder: 0
  };
}

export function createEmptyVariantOption(type: VariantType): EditorVariantOption {
  if (type === "COLOR") {
    return {
      clientId: createId("vopt"),
      code: "#111111",
      label: "",
      colorHex: "#111111",
      sortOrder: 0
    };
  }

  return {
    clientId: createId("vopt"),
    code: "",
    label: "",
    colorHex: null,
    sortOrder: 0
  };
}

export function createEmptyVariantDefinition(): EditorVariantDefinition {
  return {
    clientId: createId("variant"),
    name: "",
    type: "TEXT",
    sortOrder: 0,
    options: [createEmptyVariantOption("TEXT")]
  };
}

export function createEmptyState(): ProductEditorState {
  return {
    name: "",
    shortDescription: "",
    description: "",
    status: "DRAFT",
    categoryId: "",
    collectionIds: [],
    isPackaging: false,
    bulkPricingEnabled: true,
    shippingProfileId: "",
    weightOz: null,
    lengthIn: null,
    widthIn: null,
    heightIn: null,
    basePrice: null,
    compareAtPrice: null,
    minQty: 1,
    baseStock: 0,
    images: [],
    variantDefinitions: [],
    productCatalogVariants: [],
    pricingOptions: []
  };
}

export function normalizeImages(images: EditorImage[]) {
  return images.map((image, index) => ({
    ...image,
    clientId: image.clientId || image.id || createId("img"),
    sortOrder: index
  }));
}

export function normalizePricingOptions(rows: CatalogPricingOption[]) {
  return rows.map((row, index) => ({
    ...row,
    qtyFrom: Math.max(1, Number(row.qtyFrom || 1)),
    qtyTo: row.isOnward ? null : row.qtyTo == null ? null : Math.max(1, Number(row.qtyTo)),
    price: Math.max(0, Number(row.price || 0)),
    isOnward: !!row.isOnward,
    sortOrder: index
  }));
}

export function normalizeVariantDefinitions(definitions: EditorVariantDefinition[]) {
  return definitions.map((variant, variantIndex) => ({
    ...variant,
    clientId: variant.clientId || variant.id || createId("variant"),
    sortOrder: variantIndex,
    options: variant.options.map((option, optionIndex) => ({
      ...option,
      clientId: option.clientId || option.id || createId("vopt"),
      code: variant.type === "COLOR" ? option.colorHex || option.code || "#111111" : option.code,
      colorHex: variant.type === "COLOR" ? option.colorHex || option.code || "#111111" : null,
      sortOrder: optionIndex
    }))
  }));
}

export function normalizeVariantSelection(input: unknown): ProductCatalogVariantSelection | null {
  if (!isRecord(input)) {
    return null;
  }

  const variantOptionId = readString(
    input.variantOptionId ?? input.optionId ?? (isRecord(input.variantOption) ? input.variantOption.id : "")
  );
  const variantId = readString(input.variantId ?? (isRecord(input.variant) ? input.variant.id : ""));
  const variantName = readString(input.variantName ?? (isRecord(input.variant) ? input.variant.name : ""));
  const variantType = readString(
    input.variantType ?? input.type ?? (isRecord(input.variant) ? input.variant.type : "TEXT"),
    "TEXT"
  ) as VariantType;

  if (!variantOptionId || !variantId) {
    return null;
  }

  return {
    variantId,
    variantName,
    variantType,
    variantOptionId,
    code: readString(input.code ?? (isRecord(input.variantOption) ? input.variantOption.code : "")),
    label: readString(input.label ?? (isRecord(input.variantOption) ? input.variantOption.label : "")),
    colorHex: readNullableString(
      input.colorHex ?? (isRecord(input.variantOption) ? input.variantOption.colorHex : null)
    ),
    sortOrder: readNumber(input.sortOrder, 0)
  };
}

export function normalizeVariantSelections(input: unknown): ProductCatalogVariantSelection[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => normalizeVariantSelection(item))
    .filter((item): item is ProductCatalogVariantSelection => item !== null);
}

export function normalizeOptionIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (isRecord(item)) {
        return readString(item.variantOptionId ?? item.optionId ?? item.id, "");
      }

      return "";
    })
    .filter(Boolean);
}

export function buildSelection(
  option: EditorVariantOption,
  variant: EditorVariantDefinition
): ProductCatalogVariantSelection {
  return {
    variantId: getVariantDefinitionRef(variant),
    variantName: variant.name,
    variantType: variant.type,
    variantOptionId: getVariantOptionRef(option),
    code: option.code,
    label: option.label,
    colorHex: option.colorHex,
    sortOrder: option.sortOrder
  };
}

export function buildVariantSignature(optionIds?: unknown) {
  return normalizeOptionIds(optionIds).slice().sort().join("::");
}

export function buildProductCatalogVariantTemplates(definitions: EditorVariantDefinition[]) {
  const normalizedDefinitions = normalizeVariantDefinitions(definitions);

  if (!normalizedDefinitions.length || normalizedDefinitions.some((variant) => !variant.options.length)) {
    return [] as Array<{
      title: string;
      selectedOptions: ProductCatalogVariantSelection[];
      selectedOptionIds: string[];
    }>;
  }

  const results: Array<{
    title: string;
    selectedOptions: ProductCatalogVariantSelection[];
    selectedOptionIds: string[];
  }> = [];

  const walk = (index: number, current: ProductCatalogVariantSelection[]) => {
    if (index === normalizedDefinitions.length) {
      results.push({
        title: current.map((item) => item.label).join(" / "),
        selectedOptions: current,
        selectedOptionIds: current.map((item) => item.variantOptionId)
      });
      return;
    }

    const currentVariant = normalizedDefinitions[index];
    currentVariant.options.forEach((option) => {
      walk(index + 1, [...current, buildSelection(option, currentVariant)]);
    });
  };

  walk(0, []);
  return results;
}

export function syncProductCatalogVariants(
  definitions: EditorVariantDefinition[],
  existingRows: EditorProductCatalogVariant[],
  basePrice: number | null,
  baseStock: number,
  minQty: number
) {
  const templates = buildProductCatalogVariantTemplates(definitions);

  if (!templates.length) {
    return [] as EditorProductCatalogVariant[];
  }

  const existingMap = new Map(
    existingRows.map((row) => {
      const selectedOptions = normalizeVariantSelections(row.selectedOptions);
      const selectedOptionIds =
        normalizeOptionIds(row.selectedOptionIds).length > 0
          ? normalizeOptionIds(row.selectedOptionIds)
          : selectedOptions.map((item) => item.variantOptionId);

      return [
        buildVariantSignature(selectedOptionIds),
        {
          ...row,
          selectedOptions,
          selectedOptionIds
        }
      ] as const;
    })
  );

  const nextRows = templates.map((template, index) => {
    const previous = existingMap.get(buildVariantSignature(template.selectedOptionIds));

    return {
      id: previous?.id,
      clientId: previous?.clientId || createId("pcv"),
      title: template.title,
      selectedOptionIds: template.selectedOptionIds,
      selectedOptions: template.selectedOptions,
      price: previous?.price ?? basePrice ?? 0,
      stock: previous?.stock ?? baseStock,
      minQty: previous?.minQty ?? minQty,
      isDefault: previous?.isDefault ?? index === 0,
      sortOrder: index,
      imageIds: [...(previous?.imageIds ?? [])],
      pricingOptions: normalizePricingOptions(previous?.pricingOptions ?? [])
    } satisfies EditorProductCatalogVariant;
  });

  if (!nextRows.some((row) => row.isDefault) && nextRows.length) {
    nextRows[0] = {
      ...nextRows[0],
      isDefault: true
    };
  }

  return nextRows.map((row, index) => ({
    ...row,
    sortOrder: index
  }));
}

export function validatePricingOptions(rows: CatalogPricingOption[]) {
  let previousTo: number | null = null;

  rows.forEach((row, index) => {
    if (!row.qtyFrom || row.qtyFrom < 1) {
      throw new Error(`Pricing option ${index + 1}: from quantity is required`);
    }

    if (!row.isOnward) {
      if (row.qtyTo == null) {
        throw new Error(`Pricing option ${index + 1}: to quantity is required`);
      }

      if (row.qtyTo <= row.qtyFrom) {
        throw new Error(`Pricing option ${index + 1}: to quantity must be greater than from quantity`);
      }
    }

    if (previousTo !== null && row.qtyFrom <= previousTo) {
      throw new Error(`Pricing option ${index + 1}: from quantity must be greater than previous to quantity`);
    }

    if (row.isOnward && index !== rows.length - 1) {
      throw new Error("Onward pricing option must be the last row");
    }

    previousTo = row.isOnward ? null : (row.qtyTo ?? null);
  });
}

function normalizeDetailImages(input: unknown): EditorImage[] {
  if (!Array.isArray(input)) return [];
  return normalizeImages(
    input.map((item, index) => {
      if (!isRecord(item)) {
        return {
          clientId: createId("img"),
          url: "",
          key: null,
          alt: null,
          sortOrder: index
        } satisfies EditorImage;
      }

      return {
        id: readString(item.id, ""),
        clientId: readString(item.id, "") || createId("img"),
        url: readString(item.url, ""),
        key: readNullableString(item.key),
        alt: readNullableString(item.alt),
        sortOrder: readNumber(item.sortOrder, index)
      } satisfies EditorImage;
    })
  );
}

function normalizeDetailVariantDefinitions(product: CatalogProductDetail): EditorVariantDefinition[] {
  const source =
    Array.isArray((product as unknown as Record<string, unknown>).variantDefinitions)
      ? ((product as unknown as Record<string, unknown>).variantDefinitions as unknown[])
      : Array.isArray((product as unknown as Record<string, unknown>).variantGroups)
        ? ((product as unknown as Record<string, unknown>).variantGroups as unknown[])
        : [];

  return normalizeVariantDefinitions(
    source.map((variant, variantIndex) => {
      const record = isRecord(variant) ? variant : {};
      const options = Array.isArray(record.options) ? record.options : [];

      return {
        id: readString(record.id, "") || undefined,
        clientId: readString(record.id, "") || createId("variant"),
        name: readString(record.name, ""),
        type: readString(record.type, "TEXT") as VariantType,
        sortOrder: readNumber(record.sortOrder, variantIndex),
        options: options.map((option, optionIndex) => {
          const optionRecord = isRecord(option) ? option : {};
          return {
            id: readString(optionRecord.id, "") || undefined,
            clientId: readString(optionRecord.id, "") || createId("vopt"),
            code: readString(optionRecord.code, ""),
            label: readString(optionRecord.label, ""),
            colorHex: readNullableString(optionRecord.colorHex),
            sortOrder: readNumber(optionRecord.sortOrder, optionIndex)
          } satisfies EditorVariantOption;
        })
      } satisfies EditorVariantDefinition;
    })
  );
}

function normalizeDetailProductCatalogVariants(input: unknown): EditorProductCatalogVariant[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((variant, index) => {
    const record = isRecord(variant) ? variant : {};
    const selectedOptions = normalizeVariantSelections(record.selectedOptions);
    const selectedOptionIds =
      normalizeOptionIds(record.selectedOptionIds).length > 0
        ? normalizeOptionIds(record.selectedOptionIds)
        : selectedOptions.map((item) => item.variantOptionId);

    return {
      id: readString(record.id, "") || undefined,
      clientId: readString(record.id, "") || createId("pcv"),
      title: readString(record.title, ""),
      selectedOptionIds,
      selectedOptions,
      price: readNumber(record.price, 0),
      stock: readNumber(record.stock, 0),
      minQty: Math.max(1, readNumber(record.minQty, 1)),
      isDefault: readBoolean(record.isDefault, index === 0),
      sortOrder: readNumber(record.sortOrder, index),
      imageIds: normalizeOptionIds(record.imageIds),
      pricingOptions: normalizePricingOptions(
        Array.isArray(record.pricingOptions) ? (record.pricingOptions as CatalogPricingOption[]) : []
      )
    } satisfies EditorProductCatalogVariant;
  });
}

export function mapProductToState(product: CatalogProductDetail): ProductEditorState {
  const record = product as unknown as Record<string, unknown>;
  const shipping = isRecord(record.shipping) ? (record.shipping as Record<string, unknown>) : {};
  const dimensions = isRecord(shipping.dimensions) ? (shipping.dimensions as Record<string, unknown>) : {};
  const variantDefinitions = normalizeDetailVariantDefinitions(product);

  const productCatalogVariants = syncProductCatalogVariants(
    variantDefinitions,
    normalizeDetailProductCatalogVariants(record.productCatalogVariants),
    readNumber(record.basePrice, 0),
    readNumber(record.baseStock, 0),
    Math.max(1, readNumber(record.minQty, 1))
  );

  const collectionsSource = Array.isArray(record.collections) ? (record.collections as unknown[]) : [];

  return {
    name: readString(record.name, ""),
    shortDescription: readString(record.shortDescription, ""),
    description: readString(record.description, ""),
    status: readString(record.status, "DRAFT") as ProductStatus,
    categoryId: isRecord(record.category) ? readString((record.category as Record<string, unknown>).id, "") : "",
    collectionIds: collectionsSource
      .map((item) => (isRecord(item) ? readString(item.id, "") : ""))
      .filter(Boolean),
    isPackaging: readBoolean(record.isPackaging, false),
    bulkPricingEnabled: readBoolean(record.bulkPricingEnabled, true),
    shippingProfileId: readString(shipping.shippingProfileId, ""),
    weightOz: shipping.weightOz == null ? null : readNumber(shipping.weightOz, 0),
    lengthIn: dimensions.lengthIn == null ? null : readNumber(dimensions.lengthIn, 0),
    widthIn: dimensions.widthIn == null ? null : readNumber(dimensions.widthIn, 0),
    heightIn: dimensions.heightIn == null ? null : readNumber(dimensions.heightIn, 0),
    basePrice: readNumber(record.basePrice, 0),
    compareAtPrice: record.compareAtPrice == null ? null : readNumber(record.compareAtPrice, 0),
    minQty: Math.max(1, readNumber(record.minQty, 1)),
    baseStock: Math.max(0, readNumber(record.baseStock, 0)),
    images: normalizeDetailImages(record.images),
    variantDefinitions,
    productCatalogVariants,
    pricingOptions: normalizePricingOptions(
      Array.isArray(record.pricingOptions) ? ((record.pricingOptions as unknown[]) as CatalogPricingOption[]) : []
    )
  };
}

export function buildPayload(state: ProductEditorState): BuildPayloadResult {
  if (!state.name.trim()) {
    throw new Error("Product name is required");
  }

  if (!state.shortDescription.trim()) {
    throw new Error("Short description is required");
  }

  if (state.minQty < 1) {
    throw new Error("Min quantity must be at least 1");
  }

  const description = toTrimmedHtmlValue(state.description);

  const variantGroups = normalizeVariantDefinitions(state.variantDefinitions).map((variant) => {
    if (!variant.name.trim()) {
      throw new Error("Every variant must have a name");
    }

    if (!variant.options.length) {
      throw new Error(`${variant.name || "Variant"} must have at least one option`);
    }

    const seenCodes = new Set<string>();
    const seenLabels = new Set<string>();

    const options = variant.options.map((option) => {
      const code = variant.type === "COLOR" ? option.colorHex || option.code || "#111111" : option.code.trim();
      const label = option.label.trim();

      if (!label) {
        throw new Error(`${variant.name || "Variant"} has an option with an empty label`);
      }

      if (!code) {
        throw new Error(`${variant.name || "Variant"} has an option with an empty code`);
      }

      const normalizedCode = code.toLowerCase();
      const normalizedLabel = label.toLowerCase();

      if (seenCodes.has(normalizedCode)) {
        throw new Error(`${variant.name || "Variant"} contains duplicate option codes`);
      }

      if (seenLabels.has(normalizedLabel)) {
        throw new Error(`${variant.name || "Variant"} contains duplicate option labels`);
      }

      seenCodes.add(normalizedCode);
      seenLabels.add(normalizedLabel);

      return {
        id: option.id,
        clientId: option.clientId,
        code,
        label,
        colorHex: variant.type === "COLOR" ? option.colorHex || code : null,
        sortOrder: option.sortOrder
      };
    });

    return {
      id: variant.id,
      clientId: variant.clientId,
      name: variant.name.trim(),
      type: variant.type,
      sortOrder: variant.sortOrder,
      options
    };
  });

  const syncedRows = syncProductCatalogVariants(
    variantGroups,
    state.productCatalogVariants,
    state.basePrice ?? 0,
    state.baseStock,
    state.minQty
  );

  if (!syncedRows.length && (state.basePrice == null || state.basePrice < 0)) {
    throw new Error("Base price is required when there are no product variants");
  }

  if (
    state.compareAtPrice != null &&
    state.basePrice != null &&
    state.compareAtPrice < state.basePrice
  ) {
    throw new Error("Compare at price must be greater than or equal to base price");
  }

  if (!syncedRows.length && state.pricingOptions.length) {
    validatePricingOptions(normalizePricingOptions(state.pricingOptions));
  }

  syncedRows.forEach((row) => validatePricingOptions(normalizePricingOptions(row.pricingOptions)));

  return {
    name: state.name.trim(),
    shortDescription: state.shortDescription.trim(),
    description: description || null,
    status: state.status,
    categoryId: state.categoryId || null,
    collectionIds: state.collectionIds,
    isPackaging: state.isPackaging,
    bulkPricingEnabled: state.bulkPricingEnabled,
    shippingProfileId: state.shippingProfileId || null,
    weightOz: state.weightOz,
    lengthIn: state.lengthIn,
    widthIn: state.widthIn,
    heightIn: state.heightIn,
    basePrice: syncedRows.length ? null : (state.basePrice ?? 0),
    compareAtPrice: state.compareAtPrice,
    minQty: state.minQty,
    baseStock: syncedRows.length ? 0 : state.baseStock,
    currency: "USD",
    images: normalizeImages(state.images).map((image) => ({
      id: image.id,
      clientId: image.clientId,
      url: image.url,
      key: image.key ?? null,
      alt: image.alt?.trim() || null,
      sortOrder: image.sortOrder
    })),
    variantGroups,
    productCatalogVariants: syncedRows.map((variant) => ({
      id: variant.id,
      clientId: variant.clientId,
      title: variant.title,
      selectedOptionIds: [...variant.selectedOptionIds],
      selectedOptions: variant.selectedOptions.map((item) => ({
        variantId: item.variantId,
        variantName: item.variantName,
        variantType: item.variantType,
        variantOptionId: item.variantOptionId,
        code: item.code,
        label: item.label,
        colorHex: item.colorHex,
        sortOrder: item.sortOrder
      })),
      price: Number(variant.price || 0),
      stock: Number(variant.stock || 0),
      minQty: Math.max(1, Number(variant.minQty || 1)),
      isDefault: !!variant.isDefault,
      sortOrder: variant.sortOrder,
      imageIds: [...variant.imageIds],
      pricingOptions: normalizePricingOptions(variant.pricingOptions)
    })),
    pricingOptions: syncedRows.length ? [] : normalizePricingOptions(state.pricingOptions)
  } satisfies CreateProductInput;
}