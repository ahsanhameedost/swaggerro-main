/**
 * Swaggeroo commission math — the single source of truth (web side) for how a
 * sale through a seller store is split between the seller and the platform.
 *
 * The "commission" is the configured cut (percent or flat). WHO keeps it depends
 * on who owns the product:
 *  - PLATFORM-owned (Swaggeroo's own catalog, the current default): the seller
 *    only earns the commission and Swaggeroo keeps the rest (the product price).
 *  - SELLER-owned (future, once sellers may add their own products): the split
 *    flips — the seller keeps the price and Swaggeroo takes the commission.
 *
 * Two commission modes per product (CatalogProduct.commissionType):
 *  - PERCENT: cut = rate% of the sale price (capped 0-15; store-level fallback
 *    used when no per-product value is set).
 *  - FLAT: a fixed dollar cut defined at the catalog base price that scales
 *    proportionally as the price rises.
 *
 * Keep this file in sync with apps/api/src/catalog/common/commission.ts.
 */

export type SwagCommissionType = "PERCENT" | "FLAT";

/** Who owns the product being sold — decides which side keeps the commission. */
export type ProductOwnership = "PLATFORM" | "SELLER";

export const MAX_COMMISSION_PERCENT = 15;

export type CommissionConfig = {
  commissionType: SwagCommissionType;
  /** Percent (0-15) when PERCENT, flat dollar amount at base price when FLAT. */
  commissionValue: number | null;
  /** Catalog base price — the reference / minimum sale price. */
  basePrice: number;
  /** Store commission percent fallback, used for PERCENT when value is null. */
  fallbackPercent: number;
  /** Product ownership; defaults to PLATFORM (seller earns only the commission). */
  ownership?: ProductOwnership;
};

export type CommissionResult = {
  /** The commission amount on this sale, in dollars (rounded to cents). */
  commission: number;
  /** What the seller keeps (ownership-aware). */
  sellerEarning: number;
  /** What the platform (Swaggeroo) keeps (ownership-aware). */
  platformEarning: number;
  /** Effective commission as a percentage of the sale price (for display). */
  effectivePercent: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Resolve the effective percent used for a PERCENT product. */
export function resolveCommissionPercent(config: Pick<CommissionConfig, "commissionValue" | "fallbackPercent">) {
  const raw = config.commissionValue ?? config.fallbackPercent ?? 0;
  return clamp(raw, 0, MAX_COMMISSION_PERCENT);
}

/** Compute the sale split (seller vs platform) for a given sale price. */
export function computeCommission(salePrice: number, config: CommissionConfig): CommissionResult {
  const price = Math.max(0, salePrice || 0);
  const base = config.basePrice > 0 ? config.basePrice : price;

  let commission: number;
  if (config.commissionType === "FLAT") {
    const flatAtBase = Math.max(0, config.commissionValue ?? 0);
    commission = base > 0 ? flatAtBase * (price / base) : flatAtBase;
  } else {
    const percent = resolveCommissionPercent(config);
    commission = (price * percent) / 100;
  }

  commission = round2(Math.min(commission, price));
  const remainder = round2(price - commission);
  const effectivePercent = price > 0 ? round2((commission / price) * 100) : 0;

  // PLATFORM-owned (default): the seller earns only the commission, Swaggeroo
  // keeps the rest. SELLER-owned: the seller keeps the price, Swaggeroo takes
  // the commission.
  const ownership = config.ownership ?? "PLATFORM";
  const sellerEarning = ownership === "SELLER" ? remainder : commission;
  const platformEarning = ownership === "SELLER" ? commission : remainder;

  return { commission, sellerEarning, platformEarning, effectivePercent };
}
