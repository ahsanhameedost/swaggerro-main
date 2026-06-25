import type {
  BulkCartItem,
  CatalogCartSnapshot,
  SwagPackCartItem,
  SwagPackPackagingItem
} from "./cart-store";
import {
  resolveUnitPrice,
  findMatchingPricingOption,
  computeSavingsPercent
} from "./catalog-pricing";

export type AppliedTierInfo = {
  /** Human label for the applied volume tier, e.g. "100+ units" or "25–99 units". Null when no tier applied. */
  label: string | null;
  qtyFrom: number | null;
  savingsPercent: number;
  discountPerUnit: number;
  discountTotal: number;
};

export type PricedBulkCartItem = BulkCartItem & {
  unitPrice: number;
  totalPrice: number;
} & AppliedTierInfo;

function describeTier(option: ReturnType<typeof findMatchingPricingOption>): {
  label: string | null;
  qtyFrom: number | null;
} {
  if (!option) {
    return { label: null, qtyFrom: null };
  }
  if (option.isOnward || option.qtyTo == null) {
    return { label: `${option.qtyFrom}+ units`, qtyFrom: option.qtyFrom };
  }
  return { label: `${option.qtyFrom}–${option.qtyTo} units`, qtyFrom: option.qtyFrom };
}

export type PricedSwagPackItem = SwagPackCartItem & {
  unitPrice: number;
  totalUnits: number;
  pricePerPack: number;
  totalPrice: number;
  exceedsStock: boolean;
};

export type PricedSwagPackPackagingItem = SwagPackPackagingItem & {
  unitPrice: number;
  totalUnits: number;
  pricePerPack: number;
  totalPrice: number;
  exceedsStock: boolean;
};

export type CatalogCartSummary = {
  bulkItems: PricedBulkCartItem[];
  swagPackItems: PricedSwagPackItem[];
  swagPackPackaging: PricedSwagPackPackagingItem | null;
  bulkTotal: number;
  swagPackTotal: number;
  total: number;
  bulkItemCount: number;
  swagPackItemCount: number;
  packQuantity: number;
  swagPackName: string;
  hasBulkItems: boolean;
  hasSwagPack: boolean;
  hasItems: boolean;
  requiresPackaging: boolean;
  hasMissingPackaging: boolean;
  hasInvalidBulkQuantities: boolean;
  hasInvalidSwagPackQuantities: boolean;
};

export function createDefaultSwagPackName(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());
  return `My Swag Pack ${month}/${day}/${year}`;
}

export function buildBulkPricedItems(items: BulkCartItem[]) {
  return items.map((item) => {
    const unitPrice = resolveUnitPrice(item.basePrice, item.quantity, item.pricingOptions);
    const matchedTier = findMatchingPricingOption(item.quantity, item.pricingOptions);
    const tier = describeTier(matchedTier);
    const discountPerUnit = Math.max(0, (item.basePrice ?? unitPrice) - unitPrice);
    return {
      ...item,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
      label: tier.label,
      qtyFrom: tier.qtyFrom,
      savingsPercent: computeSavingsPercent(item.basePrice, unitPrice),
      discountPerUnit,
      discountTotal: discountPerUnit * item.quantity
    } satisfies PricedBulkCartItem;
  });
}

export function buildSwagPackPricedItems(items: SwagPackCartItem[], packQuantity: number) {
  return items.map((item) => {
    const safePackQuantity = Math.max(25, Math.floor(packQuantity || 25));
    const quantityPerPack = Math.max(1, Math.floor(item.quantityPerPack || 1));
    const totalUnits = safePackQuantity * quantityPerPack;
    const unitPrice = resolveUnitPrice(item.basePrice, safePackQuantity, item.pricingOptions);

    return {
      ...item,
      quantityPerPack,
      totalUnits,
      unitPrice,
      pricePerPack: unitPrice * quantityPerPack,
      totalPrice: unitPrice * totalUnits,
      exceedsStock: item.stock > 0 ? totalUnits > item.stock : true
    } satisfies PricedSwagPackItem;
  });
}

export function buildSwagPackPackagingItem(
  packaging: SwagPackPackagingItem | null,
  packQuantity: number
) {
  if (!packaging) {
    return null;
  }

  const safePackQuantity = Math.max(25, Math.floor(packQuantity || 25));
  const unitPrice = resolveUnitPrice(packaging.basePrice, safePackQuantity, packaging.pricingOptions);

  return {
    ...packaging,
    quantityPerPack: 1,
    totalUnits: safePackQuantity,
    unitPrice,
    pricePerPack: unitPrice,
    totalPrice: unitPrice * safePackQuantity,
    exceedsStock: packaging.stock > 0 ? safePackQuantity > packaging.stock : true
  } satisfies PricedSwagPackPackagingItem;
}

// Logo fields live on the persisted snapshot but aren't needed to compute the
// summary, so accept them optionally — callers may or may not pass them.
type CartSummaryInput = Omit<CatalogCartSnapshot, "swagPackLogoUrl" | "swagPackLogoKey"> & {
  swagPackLogoUrl?: string | null;
  swagPackLogoKey?: string | null;
};

export function calculateCatalogCartSummary(state: CartSummaryInput): CatalogCartSummary {
  const packQuantity = Math.max(25, Math.floor(state.swagPackQuantity || 25));
  const swagPackName = state.swagPackName?.trim() || createDefaultSwagPackName();
  const bulkItems = buildBulkPricedItems(state.bulkItems);
  const swagPackItems = buildSwagPackPricedItems(state.swagPackItems, packQuantity);
  const swagPackPackaging = buildSwagPackPackagingItem(state.swagPackPackaging, packQuantity);

  const bulkTotal = bulkItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const swagPackItemsTotal = swagPackItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const swagPackPackagingTotal = swagPackPackaging?.totalPrice ?? 0;
  const swagPackTotal = swagPackItemsTotal + swagPackPackagingTotal;
  const hasBulkItems = bulkItems.length > 0;
  const hasSwagPack = swagPackItems.length > 0;
  const requiresPackaging = hasSwagPack;
  const hasMissingPackaging = requiresPackaging && !swagPackPackaging;
  const hasInvalidBulkQuantities = bulkItems.some(
    (item) => item.quantity < item.minQty || (item.stock > 0 && item.quantity > item.stock)
  );
  const hasInvalidSwagPackQuantities =
    swagPackItems.some((item) => item.quantityPerPack < 1 || item.exceedsStock) ||
    Boolean(swagPackPackaging?.exceedsStock);

  return {
    bulkItems,
    swagPackItems,
    swagPackPackaging,
    bulkTotal,
    swagPackTotal,
    total: bulkTotal + swagPackTotal,
    bulkItemCount: bulkItems.length,
    swagPackItemCount: swagPackItems.length + (swagPackPackaging ? 1 : 0),
    packQuantity,
    swagPackName,
    hasBulkItems,
    hasSwagPack,
    hasItems: hasBulkItems || hasSwagPack,
    requiresPackaging,
    hasMissingPackaging,
    hasInvalidBulkQuantities,
    hasInvalidSwagPackQuantities
  };
}
