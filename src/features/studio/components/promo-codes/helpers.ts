import type { PromoCodeRow } from "./types";

export function formatDiscount(row: PromoCodeRow): string {
  const value = Number(row.discountValue);
  if (row.discountType === "PERCENT") return `${value}%`;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export function statusClass(row: PromoCodeRow): string {
  if (!row.isActive) return "text-primary/40";
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    return "border-rose-500/40 text-rose-500";
  }
  if (row.maxRedemptions !== null && row.redemptionCount >= row.maxRedemptions) {
    return "border-amber-500/40 text-amber-500";
  }
  return "border-emerald-500/40 text-emerald-500";
}

export function statusLabel(row: PromoCodeRow): string {
  if (!row.isActive) return "Inactive";
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return "Expired";
  if (row.maxRedemptions !== null && row.redemptionCount >= row.maxRedemptions) {
    return "Maxed";
  }
  return "Active";
}
