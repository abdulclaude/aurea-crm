const DECIMAL_MONEY_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

export function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error("Currency must be a three-letter ISO code");
  }
  return normalized;
}

export function currencyExponent(currency: string): number {
  const normalized = normalizeCurrency(currency);
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalized,
  });
  return formatter.resolvedOptions().maximumFractionDigits ?? 2;
}

export function decimalToMinorUnits(value: string, exponent: number): number {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 6) {
    throw new Error("Currency exponent is outside the supported range");
  }

  const match = DECIMAL_MONEY_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error("Money value must be a decimal string");
  }

  const sign = match[1] ?? "";
  const whole = match[2];
  const fraction = match[3] ?? "";
  if (!whole) {
    throw new Error("Money value must include whole units");
  }
  if (fraction.length > exponent) {
    const discarded = fraction.slice(exponent);
    if (/[1-9]/.test(discarded)) {
      throw new Error("Money value has more precision than its currency supports");
    }
  }

  const paddedFraction = fraction.slice(0, exponent).padEnd(exponent, "0");
  const magnitude =
    Number(whole) * 10 ** exponent + Number(paddedFraction || "0");
  const signed = sign === "-" ? -magnitude : magnitude;

  if (!Number.isSafeInteger(signed)) {
    throw new Error("Money value exceeds the supported range");
  }

  return signed;
}

export function multiplyDecimalsToMinorUnits(
  left: string,
  right: string,
  exponent: number,
): number {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 6) {
    throw new Error("Currency exponent is outside the supported range");
  }

  const parse = (value: string) => {
    const match = DECIMAL_MONEY_PATTERN.exec(value.trim());
    if (!match || !match[2]) {
      throw new Error("Decimal factor must be a decimal string");
    }
    const fraction = match[3] ?? "";
    return {
      negative: match[1] === "-",
      magnitude: BigInt(`${match[2]}${fraction}`),
      scale: fraction.length,
    };
  };

  const leftDecimal = parse(left);
  const rightDecimal = parse(right);
  const product = leftDecimal.magnitude * rightDecimal.magnitude;
  const sourceDivisor =
    BigInt(10) ** BigInt(leftDecimal.scale + rightDecimal.scale);
  const scaledProduct = product * BigInt(10) ** BigInt(exponent);
  const quotient = scaledProduct / sourceDivisor;
  const remainder = scaledProduct % sourceDivisor;
  const rounded =
    quotient +
    (remainder * BigInt(2) >= sourceDivisor ? BigInt(1) : BigInt(0));
  const signed = leftDecimal.negative !== rightDecimal.negative ? -rounded : rounded;

  if (
    signed > BigInt(Number.MAX_SAFE_INTEGER) ||
    signed < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new Error("Money value exceeds the supported range");
  }

  return Number(signed);
}

export function minorUnitsToDecimal(value: number, exponent: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new Error("Minor-unit money value must be a safe integer");
  }
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 6) {
    throw new Error("Currency exponent is outside the supported range");
  }

  const negative = value < 0;
  const magnitude = Math.abs(value);
  const divisor = 10 ** exponent;
  const whole = Math.trunc(magnitude / divisor);
  const fraction = magnitude % divisor;
  const prefix = negative ? "-" : "";

  if (exponent === 0) {
    return `${prefix}${whole}`;
  }

  return `${prefix}${whole}.${fraction.toString().padStart(exponent, "0")}`;
}

export function assertMinorUnits(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Provider amount must be a non-negative safe integer");
  }
  return value;
}

export function formatMinorUnits(
  value: number,
  currency: string,
  exponent = currencyExponent(currency),
): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: normalizeCurrency(currency),
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(Number(minorUnitsToDecimal(value, exponent)));
}

export function formatDecimalMoney(value: string, currency: string): string {
  const exponent = currencyExponent(currency);
  return formatMinorUnits(
    decimalToMinorUnits(value, exponent),
    currency,
    exponent,
  );
}
