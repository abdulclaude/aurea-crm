import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDecimalMoney } from "@/features/commerce/lib/money";
import type { PromoRedemptionRow } from "./types";

function money(value: string | null, currency: string): string {
  if (value === null) return "Unavailable";
  try {
    return formatDecimalMoney(value, currency);
  } catch {
    return `${currency} ${value}`;
  }
}

function statusColor(status: PromoRedemptionRow["status"]): string {
  if (status === "SUCCEEDED") return "#16a34a";
  if (status === "PENDING") return "#d97706";
  if (status === "REFUNDED") return "#2563eb";
  if (status === "FAILED" || status === "CANCELLED") return "#dc2626";
  return "#64748b";
}

export function createRecentPromoRedemptionColumns(): ColumnDef<PromoRedemptionRow>[] {
  return [
    {
      id: "name",
      accessorKey: "memberName",
      header: "Name",
      meta: { label: "Name" },
      enableHiding: false,
      cell: ({ row }) =>
        row.original.memberId ? (
          <Link
            href={`/members/${row.original.memberId}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            {row.original.memberName ?? "Unknown member"}
          </Link>
        ) : (
          <span className="text-xs text-primary/50">Unknown member</span>
        ),
    },
    {
      id: "promoCode",
      accessorKey: "promoCode",
      header: "Promo code",
      meta: { label: "Promo code" },
      cell: ({ row }) => (
        <code className="font-mono text-xs font-semibold">
          {row.original.promoCode}
        </code>
      ),
    },
    {
      id: "discount",
      accessorKey: "discountAmount",
      header: "Discount",
      meta: { label: "Discount" },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-emerald-600">
          {row.original.discountAmount
            ? `-${money(row.original.discountAmount, row.original.currency)}`
            : "Unavailable"}
        </span>
      ),
    },
    {
      id: "originalPrice",
      accessorKey: "amountBeforeDiscount",
      header: "Original price",
      meta: { label: "Original price" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/65">
          {money(row.original.amountBeforeDiscount, row.original.currency)}
        </span>
      ),
    },
    {
      id: "newPrice",
      accessorKey: "amountAfterDiscount",
      header: "New price",
      meta: { label: "New price" },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-primary">
          {money(row.original.amountAfterDiscount, row.original.currency)}
        </span>
      ),
    },
    {
      id: "redeemedOn",
      accessorKey: "redeemedAt",
      header: "Redeemed on",
      meta: { label: "Redeemed on" },
      cell: ({ row }) => (
        <div className="space-y-0.5 text-xs text-primary/65">
          <p>{format(new Date(row.original.redeemedAt), "EEEE")}</p>
          <p className="text-[11px] text-primary/40">
            {format(new Date(row.original.redeemedAt), "MMM d, yyyy")}
          </p>
        </div>
      ),
    },
    {
      id: "pricingOption",
      accessorKey: "pricingOptionName",
      header: "Pricing option",
      meta: { label: "Pricing option" },
      cell: ({ row }) =>
        row.original.pricingOptionId ? (
          <Link
            href={`/studio/pricing-options?pricingOptionId=${encodeURIComponent(row.original.pricingOptionId)}`}
            className="block max-w-xs truncate text-xs text-primary hover:underline"
          >
            {row.original.pricingOptionName ?? "Pricing option"}
          </Link>
        ) : (
          <span className="text-xs text-primary/40">
            {row.original.pricingOptionReferenceId
              ? "Unavailable pricing option"
              : "Not recorded"}
          </span>
        ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => {
        const color = statusColor(row.original.status);
        return (
          <Badge
            variant="outline"
            className="text-[10px] ring-0"
            style={{
              backgroundColor: `${color}18`,
              borderColor: `${color}66`,
              color,
              boxShadow: `0 0 0 1px ${color}66`,
            }}
          >
            {`${row.original.status.charAt(0)}${row.original.status.slice(1).toLowerCase()}`}
          </Badge>
        );
      },
    },
  ];
}
