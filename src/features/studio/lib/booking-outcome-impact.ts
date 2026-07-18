export type BookingOutcome = "NO_SHOW" | "LATE_CANCEL";

export type BookingOutcomePolicy = {
  chargeCard: boolean;
  creditsDeducted: number;
  currency: string;
  deductCredits: boolean;
  lateCancelFee: string;
  name: string;
  noShowFeeAmount: string;
};

export function buildBookingOutcomeImpact({
  bookingCount,
  outcome,
  policy,
}: {
  bookingCount: number;
  outcome: BookingOutcome;
  policy: BookingOutcomePolicy | null;
}) {
  if (!policy) {
    return {
      automaticCollection: false,
      creditsDeducted: 0,
      feeAmount: null,
      totalFeeAmount: null,
    };
  }

  const feeAmount =
    outcome === "NO_SHOW" ? policy.noShowFeeAmount : policy.lateCancelFee;
  const hasFee = !/^0+(?:\.0+)?$/.test(feeAmount);
  const exponent = currencyExponent(policy.currency);
  const feeMinor = hasFee ? decimalToMinorUnits(feeAmount, exponent) : 0;
  const totalMinor = feeMinor * bookingCount;
  if (!Number.isSafeInteger(totalMinor)) {
    throw new Error("Cancellation fee total exceeds the supported range");
  }

  return {
    automaticCollection: policy.chargeCard && hasFee,
    creditsDeducted: policy.deductCredits
      ? policy.creditsDeducted * bookingCount
      : 0,
    feeAmount: hasFee ? feeAmount : null,
    totalFeeAmount: hasFee ? minorUnitsToDecimal(totalMinor, exponent) : null,
  };
}
import {
  currencyExponent,
  decimalToMinorUnits,
  minorUnitsToDecimal,
} from "@/features/commerce/lib/money";
