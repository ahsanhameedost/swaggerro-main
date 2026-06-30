/**
 * Swaggeroo commission math — the single source of truth (web side) for how the
 * platform's cut is computed on a product sold through a seller store.
 *
 * Two modes per product (CatalogProduct.commissionType):
 *  - PERCENT: cut = rate% of the seller's sale price (capped 0-15; store-level
 *    fallback used when no per-product value is set).
 *  - FLAT: a fixed dollar cut defined at the catalog base price that scales
 *    proportionally as the seller raises their price.
 *
 * Keep this file in sync with apps/api/src/catalog/common/commission.ts.
 */

export type SwagCommissionType = "PERCENT" | "FLAT";

export const MAX_COMMISSION_PERCENT = 15;

export type CommissionConfig = {
  commissionType: SwagCommissionType;
  /** Percent (0-15) when PERCENT, flat dollar amount at base price when FLAT. */
  commissionValue: number | null;
  /** Catalog base price — the reference / minimum sale price. */
  basePrice: number;
  /** Store commission percent fallback, used for PERCENT when value is null. */
  fallbackPercent: number;
};

export type CommissionResult = {
  /** Platform's cut on this sale, in dollars (rounded to cents). */
  commission: number;
  /** What the seller keeps after the platform cut. */
  sellerEarning: number;
  /** Effective percentage of the sale price the platform took (for display). */
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

/** Compute the platform commission for a given sale price. */
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
  const sellerEarning = round2(price - commission);
  const effectivePercent = price > 0 ? round2((commission / price) * 100) : 0;

  return { commission, sellerEarning, effectivePercent };
}
