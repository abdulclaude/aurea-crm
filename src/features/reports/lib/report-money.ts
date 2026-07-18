import {
  currencyExponent,
  decimalToMinorUnits,
  minorUnitsToDecimal,
} from "@/features/commerce/lib/money";

const MAX_SAFE_MINOR = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE_MINOR = BigInt(Number.MIN_SAFE_INTEGER);
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TWO = BigInt(2);

export function reportMoneyToMinor(value: string, currency: string): number {
  return decimalToMinorUnits(value, currencyExponent(currency));
}

export function reportMoneyFromMinor(value: number, currency: string): string {
  return minorUnitsToDecimal(value, currencyExponent(currency));
}

export function normalizeReportMoney(value: string, currency: string): string {
  return reportMoneyFromMinor(reportMoneyToMinor(value, currency), currency);
}

export function addReportMoney(
  first: string,
  second: string,
  currency: string,
): string {
  return reportMoneyFromMinor(
    checkedMinor(
      BigInt(reportMoneyToMinor(first, currency)) +
        BigInt(reportMoneyToMinor(second, currency)),
    ),
    currency,
  );
}

export function subtractReportMoney(
  first: string,
  second: string,
  currency: string,
): string {
  return reportMoneyFromMinor(
    checkedMinor(
      BigInt(reportMoneyToMinor(first, currency)) -
        BigInt(reportMoneyToMinor(second, currency)),
    ),
    currency,
  );
}

export function multiplyReportMoney(
  value: string,
  quantity: number,
  currency: string,
): string {
  if (!Number.isSafeInteger(quantity)) {
    throw new Error("Report money quantity must be a safe integer");
  }
  return reportMoneyFromMinor(
    checkedMinor(
      BigInt(reportMoneyToMinor(value, currency)) * BigInt(quantity),
    ),
    currency,
  );
}

export function prorateReportMoney(input: {
  total: string;
  numerator: number;
  denominator: number;
  currency: string;
}): string {
  if (
    !Number.isSafeInteger(input.numerator) ||
    !Number.isSafeInteger(input.denominator) ||
    input.numerator < 0 ||
    input.denominator <= 0 ||
    input.numerator > input.denominator
  ) {
    throw new Error("Report money proration requires a valid integer ratio");
  }

  const totalMinor = BigInt(reportMoneyToMinor(input.total, input.currency));
  const sign = totalMinor < BIGINT_ZERO ? -BIGINT_ONE : BIGINT_ONE;
  const absoluteTotal = totalMinor < BIGINT_ZERO ? -totalMinor : totalMinor;
  const numerator = BigInt(input.numerator);
  const denominator = BigInt(input.denominator);
  const rounded =
    (absoluteTotal * numerator + denominator / BIGINT_TWO) / denominator;

  return reportMoneyFromMinor(checkedMinor(rounded * sign), input.currency);
}

export function averageReportMoney(
  total: string,
  count: number,
  currency: string,
): string | null {
  if (!Number.isSafeInteger(count) || count <= 0) return null;
  const totalMinor = BigInt(reportMoneyToMinor(total, currency));
  const sign = totalMinor < BIGINT_ZERO ? -BIGINT_ONE : BIGINT_ONE;
  const absoluteTotal = totalMinor < BIGINT_ZERO ? -totalMinor : totalMinor;
  const divisor = BigInt(count);
  const rounded = (absoluteTotal + divisor / BIGINT_TWO) / divisor;
  return reportMoneyFromMinor(checkedMinor(rounded * sign), currency);
}

export function signedReportMoney(
  value: string,
  negative: boolean,
  currency: string,
): string {
  const minor = reportMoneyToMinor(value, currency);
  const signed = negative ? -Math.abs(minor) : minor;
  return reportMoneyFromMinor(signed, currency);
}

function checkedMinor(value: bigint): number {
  if (value > MAX_SAFE_MINOR || value < MIN_SAFE_MINOR) {
    throw new Error("Report money exceeds the supported range");
  }
  return Number(value);
}
