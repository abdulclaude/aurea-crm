"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import {
  formatPayrollCurrency,
  getInitials,
} from "@/features/payroll/lib/payroll-formatters";

import {
  PayrollRunActions,
  type PayrollRunHandlers,
  type PayrollRunRow,
} from "./payroll-run-actions";

export const PAYROLL_RUN_COLUMN_ORDER = [
  "select",
  "periodStart",
  "paymentDate",
  "teamMembers",
  "totalGrossPay",
  "totalDeductions",
  "totalNetPay",
  "status",
  "actions",
];

const STATUS_COLORS = {
  APPROVED: TABLE_BADGE_COLORS.emerald,
  CANCELLED: TABLE_BADGE_COLORS.slate,
  COMPLETED: TABLE_BADGE_COLORS.teal,
  DRAFT: TABLE_BADGE_COLORS.amber,
  FAILED: TABLE_BADGE_COLORS.rose,
  PENDING_APPROVAL: TABLE_BADGE_COLORS.orange,
  PROCESSING: TABLE_BADGE_COLORS.blue,
} as const;

export function getPayrollRunColumns({
  canManage,
  handlers,
  isLoading,
}: {
  canManage: boolean;
  handlers: PayrollRunHandlers;
  isLoading: boolean;
}): ColumnDef<PayrollRunRow>[] {
  const columns: ColumnDef<PayrollRunRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(Boolean(value))
          }
          aria-label="Select all payroll runs"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select payroll run ending ${format(new Date(row.original.periodEnd), "d MMM yyyy")}`}
        />
      ),
      enableHiding: false,
    },
    {
      id: "periodStart",
      accessorKey: "periodStart",
      header: "Pay period",
      meta: { label: "Pay period" },
      enableHiding: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs font-medium">
          {format(new Date(row.original.periodStart), "d MMM")} -{" "}
          {format(new Date(row.original.periodEnd), "d MMM yyyy")}
        </span>
      ),
    },
    {
      id: "paymentDate",
      accessorKey: "paymentDate",
      header: "Payment date",
      meta: { label: "Payment date" },
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-primary/70">
          {format(new Date(row.original.paymentDate), "d MMM yyyy")}
        </span>
      ),
    },
    {
      id: "teamMembers",
      accessorFn: (row) =>
        row.payrollRunInstructors.map((item) => item.instructor.name).join(" "),
      header: "Team members",
      meta: { label: "Team members" },
      cell: ({ row }) => (
        <div className="flex min-w-48 items-center gap-3">
          <div className="flex -space-x-2">
            {row.original.payrollRunInstructors
              .slice(0, 4)
              .map(({ instructor }, index) => (
                <Avatar
                  key={instructor.id}
                  className="size-8 rounded-full bg-slate-100"
                  style={{ zIndex: 4 - index }}
                >
                  <AvatarImage
                    src={instructor.profilePhoto ?? undefined}
                    alt={instructor.name}
                  />
                  <AvatarFallback className="rounded-full border border-slate-200 bg-slate-100 text-[9px] font-medium text-slate-800">
                    {getInitials(instructor.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
          </div>
          <div className="text-xs">
            <p className="font-medium tabular-nums">
              {row.original._count.payrollRunInstructors}
            </p>
            <p className="text-[10px] text-primary/45">
              {row.original._count.instructorPayments} payments
            </p>
          </div>
        </div>
      ),
    },
    ...(["totalGrossPay", "totalDeductions", "totalNetPay"] as const).map(
      (id): ColumnDef<PayrollRunRow> => ({
        id,
        accessorKey: id,
        header:
          id === "totalGrossPay"
            ? "Gross pay"
            : id === "totalDeductions"
              ? "Deductions"
              : "Net pay",
        meta: {
          label:
            id === "totalGrossPay"
              ? "Gross pay"
              : id === "totalDeductions"
                ? "Deductions"
                : "Net pay",
        },
        cell: ({ row }) => (
          <span className="text-xs font-medium tabular-nums">
            {formatPayrollCurrency(row.original[id], row.original.currency)}
          </span>
        ),
      }),
    ),
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => (
        <TableBadge color={STATUS_COLORS[row.original.status]}>
          {row.original.status.replaceAll("_", " ")}
        </TableBadge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <PayrollRunActions
          row={row.original}
          handlers={handlers}
          isLoading={isLoading}
        />
      ),
    },
  ];

  return columns
    .map((column): ColumnDef<PayrollRunRow> => {
      if (column.id === "select" || column.id === "actions") {
        return { ...column, enableHiding: false, enableSorting: false };
      }
      return column;
    })
    .filter(
      (column) =>
        canManage || (column.id !== "select" && column.id !== "actions"),
    );
}
