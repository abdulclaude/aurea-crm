"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  Trash,
  Play,
  Pause,
  CheckCircle,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
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
import { RecurringInvoiceStatus, RecurringFrequency } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
type RecurringInvoiceRow =
  RouterOutput["recurringInvoices"]["list"]["recurringInvoices"][number];

const getStatusBadge = (status: RecurringInvoiceStatus) => {
  const variants: Record<
    RecurringInvoiceStatus,
    { label: string; className: string }
  > = {
    ACTIVE: {
      label: "Active",
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
    PAUSED: {
      label: "Paused",
      className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    },
    COMPLETED: {
      label: "Completed",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-red-500/10 text-red-500 border-red-500/20",
    },
  };

  const variant = variants[status];
  return (
    <Badge className={cn("font-medium border", variant.className)}>
      {variant.label}
    </Badge>
  );
};

const getFrequencyLabel = (
  frequency: RecurringFrequency,
  interval: number
): string => {
  const labels: Record<RecurringFrequency, string> = {
    DAILY: interval > 1 ? `Every ${interval} days` : "Daily",
    WEEKLY: interval > 1 ? `Every ${interval} weeks` : "Weekly",
    BIWEEKLY: interval > 1 ? `Every ${interval} bi-weeks` : "Bi-weekly",
    MONTHLY: interval > 1 ? `Every ${interval} months` : "Monthly",
    QUARTERLY: interval > 1 ? `Every ${interval} quarters` : "Quarterly",
    SEMIANNUALLY:
      interval > 1 ? `Every ${interval} half-years` : "Semi-annually",
    ANNUALLY: interval > 1 ? `Every ${interval} years` : "Annually",
  };

  return labels[frequency];
};

interface RecurringInvoicesTableProps {
  onEdit?: (id: string) => void;
}

export function RecurringInvoicesTable({
  onEdit,
}: RecurringInvoicesTableProps) {
  const trpc = useTRPC();
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault("")
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );

  const { data, refetch } = useSuspenseQuery(
    trpc.recurringInvoices.list.queryOptions({
      status: status
        ? (status as RecurringInvoiceStatus)
        : undefined,
      search: search || undefined,
    })
  );

  const { mutate: updateStatus } = useMutation(
    trpc.recurringInvoices.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Status updated successfully");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update status");
      },
    })
  );

  const { mutate: deleteRecurringInvoice } = useMutation(
    trpc.recurringInvoices.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Recurring invoice deleted");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete recurring invoice");
      },
    })
  );

  const columns: ColumnDef<RecurringInvoiceRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-primary dark:text-white">
            {row.original.name}
          </span>
          {row.original.description && (
            <span className="text-xs text-muted-foreground">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "contactName",
      header: "Client",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm text-primary dark:text-white">
            {row.original.contactName}
          </span>
          {row.original.contactEmail && (
            <span className="text-xs text-muted-foreground">
              {row.original.contactEmail}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => (
        <span className="text-sm text-primary dark:text-white">
          {getFrequencyLabel(row.original.frequency, row.original.interval)}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium text-primary dark:text-white">
          {row.original.currency} {row.original.total.toString()}
        </span>
      ),
    },
    {
      accessorKey: "nextRunDate",
      header: "Next Invoice",
      cell: ({ row }) => (
        <span className="text-sm text-primary dark:text-white">
          {format(new Date(row.original.nextRunDate), "MMM dd, yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "invoicesGenerated",
      header: "Generated",
      cell: ({ row }) => (
        <span className="text-sm text-primary dark:text-white">
          {row.original.invoicesGenerated}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const recurringInvoice = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit?.(recurringInvoice.id)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>

              {recurringInvoice.status === RecurringInvoiceStatus.ACTIVE && (
                <DropdownMenuItem
                  onClick={() =>
                    updateStatus({
                      id: recurringInvoice.id,
                      status: RecurringInvoiceStatus.PAUSED,
                    })
                  }
                >
                  <Pause className="mr-2 size-4" />
                  Pause
                </DropdownMenuItem>
              )}

              {recurringInvoice.status === RecurringInvoiceStatus.PAUSED && (
                <DropdownMenuItem
                  onClick={() =>
                    updateStatus({
                      id: recurringInvoice.id,
                      status: RecurringInvoiceStatus.ACTIVE,
                    })
                  }
                >
                  <Play className="mr-2 size-4" />
                  Resume
                </DropdownMenuItem>
              )}

              {(recurringInvoice.status === RecurringInvoiceStatus.ACTIVE ||
                recurringInvoice.status === RecurringInvoiceStatus.PAUSED) && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      updateStatus({
                        id: recurringInvoice.id,
                        status: RecurringInvoiceStatus.COMPLETED,
                      })
                    }
                  >
                    <CheckCircle className="mr-2 size-4" />
                    Mark Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      updateStatus({
                        id: recurringInvoice.id,
                        status: RecurringInvoiceStatus.CANCELLED,
                      })
                    }
                  >
                    <XCircle className="mr-2 size-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  deleteRecurringInvoice({ id: recurringInvoice.id })
                }
                className="text-red-600 dark:text-red-400"
              >
                <Trash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  return (
    <DataTable
      columns={columns}
      data={data.recurringInvoices}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      sorting={sorting}
      onSortingChange={setSorting}
    />
  );
}
