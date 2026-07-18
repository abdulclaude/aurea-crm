import { calculateApplicationFeeMinor } from "@/features/stripe-connect/lib/application-fee";

export function calculateInvoiceApplicationFeeMinor(input: {
  amountMinor: number;
  currencyExponent: number;
  percent: string | null;
  fixed: string | null;
}): number | undefined {
  return calculateApplicationFeeMinor(input);
}
