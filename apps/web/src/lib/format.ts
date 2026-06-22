/** Money + display formatting. All money is integer cents. */

export function formatCents(
  cents: number,
  opts: { currency?: string; withCents?: boolean } = {},
): string {
  const { currency = "usd", withCents = true } = opts;
  const dollars = cents / 100;
  const fractionDigits = withCents ? 2 : Number.isInteger(dollars) ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(dollars);
}

/** "$11.50/ea" — per-unit price label. */
export function formatPerUnit(cents: number, currency = "usd"): string {
  return `${formatCents(cents, { currency })}/ea`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
