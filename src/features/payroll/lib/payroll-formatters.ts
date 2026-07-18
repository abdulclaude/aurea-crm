export function formatPayrollCurrency(
  amount: number | string | { toNumber?: () => number },
  currency = "GBP",
): string {
  const value =
    typeof amount === "object" &&
    amount !== null &&
    typeof amount.toNumber === "function"
      ? amount.toNumber()
      : Number(amount);

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPayrollHours(hours: number): string {
  return `${new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(hours)}h`;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
