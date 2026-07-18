"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatPayrollCurrency,
  formatPayrollHours,
  getInitials,
} from "@/features/payroll/lib/payroll-formatters";
import type { AppRouter } from "@/trpc/routers/_app";

export type PayrollInstructorRow =
  inferRouterOutputs<AppRouter>["payroll"]["calculatePayroll"]["instructors"][number];

export const PAYROLL_INSTRUCTOR_COLUMN_ORDER = [
  "instructor",
  "entries",
  "regularHours",
  "overtimeHours",
  "totalHours",
  "grossPay",
  "netPay",
];

export const payrollInstructorColumns: ColumnDef<PayrollInstructorRow>[] = [
  {
    id: "instructor",
    accessorFn: (row) => `${row.instructorName} ${row.instructorEmail ?? ""}`,
    header: "Team member",
    meta: { label: "Team member" },
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-8 rounded-full bg-slate-100">
          <AvatarImage
            src={row.original.instructorProfilePhoto ?? undefined}
            alt=""
          />
          <AvatarFallback className="rounded-full border border-slate-200 bg-slate-100 text-[9px] font-medium text-slate-800">
            {getInitials(row.original.instructorName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-primary">
            {row.original.instructorName}
          </p>
          <p className="truncate text-[10px] text-primary/45">
            {row.original.instructorEmail || "No email"}
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "entries",
    accessorKey: "timeLogCount",
    header: "Approved entries",
    meta: { label: "Approved entries" },
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-primary/70">
        {new Intl.NumberFormat("en-GB").format(row.original.timeLogCount)}
      </span>
    ),
  },
  {
    id: "regularHours",
    accessorKey: "regularHours",
    header: "Regular hours",
    meta: { label: "Regular hours" },
    cell: ({ row }) => (
      <div className="text-xs tabular-nums">
        <p className="font-medium">
          {formatPayrollHours(row.original.regularHours)}
        </p>
        <p className="text-[10px] text-primary/45">
          {formatPayrollCurrency(
            row.original.regularPay,
            row.original.currency,
          )}
        </p>
      </div>
    ),
  },
  {
    id: "overtimeHours",
    accessorKey: "overtimeHours",
    header: "Overtime",
    meta: { label: "Overtime" },
    cell: ({ row }) => (
      <div className="text-xs tabular-nums">
        <p className="font-medium">
          {formatPayrollHours(row.original.overtimeHours)}
        </p>
        <p className="text-[10px] text-primary/45">
          {formatPayrollCurrency(
            row.original.overtimePay,
            row.original.currency,
          )}
        </p>
      </div>
    ),
  },
  {
    id: "totalHours",
    accessorFn: (row) => row.regularHours + row.overtimeHours,
    header: "Total hours",
    meta: { label: "Total hours" },
    cell: ({ row }) => (
      <span className="text-xs font-medium tabular-nums">
        {formatPayrollHours(
          row.original.regularHours + row.original.overtimeHours,
        )}
      </span>
    ),
  },
  {
    id: "grossPay",
    accessorKey: "grossPay",
    header: "Gross pay",
    meta: { label: "Gross pay" },
    cell: ({ row }) => (
      <span className="text-xs font-medium tabular-nums">
        {formatPayrollCurrency(row.original.grossPay, row.original.currency)}
      </span>
    ),
  },
  {
    id: "netPay",
    accessorKey: "netPay",
    header: "Estimated net pay",
    meta: { label: "Estimated net pay" },
    cell: ({ row }) => (
      <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
        {formatPayrollCurrency(row.original.netPay, row.original.currency)}
      </span>
    ),
  },
];
