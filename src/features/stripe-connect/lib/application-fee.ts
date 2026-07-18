import { decimalToMinorUnits } from "@/features/commerce/lib/money";

const BASIS_POINTS_PER_PERCENT_SCALE = 10_000;

export function calculateApplicationFeeMinor(input: {
  amountMinor: number;
  currencyExponent: number;
  percent: string | null;
  fixed: string | null;
}): number | undefined {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Payment amount must be a positive safe integer");
  }

  const basisPoints = input.percent ? decimalToMinorUnits(input.percent, 2) : 0;
  if (basisPoints < 0 || basisPoints > BASIS_POINTS_PER_PERCENT_SCALE) {
    throw new Error("Application fee percent must be between 0 and 100");
  }

  const fixedMinor = input.fixed
    ? decimalToMinorUnits(input.fixed, input.currencyExponent)
    : 0;
  if (fixedMinor < 0) {
    throw new Error("Fixed application fee cannot be negative");
  }

  const fullBlocks = Math.trunc(
    input.amountMinor / BASIS_POINTS_PER_PERCENT_SCALE,
  );
  const remainder = input.amountMinor % BASIS_POINTS_PER_PERCENT_SCALE;
  const percentageMinor =
    fullBlocks * basisPoints +
    Math.round((remainder * basisPoints) / BASIS_POINTS_PER_PERCENT_SCALE);
  const feeMinor = percentageMinor + fixedMinor;

  if (!Number.isSafeInteger(feeMinor) || feeMinor >= input.amountMinor) {
    throw new Error("Application fee must be lower than the payment amount");
  }

  return feeMinor > 0 ? feeMinor : undefined;
}
