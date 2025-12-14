"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { Download, FileText } from "lucide-react";
import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type PayrollWorkerRow = RouterOutput["payroll"]["calculatePayroll"]["workers"][number];

function formatCurrency(amount: number | { toNumber?: () => number }): string {
  // Handle Prisma Decimal type
  if (typeof amount === 'object' && amount !== null && 'toNumber' in amount && typeof amount.toNumber === 'function') {
    return `£${amount.toNumber().toFixed(2)}`;
  }
  return `£${Number(amount).toFixed(2)}`;
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

interface PayrollWorkersTableProps {
  workers: PayrollWorkerRow[];
  showPayslipActions?: boolean;
  onDownloadPayslip?: (workerId: string) => void;
  onEmailPayslip?: (workerId: string) => void;
}

export function PayrollWorkersTable({
  workers,
  showPayslipActions = false,
  onDownloadPayslip,
  onEmailPayslip,
}: PayrollWorkersTableProps) {
  const columns: ColumnDef<PayrollWorkerRow>[] = [
    {
      id: "worker",
      accessorKey: "workerName",
      header: "Worker",
      meta: { label: "Worker" },
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-xs">{row.original.workerName}</p>
          <p className="text-xs text-primary/60">
            {row.original.timeLogCount} {row.original.timeLogCount === 1 ? "entry" : "entries"}
          </p>
        </div>
      ),
      enableHiding: false,
    },
    {
      id: "regularHours",
      accessorKey: "regularHours",
      header: "Regular Hours",
      meta: { label: "Regular Hours" },
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium">{formatHours(row.original.regularHours)}</p>
          <p className="text-primary/60">{formatCurrency(row.original.regularPay)}</p>
        </div>
      ),
    },
    {
      id: "overtimeHours",
      accessorKey: "overtimeHours",
      header: "Overtime",
      meta: { label: "Overtime" },
      cell: ({ row }) => (
        <div className="text-xs">
          {row.original.overtimeHours > 0 ? (
            <>
              <p className="font-medium text-amber-500">{formatHours(row.original.overtimeHours)}</p>
              <p className="text-primary/60">{formatCurrency(row.original.overtimePay)}</p>
            </>
          ) : (
            <p className="text-primary/40">—</p>
          )}
        </div>
      ),
    },
    {
      id: "bonuses",
      header: "Bonuses",
      meta: { label: "Bonuses" },
      cell: ({ row }) => {
        const bonuses = (row.original as any).bonuses || 0;
        return (
          <div className="text-xs">
            {bonuses > 0 ? (
              <p className="font-medium text-green-500">{formatCurrency(bonuses)}</p>
            ) : (
              <p className="text-primary/40">—</p>
            )}
          </div>
        );
      },
    },
    {
      id: "grossPay",
      accessorKey: "grossPay",
      header: "Gross Pay",
      meta: { label: "Gross Pay" },
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-semibold">{formatCurrency(row.original.grossPay)}</p>
        </div>
      ),
    },
    {
      id: "deductions",
      header: "Deductions",
      meta: { label: "Deductions" },
      cell: ({ row }) => {
        const deductions = (row.original as any).deductions || 0;
        return (
          <div className="text-xs">
            {deductions > 0 ? (
              <p className="font-medium text-red-500">{formatCurrency(deductions)}</p>
            ) : (
              <p className="text-primary/40">—</p>
            )}
          </div>
        );
      },
    },
    {
      id: "netPay",
      accessorKey: "netPay",
      header: "Net Pay",
      meta: { label: "Net Pay" },
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-bold text-green-600">{formatCurrency(row.original.netPay)}</p>
        </div>
      ),
    },
  ];

  // Add payslip actions column if enabled
  if (showPayslipActions) {
    columns.push({
      id: "actions",
      header: "Payslip",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onDownloadPayslip?.(row.original.workerId)}
          >
            <Download className="size-3.5 mr-1" />
            <span className="text-xs">PDF</span>
          </Button>
        </div>
      ),
      enableSorting: false,
    });
  }

  return (
    <DataTable
      columns={columns}
      data={workers}
      emptyState={
        <div className="text-center py-12">
          <div className="mx-auto size-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
            <FileText className="size-6 text-primary/40" />
          </div>
          <h3 className="text-sm font-medium text-primary mb-1">No workers</h3>
          <p className="text-xs text-primary/60">
            No workers have approved time logs in this period
          </p>
        </div>
      }
    />
  );
}
