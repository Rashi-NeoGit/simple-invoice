const AMOUNT_FORMATTER = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Shared by the invoice table and detail view so there's one formatting rule, not two. */
export function formatAmount(amount: number, currencySymbol: string): string {
  return `${currencySymbol}${AMOUNT_FORMATTER.format(amount)}`;
}
