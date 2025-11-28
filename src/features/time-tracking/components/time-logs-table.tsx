"use client";

import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { Check, ChevronRightIcon, MoreHorizontal, X } from "lucide-react";
import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { TimeLogStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/trpc/routers/_app";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { useTimeLogsParams } from "../hooks/use-time-logs-params";
import { TimeLogsToolbar } from "./time-logs-toolbar";
import {
  useApproveTimeLog,
  useDeleteTimeLog,
} from "../hooks/use-time-tracking";

type RouterOutput = inferRouterOutputs<AppRouter>;
type TimeLogRow = RouterOutput["timeTracking"]["list"]["items"][number];

const SORTABLE_COLUMNS = new Set(["date", "duration", "totalAmount"]);
const TIME_LOGS_DEFAULT_SORT = "date.desc";

const sortValueToState = (value?: string): SortingState => {
  const sort = value || TIME_LOGS_DEFAULT_SORT;
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

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatCurrency(
  amount: number | null | undefined,
  currency?: string | null
): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "GBP",
  }).format(Number(amount));
}

function getStatusBadge(status: TimeLogStatus) {
  const config = {
    [TimeLogStatus.DRAFT]: {
      label: "Working",
      className:
        "bg-amber-500/10 text-amber-500 border-amber-500/20 text-[11px]",
    },
    [TimeLogStatus.SUBMITTED]: {
      label: "Submitted",
      className: "bg-sky-500/10 text-sky-500 border-sky-500/20 text-[11px]",
    },
    [TimeLogStatus.APPROVED]: {
      label: "Approved",
      className:
        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px]",
    },
    [TimeLogStatus.REJECTED]: {
      label: "Rejected",
      className: "bg-rose-500/10 text-rose-500 border-rose-500/20 text-[11px]",
    },
    [TimeLogStatus.INVOICED]: {
      label: "Invoiced",
      className:
        "bg-purple-500/10 text-purple-500 border-purple-500/20 text-[11px]",
    },
  };

  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={cn("text-xs", className)}>
      {label}
    </Badge>
  );
}

const PRIMARY_COLUMN_ID = "select";

export function TimeLogsTable() {
  const trpc = useTRPC();
  const [params, setParams] = useTimeLogsParams();
  const [rowSelection, setRowSelection] = React.useState({});

  const { mutate: approveTimeLog } = useApproveTimeLog();
  const { mutate: deleteTimeLog } = useDeleteTimeLog();

  const { data, isFetching, refetch } = useSuspenseQuery(
    trpc.timeTracking.list.queryOptions({
      search: params.search || undefined,
      workers:
        params.workers && params.workers.length > 0
          ? params.workers
          : undefined,
      deals: params.deals && params.deals.length > 0 ? params.deals : undefined,
      statuses:
        params.statuses && params.statuses.length > 0
          ? (params.statuses as TimeLogStatus[])
          : undefined,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      durationMin: params.durationMin ?? undefined,
      durationMax: params.durationMax ?? undefined,
      amountMin: params.amountMin ?? undefined,
      amountMax: params.amountMax ?? undefined,
    })
  );

  const handleApprove = React.useCallback(
    (id: string) => {
      approveTimeLog(
        { id, approved: true },
        {
          onSuccess: () => {
            refetch();
            toast.success("Time log approved successfully");
          },
          onError: (error: any) => {
            toast.error(error.message);
          },
        }
      );
    },
    [approveTimeLog, refetch]
  );

  const handleReject = React.useCallback(
    (id: string) => {
      approveTimeLog(
        { id, approved: false },
        {
          onSuccess: () => {
            refetch();
            toast.success("Time log rejected");
          },
          onError: (error: any) => {
            toast.error(error.message);
          },
        }
      );
    },
    [approveTimeLog, refetch]
  );

  const handleDelete = React.useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this time log?")) {
        deleteTimeLog(
          { id },
          {
            onSuccess: () => {
              refetch();
              toast.success("Time log deleted successfully");
            },
            onError: (error: any) => {
              toast.error(error.message);
            },
          }
        );
      }
    },
    [deleteTimeLog, refetch]
  );

  const timeLogColumns: ColumnDef<TimeLogRow>[] = [
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
      id: "worker",
      accessorFn: (row) => row.worker?.name || row.contact?.name || "—",
      header: "Worker",
      meta: { label: "Worker" },
      enableHiding: false,
      cell: ({ row }) => {
        const worker = row.original.worker;
        const contact = row.original.contact;
        const person = worker || contact;

        if (!person) {
          return <span className="text-xs text-primary/40">—</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarFallback className="bg-[#202e32] text-white brightness-120 text-[10px]">
                {(person.name?.[0] ?? "W").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium text-primary truncate">
                {person.name}
              </p>
              {worker?.role && (
                <p className="text-[11px] text-primary/60 truncate">
                  {worker.role}
                </p>
              )}
              {!worker && contact?.email && (
                <p className="text-[11px] text-primary/60 truncate">
                  {contact.email}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "title",
      accessorKey: "title",
      header: "Title",
      meta: { label: "Title" },
      cell: ({ row }) => (
        <span className="text-xs text-primary">
          {row.original.title || "—"}
        </span>
      ),
    },
    {
      id: "deal",
      accessorFn: (row) => row.deal?.name || "—",
      header: "Job/Deal",
      meta: { label: "Job" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/60">
          {row.original.deal?.name || "—"}
        </span>
      ),
    },
    {
      id: "date",
      accessorKey: "startTime",
      header: "Date",
      meta: { label: "Date" },
      cell: ({ row }) => (
        <span className="text-xs text-primary">
          {format(new Date(row.original.startTime), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "timePeriod",
      accessorKey: "startTime",
      header: "Time Period",
      meta: { label: "Time Period" },
      cell: ({ row }) => {
        const startTime = format(new Date(row.original.startTime), "h:mm a");

        if (!row.original.endTime) {
          return (
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary">{startTime}</span>
              <ChevronRightIcon className="size-3" />
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[11px]"
              >
                Working
              </Badge>
            </div>
          );
        }

        const endTime = format(new Date(row.original.endTime), "h:mm a");
        return (
          <div className="flex items-center gap-1">
            <span className="text-xs text-primary/50">{startTime}</span>/
            <span className="text-xs text-primary font-medium">{endTime}</span>
          </div>
        );
      },
    },
    {
      id: "duration",
      accessorKey: "duration",
      header: "Duration",
      meta: { label: "Duration" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs font-medium text-primary">
          {formatDuration(row.original.duration)}
        </span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "totalAmount",
      accessorKey: "totalAmount",
      header: "Amount",
      meta: { label: "Amount" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs font-medium text-primary">
          {formatCurrency(
            row.original.totalAmount ? Number(row.original.totalAmount) : null,
            row.original.currency
          )}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const timeLog = row.original;
        const canApprove = timeLog.status === TimeLogStatus.SUBMITTED;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="size-8 p-0 hover:bg-primary/5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-background border-black/5 dark:border-white/5"
            >
              <DropdownMenuLabel className="text-xs text-primary/80 dark:text-white/50">
                Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
              {canApprove && (
                <>
                  <DropdownMenuItem
                    className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(timeLog.id);
                    }}
                  >
                    <Check className="mr-0.5 size-3.5" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReject(timeLog.id);
                    }}
                  >
                    <X className="mr-0.5 size-3.5" />
                    Reject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
                </>
              )}
              <DropdownMenuItem
                className="text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(timeLog.id);
                }}
              >
                <X className="mr-0.5 size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    },
  ];

  const TIME_LOGS_COLUMN_IDS = timeLogColumns.map(
    (column, index) => (column.id ?? `column-${index}`) as string
  );
  const COLUMN_ORDER_STORAGE_KEY = "timesheet-table.column-order";

  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(TIME_LOGS_COLUMN_IDS);
  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns]
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);

  const persistColumnOrder = React.useCallback(
    (order: string[]) => {
      if (typeof window === "undefined") {
        return;
      }
      const next = normalizeColumnOrder(
        order,
        TIME_LOGS_COLUMN_IDS,
        PRIMARY_COLUMN_ID
      );
      if (shallowEqualArrays(next, TIME_LOGS_COLUMN_IDS)) {
        window.localStorage.removeItem(COLUMN_ORDER_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(
        COLUMN_ORDER_STORAGE_KEY,
        JSON.stringify(next)
      );
    },
    [TIME_LOGS_COLUMN_IDS]
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const next = normalizeColumnOrder(
          parsed,
          TIME_LOGS_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        setColumnOrder(next);
      }
    } catch {
      // ignore
    }
  }, [TIME_LOGS_COLUMN_IDS]);

  React.useEffect(() => {
    if (
      pendingHiddenRef.current &&
      shallowEqualArrays(pendingHiddenRef.current, hiddenColumns)
    ) {
      pendingHiddenRef.current = null;
      return;
    }
    setColumnVisibility(visibilityFromHidden(hiddenColumns));
  }, [hiddenColumns]);

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort]
  );

  const handleSortingChange = React.useCallback(
    (state: SortingState) => {
      const nextValue = sortingStateToValue(state) ?? TIME_LOGS_DEFAULT_SORT;
      setParams((prev) => ({ ...prev, sort: nextValue }));
    },
    [setParams]
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, sort: value }));
    },
    [setParams]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, search: value }));
    },
    [setParams]
  );

  const handleApplyAllFilters = React.useCallback(
    (filters: {
      workers: string[];
      deals: string[];
      statuses: string[];
      durationMin?: number;
      durationMax?: number;
      amountMin?: number;
      amountMax?: number;
    }) => {
      setParams((prev) => ({
        ...prev,
        workers: filters.workers,
        deals: filters.deals,
        statuses: filters.statuses,
        durationMin: filters.durationMin,
        durationMax: filters.durationMax,
        amountMin: filters.amountMin,
        amountMax: filters.amountMax,
      }));
    },
    [setParams]
  );

  const handleClearFilters = React.useCallback(() => {
    setParams((prev) => ({
      ...prev,
      workers: [],
      deals: [],
      statuses: [],
      durationMin: undefined,
      durationMax: undefined,
      amountMin: undefined,
      amountMax: undefined,
    }));
  }, [setParams]);

  const handleDateChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      setParams((prev) => ({
        ...prev,
        startDate: start ? toYMD(start) : "",
        endDate: end ? toYMD(end) : "",
      }));
    },
    [setParams]
  );

  const handleColumnVisibilityChange = React.useCallback(
    (state: VisibilityState) => {
      const nextState = { ...state };
      setColumnVisibility(nextState);
      const nextHidden = Object.entries(nextState)
        .filter(([, visible]) => visible === false)
        .map(([id]) => id);
      const normalizedHidden = normalizeHiddenColumns(nextHidden);
      pendingHiddenRef.current = normalizedHidden;
      setParams((prev) => ({ ...prev, hiddenColumns: normalizedHidden }));
    },
    [setParams]
  );

  const handleColumnOrderChange = React.useCallback(
    (updater: Updater<ColumnOrderState>) => {
      setColumnOrder((previous) => {
        const resolved = resolveUpdater(updater, previous);
        const next = normalizeColumnOrder(
          resolved,
          TIME_LOGS_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder, TIME_LOGS_COLUMN_IDS]
  );

  const searchValue = params.search ?? "";

  const handleExportPDF = React.useCallback(() => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to export PDF");
        return;
      }

      // Calculate totals
      const totalMinutes = data.items.reduce(
        (sum, log) => sum + (log.duration ?? 0),
        0
      );
      const totalHours = totalMinutes / 60;
      const totalAmount = data.items.reduce(
        (sum, log) => sum + Number(log.totalAmount ?? 0),
        0
      );

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Time Logs Export</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                padding: 40px;
                margin: 0;
              }
              h1 {
                color: #1a1a1a;
                margin-bottom: 8px;
                font-size: 24px;
              }
              .subtitle {
                color: #666;
                margin-bottom: 32px;
                font-size: 14px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th {
                background: #f5f5f5;
                padding: 12px;
                text-align: left;
                font-size: 11px;
                font-weight: 600;
                color: #666;
                border-bottom: 2px solid #e0e0e0;
                text-transform: uppercase;
              }
              td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
                font-size: 13px;
                color: #333;
              }
              .worker-cell {
                font-weight: 500;
              }
              .role-text {
                font-size: 11px;
                color: #666;
                display: block;
                margin-top: 2px;
              }
              .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                text-transform: uppercase;
              }
              .status-working {
                background: #fef3c7;
                color: #92400e;
              }
              .status-submitted {
                background: #dbeafe;
                color: #1e40af;
              }
              .status-approved {
                background: #d1fae5;
                color: #065f46;
              }
              .status-rejected {
                background: #fee2e2;
                color: #991b1b;
              }
              .status-invoiced {
                background: #e9d5ff;
                color: #6b21a8;
              }
              .totals-section {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #e0e0e0;
                display: flex;
                justify-content: flex-end;
                gap: 60px;
              }
              .total-item {
                text-align: right;
              }
              .total-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                margin-bottom: 4px;
                font-weight: 600;
              }
              .total-value {
                font-size: 20px;
                font-weight: 700;
                color: #1a1a1a;
              }
              @media print {
                body {
                  padding: 20px;
                }
              }
            </style>
          </head>
          <body>
            <h1>Time Logs Export</h1>
            <p class="subtitle">
              Exported on ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}
            </p>

            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Title</th>
                  <th>Job/Deal</th>
                  <th>Date</th>
                  <th>Time Period</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${
                  data.items.length > 0
                    ? data.items
                        .map(
                          (log) => `
                  <tr>
                    <td class="worker-cell">
                      ${log.worker?.name || log.contact?.name || "—"}
                      ${
                        log.worker?.role
                          ? `<span class="role-text">${log.worker.role}</span>`
                          : log.contact?.email
                          ? `<span class="role-text">${log.contact.email}</span>`
                          : ""
                      }
                    </td>
                    <td>${log.title || "—"}</td>
                    <td>${log.deal?.name || "—"}</td>
                    <td>${format(new Date(log.startTime), "MMM d, yyyy")}</td>
                    <td>
                      ${format(new Date(log.startTime), "h:mm a")}
                      ${
                        log.endTime
                          ? ` / ${format(new Date(log.endTime), "h:mm a")}`
                          : " → Working"
                      }
                    </td>
                    <td>${formatDuration(log.duration)}</td>
                    <td>
                      <span class="status-badge status-${log.status.toLowerCase()}">
                        ${
                          log.status === "DRAFT"
                            ? "Working"
                            : log.status.charAt(0) +
                              log.status.slice(1).toLowerCase()
                        }
                      </span>
                    </td>
                    <td>${formatCurrency(
                      log.totalAmount ? Number(log.totalAmount) : null,
                      log.currency
                    )}</td>
                  </tr>
                `
                        )
                        .join("")
                    : '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #999;">No time logs found</td></tr>'
                }
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-item">
                <div class="total-label">Total Hours</div>
                <div class="total-value">${totalHours.toFixed(2)}h</div>
              </div>
              <div class="total-item">
                <div class="total-label">Total Amount</div>
                <div class="total-value">${formatCurrency(
                  totalAmount,
                  null
                )}</div>
              </div>
            </div>

            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export to PDF");
    }
  }, [data.items]);

  return (
    <div className="space-y-4">
      <DataTable
        data={data.items}
        columns={timeLogColumns}
        isLoading={isFetching}
        getRowId={(row) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={TIME_LOGS_COLUMN_IDS}
        initialSorting={[{ id: "date", desc: true }]}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No time logs found. <br /> Time logs will appear here once workers
            clock in.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <TimeLogsToolbar
              search={searchValue}
              onSearchChange={handleSearchChange}
              sortValue={params.sort ?? TIME_LOGS_DEFAULT_SORT}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={TIME_LOGS_COLUMN_IDS}
              selectedWorkers={params.workers ?? []}
              selectedDeals={params.deals ?? []}
              selectedStatuses={params.statuses ?? []}
              startDate={
                params.startDate ? new Date(params.startDate) : undefined
              }
              endDate={params.endDate ? new Date(params.endDate) : undefined}
              selectedDurationMin={params.durationMin ?? undefined}
              selectedDurationMax={params.durationMax ?? undefined}
              selectedAmountMin={params.amountMin ?? undefined}
              selectedAmountMax={params.amountMax ?? undefined}
              onApplyAllFilters={handleApplyAllFilters}
              onClearFilters={handleClearFilters}
              onStartDateChange={handleDateChange}
              onExportPDF={handleExportPDF}
            />
          ),
        }}
      />
    </div>
  );
}

function visibilityFromHidden(hidden: string[]): VisibilityState {
  if (!hidden?.length) return {};
  return hidden.reduce<VisibilityState>((acc, columnId) => {
    acc[columnId] = false;
    return acc;
  }, {});
}

function normalizeHiddenColumns(columns: string[]): string[] {
  return [...columns].sort();
}

function normalizeColumnOrder(
  order: string[],
  defaults: string[],
  fixedFirst?: string
) {
  const seen = new Set<string>();
  const next: string[] = [];
  if (fixedFirst && defaults.includes(fixedFirst)) {
    seen.add(fixedFirst);
    next.push(fixedFirst);
  }
  for (const id of order) {
    if (!defaults.includes(id)) continue;
    if (fixedFirst && id === fixedFirst) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  for (const id of defaults) {
    if (fixedFirst && id === fixedFirst) continue;
    if (!seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  }
  return next;
}

function shallowEqualArrays(a: string[] | null, b: string[] | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function"
    ? (updater as (input: T) => T)(previous)
    : updater;
}
