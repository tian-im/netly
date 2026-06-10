/**
 * Shared utility to get the symbol for a given currency code.
 */
export function getCurrencySymbol(currency: string): string {
  switch (currency?.toUpperCase()) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY':
    case 'CNY': return '¥';
    default: return '$';
  }
}
