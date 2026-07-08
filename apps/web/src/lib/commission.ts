/**
 * Swaggeroo commission math — the single source of truth (web side) for how a
 * sale through a seller store is split between the seller and the platform.
 *
 * MARKUP-SPLIT MODEL (current):
 *  - Every product has a catalog **base price** that Swaggeroo always keeps.
 *  - A seller may sell at that base price (earns nothing) or set a higher
 *    **custom price**. The difference (the "markup") is split 50/50: the seller
 *    keeps half, Swaggeroo keeps the base price plus the other half.
 *      e.g. base $20, sold at $30 → markup $10 → seller +$5, Swaggeroo $25.
 *  - At the base price the markup is 0, so the seller earns 0.
 *
 * Ownership (CatalogProduct.ownerStoreId) decides which side keeps the markup cut:
 *  - PLATFORM-owned (Swaggeroo's own catalog, the default): the seller keeps the
 *    markup cut, Swaggeroo keeps the base price plus the rest.
 *  - SELLER-owned (future): flipped — the seller keeps everything except the cut.
 *
 * Keep this file in sync with apps/api/src/catalog/common/commission.ts.
 */

export type SwagCommissionType = "PERCENT" | "FLAT";

/** Who owns the product being sold — decides which side keeps the markup cut. */
export type ProductOwnership = "PLATFORM" | "SELLER";

/** The seller's share of the markup (price above base), as a percent. */
export const MARKUP_SPLIT_PERCENT = 50;

/** @deprecated Legacy percent cap — kept only for import compatibility. */
export const MAX_COMMISSION_PERCENT = 15;

export type CommissionConfig = {
  /** Catalog base price — always kept by the platform; the split reference. */
  basePrice: number;
  /** Seller's share of the markup, percent. Defaults to MARKUP_SPLIT_PERCENT (50). */
  markupSharePercent?: number;
  /** Product ownership; defaults to PLATFORM. */
  ownership?: ProductOwnership;
  // Legacy fields — no longer affect the split under the markup-split model.
  // Kept optional so existing callers keep compiling.
  commissionType?: SwagCommissionType;
  commissionValue?: number | null;
  fallbackPercent?: number;
};

export type CommissionResult = {
  /** The markup cut that changes hands on this sale, in dollars (rounded). */
  commission: number;
  /** What the seller keeps (ownership-aware). */
  sellerEarning: number;
  /** What the platform (Swaggeroo) keeps (ownership-aware). */
  platformEarning: number;
  /** Realized markup share as a percent (e.g. 50); 0 when sold at the base price. */
  effectivePercent: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Resolve the seller's markup share (percent) for a product. */
export function resolveCommissionPercent(config: Pick<CommissionConfig, "markupSharePercent">) {
  return clamp(config.markupSharePercent ?? MARKUP_SPLIT_PERCENT, 0, 100);
}

/**
 * Compute the sale split for a given sale price.
 * salePrice defaults to basePrice when not provided (the catalog-default sale,
 * which earns the seller nothing).
 */
export function computeCommission(salePrice: number, config: CommissionConfig): CommissionResult {
  const base = Math.max(0, config.basePrice || 0);
  const price = Math.max(0, salePrice || 0);
  // The markup is whatever the seller charges above the catalog base price.
  const markup = Math.max(0, price - base);
  const share = resolveCommissionPercent(config);
  // The cut taken out of the markup. Zero at the base price (markup === 0).
  const cut = round2((markup * share) / 100);

  // PLATFORM-owned (default): the seller keeps the markup cut, Swaggeroo keeps
  // the base price plus the rest. SELLER-owned: flipped.
  const ownership = config.ownership ?? "PLATFORM";
  const sellerEarning = ownership === "SELLER" ? round2(price - cut) : cut;
  const platformEarning = round2(price - sellerEarning);
  const effectivePercent = markup > 0 ? round2((cut / markup) * 100) : 0;

  return { commission: cut, sellerEarning, platformEarning, effectivePercent };
}
