"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format, formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  Eye,
  Send,
  DollarSign,
  FileText,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { InvoiceStatus } from "@/db/enums";
import { InvoiceDetailDialog } from "./invoice-detail-dialog";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { SendReminderDialog } from "./send-reminder-dialog";
import { InlineDocumentUpload } from "./inline-document-upload";

import { IconCreditCard2 as RecordPaymentIcon } from "central-icons/IconCreditCard2";

type RouterOutput = inferRouterOutputs<AppRouter>;
type InvoiceRow = RouterOutput["invoices"]["list"]["invoices"][number];

const SORTABLE_COLUMNS = new Set(["issueDate", "dueDate", "total"]);
const DEFAULT_SORT = "issueDate.desc";

const sortValueToState = (value?: string): SortingState => {
  const sort = value || DEFAULT_SORT;
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

const sortingStateToValue = (state: SortingState): string | null => {
  const primary = state[0];
  if (!primary || !SORTABLE_COLUMNS.has(primary.id)) {
    return null;
  }
  return `${primary.id}.${primary.desc ? "desc" : "asc"}`;
};

const formatCurrency = (amount: string, currency: string = "USD") => {
  const numAmount = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
};

const createInvoiceColumns = (
  onViewDetails: (invoice: InvoiceRow) => void,
  onEdit: (invoice: InvoiceRow) => void,
  onSendInvoice: (invoice: InvoiceRow) => void,
  onSendReminder: (invoice: InvoiceRow) => void,
  onRecordPayment: (invoice: InvoiceRow) => void,
  onDelete: (invoice: InvoiceRow) => void,
): ColumnDef<InvoiceRow>[] => [
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
    id: "invoiceNumber",
    accessorKey: "invoiceNumber",
    header: "Invoice #",
    meta: { label: "Invoice Number" },
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => {
      const invoice = row.original;
      return (
        <div className="min-w-0 flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-primary dark:text-white">
                {invoice.invoiceNumber}
              </p>
              {invoice.documentUrl && (
                <span title="Has attached document">
                  <FileText className="size-3 text-muted-foreground" />
                </span>
              )}
            </div>
            {invoice.title && (
              <p className="text-[11px] text-primary/60 dark:text-white/50 truncate">
                {invoice.title}
              </p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "clientName",
    accessorKey: "clientName",
    header: "Client",
    meta: { label: "Client" },
    enableSorting: false,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="text-xs text-primary dark:text-white/80">
          {row.original.clientName}
        </p>
        {row.original.clientEmail && (
          <p className="text-[11px] text-primary/60 dark:text-white/50 truncate">
            {row.original.clientEmail}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    enableSorting: false,
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  },
  {
    id: "issueDate",
    accessorKey: "issueDate",
    header: "Issue date",
    meta: { label: "Issue date" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary dark:text-white/80">
        {format(new Date(row.original.issueDate), "MMM dd, yyyy")}
      </span>
    ),
  },
  {
    id: "dueDate",
    accessorKey: "dueDate",
    header: "Due date",
    meta: { label: "Due date" },
    enableSorting: true,
    cell: ({ row }) => {
      const dueDate = new Date(row.original.dueDate);
      const isOverdue =
        dueDate < new Date() && row.original.status !== InvoiceStatus.PAID;
      return (
        <span
          className={cn(
            "text-xs",
            isOverdue
              ? "text-red-500 font-medium"
              : "text-primary dark:text-white/80",
          )}
        >
          {format(dueDate, "MMM dd, yyyy")}
        </span>
      );
    },
  },
  {
    id: "total",
    accessorKey: "total",
    header: "Total",
    meta: { label: "Total" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs font-medium text-primary dark:text-white">
        {formatCurrency(row.original.total, row.original.currency)}
      </span>
    ),
  },
  {
    id: "amountPaid",
    accessorKey: "amountPaid",
    header: "Amount paid",
    meta: { label: "Amount Paid" },
    enableSorting: false,
    cell: ({ row }) => {
      const amountPaid = parseFloat(row.original.amountPaid);
      return (
        <span
          className={cn(
            "text-xs font-medium",
            amountPaid > 0
              ? "text-green-500"
              : "text-primary/60 dark:text-white/60",
          )}
        >
          {formatCurrency(row.original.amountPaid, row.original.currency)}
        </span>
      );
    },
  },
  {
    id: "amountDue",
    accessorKey: "amountDue",
    header: "Amount due",
    meta: { label: "Amount Due" },
    enableSorting: false,
    cell: ({ row }) => {
      const amountDue = parseFloat(row.original.amountDue);
      return (
        <span
          className={cn(
            "text-xs font-medium",
            amountDue > 0 ? "text-orange-500" : "text-green-500",
          )}
        >
          {formatCurrency(row.original.amountDue, row.original.currency)}
        </span>
      );
    },
  },
  {
    id: "document",
    accessorKey: "documentUrl",
    header: "Document",
    meta: { label: "Document" },
    enableSorting: false,
    cell: ({ row }) => {
      const invoice = row.original;
      return (
        <div onClick={(e) => e.stopPropagation()} className="w-full mr-auto">
          <InlineDocumentUpload
            invoiceId={invoice.id}
            documentUrl={invoice.documentUrl}
            documentName={invoice.documentName}
          />
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    enableHiding: false,
    cell: ({ row }) => {
      const invoice = row.original;
      const canSendReminder =
        invoice.status === InvoiceStatus.SENT ||
        invoice.status === InvoiceStatus.VIEWED ||
        invoice.status === InvoiceStatus.PARTIALLY_PAID ||
        invoice.status === InvoiceStatus.OVERDUE;
      const canRecordPayment =
        invoice.status !== InvoiceStatus.PAID &&
        invoice.status !== InvoiceStatus.CANCELLED;
      const canCancel =
        invoice.status !== InvoiceStatus.PAID &&
        invoice.status !== InvoiceStatus.CANCELLED;
      const hasPaymentAction =
        invoice.status === InvoiceStatus.DRAFT ||
        canSendReminder ||
        canRecordPayment;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="ghost" size="icon" className="size-8">
              <span className="sr-only">Open invoice actions</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48"
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(invoice);
              }}
              className="cursor-pointer text-xs"
            >
              <Eye className="size-3.5" />
              View details
            </DropdownMenuItem>

            {invoice.documentUrl && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(invoice.documentUrl!, "_blank");
                }}
                className="cursor-pointer text-xs"
              >
                <FileText className="size-3.5" />
                View document
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(invoice);
              }}
              className="cursor-pointer text-xs"
            >
              <Pencil className="size-3.5" />
              Edit invoice
            </DropdownMenuItem>
            {hasPaymentAction ? <DropdownMenuSeparator /> : null}
            {invoice.status === InvoiceStatus.DRAFT ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onSendInvoice(invoice);
                }}
                className="cursor-pointer text-xs"
              >
                <Send className="size-3.5" />
                Send invoice
              </DropdownMenuItem>
            ) : null}

            {canSendReminder ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendReminder(invoice);
                  }}
                  className="cursor-pointer text-xs"
                >
                  <Send className="size-3.5" />
                  Send reminder
                </DropdownMenuItem>
              ) : null}

            {canRecordPayment ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRecordPayment(invoice);
                }}
                className="cursor-pointer text-xs"
              >
                <RecordPaymentIcon className="size-3.5" />
                Record payment
              </DropdownMenuItem>
            ) : null}

            {canCancel ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-xs text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(invoice);
                  }}
                >
                  <XCircle className="size-3.5" />
                  Cancel invoice
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

interface InvoicesTableProps {
  entityType?: "agency" | "location";
  entityId?: string;
  onEdit?: (invoiceId: string) => void;
  invoiceType?: "SENT" | "RECEIVED";
}

export function InvoicesTable({
  entityType = "location",
  entityId,
  onEdit,
  invoiceType = "SENT",
}: InvoicesTableProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [hydrated, setHydrated] = React.useState(false);

  // URL state management
  const [search, setSearch] = useQueryState("search", parseAsString);
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [sortState, setSortState] = useQueryState(
    "sort",
    parseAsString.withDefault(DEFAULT_SORT),
  );

  const [sorting, setSorting] = React.useState<SortingState>(
    sortValueToState(sortState),
  );

  // Dialog state
  const [selectedInvoice, setSelectedInvoice] =
    React.useState<InvoiceRow | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = React.useState(false);
  const [editInvoiceId, setEditInvoiceId] = React.useState<string | null>(null);
  const [cancelInvoice, setCancelInvoice] = React.useState<InvoiceRow | null>(
    null,
  );

  // Sync sorting state with URL
  const handleSortingChange = (updater: Updater<SortingState>) => {
    const newSorting =
      typeof updater === "function" ? updater(sorting) : updater;
    setSorting(newSorting);
    const sortValue = sortingStateToValue(newSorting);
    if (sortValue) {
      setSortState(sortValue);
    }
  };

  // Parse sort from URL
  const [sortBy, sortOrder] = sortState.split(".") as [
    "issueDate" | "dueDate" | "total",
    "asc" | "desc",
  ];

  React.useEffect(() => setHydrated(true), []);

  // Fetch invoices
  const invoicesQuery = useQuery({
    ...trpc.invoices.list.queryOptions({
      search: search ?? undefined,
      status: status !== "all" ? (status as InvoiceStatus) : undefined,
      type: invoiceType,
      sortBy,
      sortOrder,
    }),
    enabled: hydrated,
  });
  const data = invoicesQuery.data;

  // Column visibility
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // Column order
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);

  // Send invoice mutation
  const sendInvoiceMutation = useMutation(
    trpc.invoices.sendInvoice.mutationOptions(),
  );
  const cancelInvoiceMutation = useMutation(
    trpc.invoices.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Invoice cancelled");
        setCancelInvoice(null);
        queryClient.invalidateQueries({ queryKey: [["invoices", "list"]] });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  // Action handlers
  const handleViewDetails = (invoice: InvoiceRow) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  const handleEdit = (invoice: InvoiceRow) => {
    if (onEdit) {
      onEdit(invoice.id);
    } else {
      setEditInvoiceId(invoice.id);
    }
  };

  const handleSendInvoice = (invoice: InvoiceRow) => {
    const toastId = toast.loading(
      `Queueing invoice ${invoice.invoiceNumber}...`,
    );
    sendInvoiceMutation.mutate(
      { invoiceId: invoice.id },
      {
        onSuccess: (data) => {
          toast.dismiss(toastId);
          toast.success(`Invoice queued for ${data.sentTo}`);
          // Invalidate queries to refresh the list
          queryClient.invalidateQueries({ queryKey: [["invoices", "list"]] });
        },
        onError: (error) => {
          toast.dismiss(toastId);
          console.error("Failed to send invoice:", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to send invoice",
          );
        },
      },
    );
  };

  const handleSendReminder = (invoice: InvoiceRow) => {
    setSelectedInvoice(invoice);
    setReminderDialogOpen(true);
  };

  const handleRecordPayment = (invoice: InvoiceRow) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const handleDelete = (invoice: InvoiceRow) => {
    setCancelInvoice(invoice);
  };

  // Create columns with callbacks
  const invoiceColumns = React.useMemo(
    () =>
      createInvoiceColumns(
        handleViewDetails,
        handleEdit,
        handleSendInvoice,
        handleSendReminder,
        handleRecordPayment,
        handleDelete,
      ),
    [],
  );

  if (!hydrated || invoicesQuery.isPending) {
    return (
      <div
        role="status"
        aria-label="Loading invoices"
        className="h-64 animate-pulse bg-muted/40"
      />
    );
  }

  if (invoicesQuery.isError || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
        <p role="alert" className="text-sm font-medium">
          Invoices could not be loaded.
        </p>
        <p className="text-xs text-muted-foreground">
          {invoicesQuery.error instanceof Error
            ? invoicesQuery.error.message
            : "Try the request again."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void invoicesQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <DataTable
          columns={invoiceColumns}
          data={data.invoices}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          onRowClick={(row) => handleViewDetails(row)}
        />
      </div>

      {/* Invoice Detail Dialog */}
      {selectedInvoice && (
        <InvoiceDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          invoiceId={selectedInvoice.id}
          onEdit={(id) => {
            setDetailDialogOpen(false);
            if (onEdit) {
              onEdit(id);
            } else {
              setEditInvoiceId(id);
            }
          }}
        />
      )}

      {/* Record Payment Dialog */}
      {selectedInvoice && (
        <RecordPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          invoice={{
            id: selectedInvoice.id,
            invoiceNumber: selectedInvoice.invoiceNumber,
            amountDue: selectedInvoice.amountDue,
            currency: selectedInvoice.currency,
          }}
        />
      )}

      {/* Send Reminder Dialog */}
      {selectedInvoice && (
        <SendReminderDialog
          open={reminderDialogOpen}
          onOpenChange={setReminderDialogOpen}
          invoice={{
            id: selectedInvoice.id,
            invoiceNumber: selectedInvoice.invoiceNumber,
            clientName: selectedInvoice.clientName,
            clientEmail: selectedInvoice.clientEmail,
            amountDue: selectedInvoice.amountDue,
            currency: selectedInvoice.currency,
            dueDate: selectedInvoice.dueDate.toISOString(),
          }}
        />
      )}

      <AlertDialog
        open={cancelInvoice !== null}
        onOpenChange={(open) => {
          if (!open) setCancelInvoice(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelInvoice
                ? `Invoice ${cancelInvoice.invoiceNumber} will remain in the financial record but can no longer be paid.`
                : "The invoice will remain in the financial record."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invoice</AlertDialogCancel>
            <AlertDialogAction
              disabled={!cancelInvoice || cancelInvoiceMutation.isPending}
              onClick={() => {
                if (cancelInvoice) {
                  cancelInvoiceMutation.mutate({ id: cancelInvoice.id });
                }
              }}
            >
              Cancel invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
