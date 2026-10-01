const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: 'AU$',
  USD: 'US$',
  GBP: '£',
  EUR: '€',
  SGD: 'S$',
  INR: '₹',
  CAD: 'CA$',
  NZD: 'NZ$',
  JPY: '¥',
};

/**
 * The create-invoice form only collects a currency code (per spec §2.1.4's field table) —
 * the display symbol is derived server-side, never user input. Falls back to the code itself
 * for currencies outside the small known set.
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] ?? currencyCode.toUpperCase();
}
