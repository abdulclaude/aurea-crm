"use client";

import {
  useSuspenseQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
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
  Trash,
  Send,
  DollarSign,
  FileText,
  Upload,
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
import { InvoiceStatus } from "@prisma/client";
import { InvoiceDetailDialog } from "./invoice-detail-dialog";
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

const getStatusBadge = (status: InvoiceStatus) => {
  const variants: Record<InvoiceStatus, { label: string; className: string }> =
    {
      DRAFT: {
        label: "Draft",
        className: "bg-gray-500/10 text-gray-500 ring-gray-500/20",
      },
      SENT: {
        label: "Sent",
        className: "bg-blue-500/10 text-blue-500 ring-blue-500/20",
      },
      VIEWED: {
        label: "Viewed",
        className: "bg-purple-500/10 text-purple-500 ring-purple-500/20",
      },
      PAID: {
        label: "Paid",
        className: "bg-green-500/10 text-green-500 ring-green-500/20",
      },
      PARTIALLY_PAID: {
        label: "Partial",
        className: "bg-yellow-500/10 text-yellow-500 ring-yellow-500/20",
      },
      OVERDUE: {
        label: "Overdue",
        className: "bg-red-500/10 text-red-500 ring-red-500/20",
      },
      CANCELLED: {
        label: "Cancelled",
        className: "bg-gray-500/10 text-gray-500 ring-gray-500/20",
      },
    };

  const variant = variants[status];

  return (
    <Badge variant="outline" className={cn("text-xs", variant.className)}>
      {variant.label}
    </Badge>
  );
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
  onDelete: (invoice: InvoiceRow) => void
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
    id: "contactName",
    accessorKey: "contactName",
    header: "Client",
    meta: { label: "Client" },
    enableSorting: false,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="text-xs text-primary dark:text-white/80">
          {row.original.contactName}
        </p>
        {row.original.contactEmail && (
          <p className="text-[11px] text-primary/60 dark:text-white/50 truncate">
            {row.original.contactEmail}
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
    cell: ({ row }) => getStatusBadge(row.original.status),
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
              : "text-primary dark:text-white/80"
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
              : "text-primary/60 dark:text-white/60"
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
            amountDue > 0 ? "text-orange-500" : "text-green-500"
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
            documentName={(invoice as any).documentName}
          />
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" className="size-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(invoice);
              }}
              className="text-xs"
            >
              <Eye className=" size-3" />
              View details
            </DropdownMenuItem>

            {invoice.documentUrl && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(invoice.documentUrl!, "_blank");
                }}
                className="text-xs"
              >
                <FileText className=" size-3" />
                View document
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(invoice);
              }}
              className="text-xs"
            >
              <Pencil className=" size-3" />
              Edit invoice
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {invoice.status === InvoiceStatus.DRAFT && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onSendInvoice(invoice);
                }}
                className="text-xs"
              >
                <Send className=" size-3" />
                Send invoice
              </DropdownMenuItem>
            )}

            {invoice.status !== InvoiceStatus.DRAFT &&
              invoice.status !== InvoiceStatus.PAID && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendReminder(invoice);
                  }}
                  className="text-xs"
                >
                  <Send className=" size-3" />
                  Send reminder
                </DropdownMenuItem>
              )}

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRecordPayment(invoice);
              }}
              className="text-xs"
            >
              <RecordPaymentIcon className="size-3" />
              Record payment
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-red-600 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(invoice);
              }}
            >
              <Trash className=" size-3" />
              Delete invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

interface InvoicesTableProps {
  entityType?: "agency" | "subaccount";
  entityId?: string;
  onEdit?: (invoiceId: string) => void;
  invoiceType?: "SENT" | "RECEIVED";
}

export function InvoicesTable({
  entityType = "subaccount",
  entityId,
  onEdit,
  invoiceType = "SENT",
}: InvoicesTableProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // URL state management
  const [search, setSearch] = useQueryState("search", parseAsString);
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault("all")
  );
  const [sortState, setSortState] = useQueryState(
    "sort",
    parseAsString.withDefault(DEFAULT_SORT)
  );

  const [sorting, setSorting] = React.useState<SortingState>(
    sortValueToState(sortState)
  );

  // Dialog state
  const [selectedInvoice, setSelectedInvoice] =
    React.useState<InvoiceRow | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = React.useState(false);
  const [editInvoiceId, setEditInvoiceId] = React.useState<string | null>(null);

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
    "asc" | "desc"
  ];

  // Fetch invoices
  const { data } = useSuspenseQuery(
    trpc.invoices.list.queryOptions({
      search: search ?? undefined,
      status: status !== "all" ? (status as InvoiceStatus) : undefined,
      type: invoiceType,
      sortBy,
      sortOrder,
    })
  );

  // Column visibility
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // Column order
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);

  // Send invoice mutation
  const sendInvoiceMutation = useMutation(
    trpc.invoices.sendInvoice.mutationOptions()
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
      `Sending invoice ${invoice.invoiceNumber}...`
    );
    sendInvoiceMutation.mutate(
      { invoiceId: invoice.id },
      {
        onSuccess: (data) => {
          toast.dismiss(toastId);
          toast.success(`Invoice sent to ${data.sentTo}!`);
          // Invalidate queries to refresh the list
          queryClient.invalidateQueries({ queryKey: [["invoices", "list"]] });
        },
        onError: (error) => {
          toast.dismiss(toastId);
          console.error("Failed to send invoice:", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to send invoice"
          );
        },
      }
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
    // TODO: Implement delete confirmation
    console.log("Delete invoice:", invoice.id);
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
        handleDelete
      ),
    []
  );

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
            contactName: selectedInvoice.contactName,
            contactEmail: selectedInvoice.contactEmail,
            amountDue: selectedInvoice.amountDue,
            currency: selectedInvoice.currency,
            dueDate: selectedInvoice.dueDate.toISOString(),
          }}
        />
      )}
    </>
  );
}
