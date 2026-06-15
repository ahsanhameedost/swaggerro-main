import type { CatalogPricingOption } from "@/lib/catalog";

function toSafeNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePricingOption(
  option: Partial<CatalogPricingOption> | null | undefined,
  index: number
): CatalogPricingOption | null {
  if (!option) {
    return null;
  }

  const qtyFrom = Math.max(1, toSafeNumber(option.qtyFrom, 1));
  const isOnward = Boolean(option.isOnward);
  const qtyTo =
    isOnward || option.qtyTo == null
      ? null
      : Math.max(1, toSafeNumber(option.qtyTo, qtyFrom));
  const price = Math.max(0, toSafeNumber(option.price, 0));
  const sortOrder = toSafeNumber(option.sortOrder, index);

  if (!isOnward && qtyTo !== null && qtyTo <= qtyFrom) {
    return null;
  }

  return {
    qtyFrom,
    qtyTo,
    price,
    isOnward,
    sortOrder
  };
}

export function sortPricingOptions(options?: CatalogPricingOption[] | null) {
  if (!Array.isArray(options) || !options.length) {
    return [] as CatalogPricingOption[];
  }

  return options
    .map((option, index) => normalizePricingOption(option, index))
    .filter((option): option is CatalogPricingOption => option !== null)
    .sort((left, right) => {
      if ((left.sortOrder ?? 0) !== (right.sortOrder ?? 0)) {
        return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
      }

      if (left.qtyFrom !== right.qtyFrom) {
        return left.qtyFrom - right.qtyFrom;
      }

      const leftTo = left.isOnward ? Number.MAX_SAFE_INTEGER : (left.qtyTo ?? Number.MAX_SAFE_INTEGER);
      const rightTo = right.isOnward ? Number.MAX_SAFE_INTEGER : (right.qtyTo ?? Number.MAX_SAFE_INTEGER);

      return leftTo - rightTo;
    });
}

export function findMatchingPricingOption(
  quantity: number,
  options?: CatalogPricingOption[] | null
) {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return null;
  }

  const sorted = sortPricingOptions(options);

  for (const option of sorted) {
    if (quantity < option.qtyFrom) {
      continue;
    }

    if (option.isOnward) {
      return option;
    }

    if (option.qtyTo != null && quantity <= option.qtyTo) {
      return option;
    }
  }

  return null;
}

export function resolveUnitPrice(
  basePrice: number | null | undefined,
  quantity: number,
  options?: CatalogPricingOption[] | null
) {
  const safeBasePrice = Math.max(0, toSafeNumber(basePrice, 0));
  const match = findMatchingPricingOption(quantity, options);

  if (!match) {
    return safeBasePrice;
  }

  return Math.max(0, toSafeNumber(match.price, safeBasePrice));
}

export function resolveLineTotal(
  basePrice: number | null | undefined,
  quantity: number,
  options?: CatalogPricingOption[] | null
) {
  const safeQuantity = Math.max(1, toSafeNumber(quantity, 1));
  return resolveUnitPrice(basePrice, safeQuantity, options) * safeQuantity;
}