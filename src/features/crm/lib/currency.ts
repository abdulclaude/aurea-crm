/**
 * Currency conversion utilities for CRM
 *
 * Approximate exchange rates to USD (updated periodically)
 * For production, consider using a real-time exchange rate API
 */

export const CURRENCY_TO_USD_RATES: Record<string, number> = {
  USD: 1.0,
  GBP: 1.27, // British Pound
  EUR: 1.09, // Euro
  CAD: 0.72, // Canadian Dollar
  AUD: 0.65, // Australian Dollar
  JPY: 0.0067, // Japanese Yen
  CHF: 1.14, // Swiss Franc
  CNY: 0.14, // Chinese Yuan
  INR: 0.012, // Indian Rupee
  MXN: 0.059, // Mexican Peso
  BRL: 0.2, // Brazilian Real
  ZAR: 0.055, // South African Rand
  SGD: 0.74, // Singapore Dollar
  HKD: 0.13, // Hong Kong Dollar
  NZD: 0.59, // New Zealand Dollar
  SEK: 0.096, // Swedish Krona
  NOK: 0.093, // Norwegian Krone
  DKK: 0.15, // Danish Krone
  PLN: 0.25, // Polish Zloty
  TRY: 0.035, // Turkish Lira
  RUB: 0.01, // Russian Ruble
  KRW: 0.00075, // South Korean Won
  THB: 0.029, // Thai Baht
  MYR: 0.22, // Malaysian Ringgit
  IDR: 0.000063, // Indonesian Rupiah
  PHP: 0.017, // Philippine Peso
  VND: 0.00004, // Vietnamese Dong
  AED: 0.27, // UAE Dirham
  SAR: 0.27, // Saudi Riyal
  EGP: 0.02, // Egyptian Pound
  NGN: 0.00065, // Nigerian Naira
  KES: 0.0077, // Kenyan Shilling
  ARS: 0.001, // Argentine Peso
  CLP: 0.001, // Chilean Peso
  COP: 0.00024, // Colombian Peso
  PEN: 0.27, // Peruvian Sol
};

/**
 * Convert a value from any currency to USD
 * @param value - The amount in the source currency
 * @param currency - The source currency code (e.g., "GBP", "EUR")
 * @returns The value converted to USD
 */
export function convertToUSD(
  value: number | null | undefined,
  currency: string | null | undefined,
): number {
  if (!value || value === null || value === undefined) {
    return 0;
  }

  const currencyCode = (currency || "USD").toUpperCase();
  const rate = CURRENCY_TO_USD_RATES[currencyCode];

  if (!rate) {
    // If we don't have a rate for this currency, assume it's USD
    console.warn(`Unknown currency code: ${currencyCode}, treating as USD`);
    return Number(value);
  }

  return Number(value) * rate;
}

/**
 * Convert a value from one currency to another
 * @param value - The amount in the source currency
 * @param fromCurrency - The source currency code (e.g., "GBP", "EUR")
 * @param toCurrency - The target currency code (e.g., "USD", "EUR")
 * @returns The value converted to the target currency
 */
export function convertCurrency(
  value: number | null | undefined,
  fromCurrency: string | null | undefined,
  toCurrency: string | null | undefined,
): number {
  if (!value || value === null || value === undefined) {
    return 0;
  }

  const fromCode = (fromCurrency || "USD").toUpperCase();
  const toCode = (toCurrency || "USD").toUpperCase();

  // If same currency, no conversion needed
  if (fromCode === toCode) {
    return Number(value);
  }

  const fromRate = CURRENCY_TO_USD_RATES[fromCode];
  const toRate = CURRENCY_TO_USD_RATES[toCode];

  if (!fromRate) {
    console.warn(`Unknown source currency code: ${fromCode}, treating as USD`);
    return !toRate ? Number(value) : Number(value) / toRate;
  }

  if (!toRate) {
    console.warn(`Unknown target currency code: ${toCode}, treating as USD`);
    return Number(value) * fromRate;
  }

  // Convert: source -> USD -> target
  const valueInUSD = Number(value) * fromRate;
  return valueInUSD / toRate;
}

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  KRW: "₩",
  RUB: "₽",
  PHP: "₱",
  THB: "฿",
};

/**
 * Get the currency symbol for a currency code
 * @param currency - The currency code
 * @returns The currency symbol
 */
export function getCurrencySymbol(currency: string | null | undefined): string {
  const currencyCode = (currency || "USD").toUpperCase();
  return CURRENCY_SYMBOLS[currencyCode] || `${currencyCode} `;
}

/**
 * Format a currency value with its symbol
 * @param value - The amount
 * @param currency - The currency code
 * @returns Formatted string with currency symbol
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (!value || value === null || value === undefined) {
    return "$0";
  }

  const currencyCode = (currency || "USD").toUpperCase();
  const numValue = Number(value);

  const symbol = getCurrencySymbol(currencyCode);

  // Format with commas
  const formatted = numValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formatted}`;
}
