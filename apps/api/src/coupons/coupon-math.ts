/**
 * Coupon discount math — the single source of truth for how much a coupon takes
 * off an order. Kept pure and defensive so it can never break existing pricing:
 * the returned discount is always in [0, eligibleSubtotal], so total − discount
 * can never go negative.
 */
export type CouponDiscountType = "PERCENT" | "FIXED";

export type CouponForPricing = {
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscount: number | null;
  productIds: string[];
};

export type CartLineForCoupon = { productId: string; lineTotal: number };

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * The portion of the order a coupon may discount. When the coupon restricts to
 * specific products, only those lines count; otherwise the whole subtotal.
 */
export function eligibleSubtotal(productIds: string[], lines: CartLineForCoupon[]): number {
  const restricted = productIds.length > 0;
  const set = restricted ? new Set(productIds) : null;
  const sum = lines.reduce(
    (acc, l) => acc + (set ? (set.has(l.productId) ? l.lineTotal : 0) : l.lineTotal),
    0
  );
  return Math.max(0, round2(sum));
}

/** Sum of all line totals — the full order subtotal. */
export function linesSubtotal(lines: CartLineForCoupon[]): number {
  return Math.max(0, round2(lines.reduce((acc, l) => acc + l.lineTotal, 0)));
}

/**
 * Compute the discount for a coupon against an eligible subtotal. PERCENT is
 * optionally capped by maxDiscount; FIXED can never exceed the eligible amount.
 * Result is clamped to [0, eligible].
 */
export function computeCouponDiscount(coupon: CouponForPricing, eligible: number): number {
  const base = Math.max(0, eligible);
  let discount: number;
  if (coupon.discountType === "PERCENT") {
    const pct = Math.min(100, Math.max(0, coupon.discountValue));
    discount = (base * pct) / 100;
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = Math.min(coupon.discountValue, base);
  }
  return Math.max(0, Math.min(round2(discount), base));
}
