import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import type { AppRouter } from "@/trpc/routers/_app";
import { labelize } from "./member-lifecycle-types";

export type PaymentMethodRow =
  inferRouterOutputs<AppRouter>["clients"]["paymentMethods"]["methods"][number];

export const PAYMENT_METHOD_COLUMN_ORDER = [
  "card",
  "cardholderName",
  "expiry",
  "funding",
  "processor",
  "transactionCount",
  "lastUsedAt",
  "isDefault",
  "billingEmail",
];

export const paymentMethodColumns: ColumnDef<PaymentMethodRow>[] = [
  {
    id: "card",
    accessorFn: (row) => `${row.brand} ${row.last4}`,
    header: "Card",
    meta: { label: "Card" },
    enableHiding: false,
    cell: ({ row }) => (
      <div>
        <p className="text-xs font-medium capitalize">
          {row.original.brand} ending {row.original.last4}
        </p>
        <p className="text-[10px] text-primary/50">
          {row.original.wallet ? labelize(row.original.wallet) : "Physical card"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "cardholderName",
    header: "Cardholder",
    meta: { label: "Cardholder" },
    cell: ({ row }) => row.original.cardholderName ?? "Not provided",
  },
  {
    id: "expiry",
    accessorFn: (row) => `${row.expMonth}/${row.expYear}`,
    header: "Expiry",
    meta: { label: "Expiry" },
    cell: ({ row }) =>
      `${String(row.original.expMonth).padStart(2, "0")}/${String(row.original.expYear).slice(-2)}`,
  },
  {
    accessorKey: "funding",
    header: "Card type",
    meta: { label: "Card type" },
    cell: ({ row }) =>
      row.original.funding ? labelize(row.original.funding) : "Unknown",
  },
  {
    accessorKey: "processor",
    header: "Payment processor",
    meta: { label: "Payment processor" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="bg-violet-100 text-[11px] text-violet-600 ring-violet-300 dark:border-violet-800"
      >
        {row.original.processor}
      </Badge>
    ),
  },
  {
    accessorKey: "transactionCount",
    header: "Transactions",
    meta: { label: "Transactions" },
  },
  {
    accessorKey: "lastUsedAt",
    header: "Last used",
    meta: { label: "Last used" },
    cell: ({ row }) =>
      row.original.lastUsedAt
        ? format(new Date(row.original.lastUsedAt), "d MMM yyyy")
        : "Never",
  },
  {
    accessorKey: "isDefault",
    header: "Default card",
    meta: { label: "Default card" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.isDefault
            ? "bg-teal-100 text-[11px] text-teal-600 ring-teal-300 dark:border-teal-800"
            : "bg-slate-100 text-[11px] text-slate-600 ring-slate-300 dark:border-slate-700"
        }
      >
        {row.original.isDefault ? "Default" : "Not default"}
      </Badge>
    ),
  },
  {
    accessorKey: "billingEmail",
    header: "Billing email",
    meta: { label: "Billing email" },
    cell: ({ row }) => row.original.billingEmail ?? "Not provided",
  },
];
