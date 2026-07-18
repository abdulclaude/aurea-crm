export function formatRecoveryMoney(
  amountMinor: number,
  currency: string,
  exponent: number,
): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountMinor / 10 ** exponent);
}

export function formatRecoveryDate(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "-";
}
