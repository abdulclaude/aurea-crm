"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Download, FileText, ArrowLeft } from "lucide-react";
import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { PayslipDialog } from "./payslip-dialog";

interface PayrollRunDetailsProps {
  payrollRunId: string;
  onBack?: () => void;
}

function formatCurrency(amount: number | string | { toNumber?: () => number }): string {
  // Handle Prisma Decimal type
  if (typeof amount === 'object' && amount !== null && 'toNumber' in amount && typeof amount.toNumber === 'function') {
    return `£${amount.toNumber().toFixed(2)}`;
  }
  return `£${Number(amount).toFixed(2)}`;
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "PROCESSING":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "APPROVED":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "PENDING_APPROVAL":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "DRAFT":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

export function PayrollRunDetails({ payrollRunId, onBack }: PayrollRunDetailsProps) {
  const trpc = useTRPC();
  const [selectedWorker, setSelectedWorker] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: payrollRun } = useSuspenseQuery(
    trpc.payroll.getById.queryOptions({ id: payrollRunId })
  );

  if (!payrollRun) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-primary/60">Payroll run not found</p>
      </div>
    );
  }

  const columns: ColumnDef<typeof payrollRun.payrollRunWorkers[number]>[] = [
    {
      id: "worker",
      accessorKey: "worker.name",
      header: "Worker",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-xs">{row.original.worker.name}</p>
          <p className="text-xs text-primary/60">{row.original.worker.email || "No email"}</p>
        </div>
      ),
    },
    {
      id: "hours",
      header: "Hours",
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium">
            {formatHours(Number(row.original.regularHours) + Number(row.original.overtimeHours))}
          </p>
          <p className="text-primary/60">
            {formatHours(Number(row.original.regularHours))} reg
            {Number(row.original.overtimeHours) > 0 && ` + ${formatHours(Number(row.original.overtimeHours))} OT`}
          </p>
        </div>
      ),
    },
    {
      id: "grossPay",
      accessorKey: "grossPay",
      header: "Gross Pay",
      cell: ({ row }) => (
        <p className="text-xs font-medium">{formatCurrency(row.original.grossPay)}</p>
      ),
    },
    {
      id: "deductions",
      accessorKey: "deductions",
      header: "Deductions",
      cell: ({ row }) => (
        <p className="text-xs text-red-500">{formatCurrency(row.original.deductions)}</p>
      ),
    },
    {
      id: "netPay",
      accessorKey: "netPay",
      header: "Net Pay",
      cell: ({ row }) => (
        <p className="text-xs font-bold text-green-600">{formatCurrency(row.original.netPay)}</p>
      ),
    },
    {
      id: "actions",
      header: "Payslip",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() =>
            setSelectedWorker({
              id: row.original.workerId,
              name: row.original.worker.name,
            })
          }
        >
          <FileText className="size-3.5 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-primary">Payroll Run Details</h2>
              <p className="text-xs text-primary/75 mt-1">
                {format(new Date(payrollRun.periodStart), "MMM d")} -{" "}
                {format(new Date(payrollRun.periodEnd), "MMM d, yyyy")}
              </p>
            </div>
            <Badge variant="outline" className={cn("ml-3", getStatusColor(payrollRun.status))}>
              {payrollRun.status.replace("_", " ")}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-primary/60">Total Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payrollRun._count.payrollRunWorkers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-primary/60">Gross Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {formatCurrency(payrollRun.totalGrossPay)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-primary/60">Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(payrollRun.totalDeductions)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-primary/60">Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(payrollRun.totalNetPay)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workers Table */}
        <div>
          <h3 className="text-sm font-medium mb-3">Workers</h3>
          <DataTable
            columns={columns}
            data={payrollRun.payrollRunWorkers}
            emptyState={
              <div className="text-center py-12">
                <FileText className="size-12 mx-auto text-primary/20 mb-4" />
                <h3 className="text-sm font-medium text-primary mb-1">No workers</h3>
                <p className="text-xs text-primary/60">
                  No workers found in this payroll run
                </p>
              </div>
            }
          />
        </div>
      </div>

      {/* Payslip Dialog */}
      {selectedWorker && (
        <PayslipDialog
          open={!!selectedWorker}
          onOpenChange={(open) => !open && setSelectedWorker(null)}
          payrollRunId={payrollRunId}
          workerId={selectedWorker.id}
          workerName={selectedWorker.name}
        />
      )}
    </>
  );
}
