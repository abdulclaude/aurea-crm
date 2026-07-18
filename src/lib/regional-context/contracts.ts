import { z } from "zod";

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isValidLocale(value: string): boolean {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

function isValidCurrency(value: string): boolean {
  try {
    return Intl.supportedValuesOf("currency").includes(value);
  } catch {
    return /^[A-Z]{3}$/.test(value);
  }
}

export const regionalTimezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(isValidTimezone, "Choose a valid IANA timezone.");

export const regionalLocaleSchema = z
  .string()
  .trim()
  .min(2)
  .max(35)
  .refine(isValidLocale, "Choose a valid locale.");

export const regionalCurrencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase())
  .refine(isValidCurrency, "Choose a supported ISO currency.");

export function resolveRegionalCurrency(
  explicitCurrency: string | null | undefined,
  workspaceCurrency: string,
): string {
  return regionalCurrencySchema.parse(explicitCurrency ?? workspaceCurrency);
}
