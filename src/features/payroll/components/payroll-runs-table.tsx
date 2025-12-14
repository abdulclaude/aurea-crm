"use client";

import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  CheckCircle,
  Eye,
  MoreHorizontal,
  PlayCircle,
  ThumbsUp,
  Trash2,
  Download,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type PayrollRunRow = RouterOutput["payroll"]["list"]["payrollRuns"][number];

const SORTABLE_COLUMNS = new Set(["periodStart", "paymentDate", "totalNetPay", "status"]);
const PAYROLL_DEFAULT_SORT = "periodStart.desc";

const sortValueToState = (value?: string): SortingState => {
  const sort = value || PAYROLL_DEFAULT_SORT;
  const [column, direction] = sort.split(".");
  if (!SORTABLE_COLUMNS.has(column)) {
    return [];
  }
  return [
    {
      id: column,
      desc: direction === "desc",
    },
  ];
};

function formatCurrency(amount: number | string): string {
  return `£${Number(amount).toFixed(2)}`;
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
    case "FAILED":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "CANCELLED":
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

interface PayrollActionsProps {
  row: PayrollRunRow;
  onApprove: (id: string) => void;
  onProcess: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

function PayrollActions({
  row,
  onApprove,
  onProcess,
  onMarkPaid,
  onDelete,
  isLoading,
}: PayrollActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isLoading}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(row.id);
            toast.success("Payroll run ID copied to clipboard");
          }}
        >
          <Eye className="size-4 mr-2" />
          View details
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {row.status === "DRAFT" && (
          <DropdownMenuItem onClick={() => onApprove(row.id)}>
            <ThumbsUp className="size-4 mr-2" />
            Approve
          </DropdownMenuItem>
        )}

        {row.status === "APPROVED" && (
          <DropdownMenuItem onClick={() => onProcess(row.id)}>
            <PlayCircle className="size-4 mr-2" />
            Process payments
          </DropdownMenuItem>
        )}

        {row.status === "PROCESSING" && (
          <DropdownMenuItem onClick={() => onMarkPaid(row.id)}>
            <CheckCircle className="size-4 mr-2" />
            Mark all as paid
          </DropdownMenuItem>
        )}

        {row.status === "DRAFT" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(row.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PayrollRunsTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = React.useState<SortingState>(sortValueToState());
  const [rowSelection, setRowSelection] = React.useState({});

  const { data } = useSuspenseQuery(
    trpc.payroll.list.queryOptions({ limit: 50 })
  );

  const approveMutation = useMutation(
    trpc.payroll.approve.mutationOptions({
      onSuccess: () => {
        toast.success("Payroll run approved");
        queryClient.invalidateQueries({ queryKey: [["payroll", "list"]] });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to approve payroll");
      },
    })
  );

  const processMutation = useMutation(
    trpc.payroll.processPayments.mutationOptions({
      onSuccess: () => {
        toast.success("Payments are being processed");
        queryClient.invalidateQueries({ queryKey: [["payroll", "list"]] });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to process payments");
      },
    })
  );

  const markPaidMutation = useMutation(
    trpc.payroll.bulkMarkCompleted.mutationOptions({
      onSuccess: () => {
        toast.success("All payments marked as completed");
        queryClient.invalidateQueries({ queryKey: [["payroll", "list"]] });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to mark payments as completed");
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.payroll.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Payroll run deleted");
        queryClient.invalidateQueries({ queryKey: [["payroll", "list"]] });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete payroll run");
      },
    })
  );

  // Bulk approve mutation - calls approve mutation sequentially for each ID
  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Approve each payroll run sequentially
      const results = [];
      for (const id of ids) {
        const result = await approveMutation.mutateAsync({ id });
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      toast.success("Payroll runs approved successfully");
      queryClient.invalidateQueries({ queryKey: [["payroll", "list"]] });
      setRowSelection({});
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to approve payroll runs");
    },
  });

  // Get selected draft payroll runs
  const selectedRowIds = Object.keys(rowSelection);
  const selectedRuns = (data?.payrollRuns || []).filter((run) =>
    selectedRowIds.includes(run.id)
  );
  const selectedDraftRuns = selectedRuns.filter((run) => run.status === "DRAFT");

  const handleBulkApprove = () => {
    if (selectedDraftRuns.length === 0) {
      toast.error("No draft payroll runs selected");
      return;
    }
    bulkApproveMutation.mutate(selectedDraftRuns.map((run) => run.id));
  };

  const columns: ColumnDef<PayrollRunRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "period",
      accessorKey: "periodStart",
      header: "Pay Period",
      meta: { label: "Pay Period" },
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium">
            {format(new Date(row.original.periodStart), "MMM d")} -{" "}
            {format(new Date(row.original.periodEnd), "MMM d, yyyy")}
          </p>
          <p className="text-primary/60">
            Payment: {format(new Date(row.original.paymentDate), "MMM d, yyyy")}
          </p>
        </div>
      ),
      enableSorting: true,
    },
    {
      id: "workers",
      header: "Workers",
      meta: { label: "Workers" },
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium">{row.original._count.payrollRunWorkers} workers</p>
          <p className="text-primary/60">{row.original._count.workerPayments} payments</p>
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "grossPay",
      accessorKey: "totalGrossPay",
      header: "Gross Pay",
      meta: { label: "Gross Pay" },
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium">{formatCurrency(row.original.totalGrossPay)}</p>
        </div>
      ),
      enableSorting: true,
    },
    {
      id: "deductions",
      accessorKey: "totalDeductions",
      header: "Deductions",
      meta: { label: "Deductions" },
      cell: ({ row }) => (
        <div className="text-xs text-red-500">
          {formatCurrency(row.original.totalDeductions)}
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "netPay",
      accessorKey: "totalNetPay",
      header: "Net Pay",
      meta: { label: "Net Pay" },
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-semibold text-green-500">
            {formatCurrency(row.original.totalNetPay)}
          </p>
        </div>
      ),
      enableSorting: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("text-xs", getStatusColor(row.original.status))}>
          {row.original.status.replace("_", " ")}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PayrollActions
          row={row.original}
          onApprove={(id) => approveMutation.mutate({ id })}
          onProcess={(id) => processMutation.mutate({ id })}
          onMarkPaid={(id) => markPaidMutation.mutate({ payrollRunId: id })}
          onDelete={(id) => deleteMutation.mutate({ id })}
          isLoading={
            approveMutation.isPending ||
            processMutation.isPending ||
            markPaidMutation.isPending ||
            deleteMutation.isPending
          }
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  return (
    <div className="space-y-4">
      {Object.keys(rowSelection).length > 0 && selectedDraftRuns.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg px-4 py-3">
          <div className="text-xs text-blue-600 dark:text-blue-400">
            <strong>({selectedDraftRuns.length})</strong> draft payroll run{selectedDraftRuns.length === 1 ? "" : "s"} selected
          </div>
          <Button
            onClick={handleBulkApprove}
            disabled={bulkApproveMutation.isPending}
            size="sm"
            variant="default"
          >
            <ThumbsUp className="size-4 mr-2" />
            Approve selected
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.payrollRuns || []}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        sorting={sorting}
        onSortingChange={setSorting}
        getRowId={(row) => row.id}
        emptyState={
          <div className="text-center py-12">
            <div className="mx-auto size-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <CheckCircle className="size-6 text-primary/40" />
            </div>
            <h3 className="text-sm font-medium text-primary mb-1">No payroll runs</h3>
            <p className="text-xs text-primary/60">
              Create your first payroll run to track worker payments
            </p>
          </div>
        }
      />
    </div>
  );
}
