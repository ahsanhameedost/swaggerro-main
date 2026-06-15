
export function formatMoney(amount: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount ?? 0);
}

export function formatMoneyRange(minAmount: number | null | undefined, maxAmount: number | null | undefined, currency = "USD") {
  const min = minAmount ?? 0;
  const max = maxAmount ?? 0;

  if (Math.abs(min - max) < 0.00001) {
    return formatMoney(min, currency);
  }

  return `${formatMoney(min, currency)} - ${formatMoney(max, currency)}`;
}