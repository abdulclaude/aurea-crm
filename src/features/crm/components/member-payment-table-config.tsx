import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";

import type { AppRouter } from "@/trpc/routers/_app";
import type { LifecycleSummary } from "./member-lifecycle-types";
import { labelize } from "./member-lifecycle-types";
import { MemberStatusBadge } from "./member-status-badge";

export type Payment = LifecycleSummary["payments"][number];
export type Invoice =
  inferRouterOutputs<AppRouter>["invoices"]["list"]["invoices"][number];

export const paymentColumns: ColumnDef<Payment>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    meta: { label: "Date" },
    cell: ({ row }) => format(new Date(row.original.createdAt), "d MMM yyyy"),
  },
  {
    accessorKey: "description",
    header: "Description",
    meta: { label: "Description" },
    enableHiding: false,
    cell: ({ row }) => row.original.description ?? labelize(row.original.type),
  },
  {
    accessorKey: "paymentMethod",
    header: "Payment method",
    meta: { label: "Payment method" },
    cell: ({ row }) =>
      row.original.paymentMethod
        ? labelize(row.original.paymentMethod)
        : "Not recorded",
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    meta: { label: "Amount" },
    cell: ({ row }) =>
      formatCurrency(row.original.amount, row.original.currency),
  },
];

export const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "invoiceNumber",
    header: "Invoice",
    meta: { label: "Invoice" },
    enableHiding: false,
  },
  {
    accessorKey: "issueDate",
    header: "Issued",
    meta: { label: "Issued" },
    cell: ({ row }) => format(new Date(row.original.issueDate), "d MMM yyyy"),
  },
  {
    accessorKey: "dueDate",
    header: "Due",
    meta: { label: "Due" },
    cell: ({ row }) => format(new Date(row.original.dueDate), "d MMM yyyy"),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "total",
    header: "Total",
    meta: { label: "Total" },
    cell: ({ row }) => formatCurrency(row.original.total, row.original.currency),
  },
  {
    accessorKey: "amountDue",
    header: "Amount due",
    meta: { label: "Amount due" },
    cell: ({ row }) =>
      formatCurrency(row.original.amountDue, row.original.currency),
  },
];

function formatCurrency(amount: string | number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    Number(amount),
  );
}
