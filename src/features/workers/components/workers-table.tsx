"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  Edit,
  Link as LinkIcon,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
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
import {
  useDeleteWorker,
  useGenerateMagicLink,
  useSendMagicLinkEmail,
} from "../hooks/use-workers";
import { useWorkersParams } from "../hooks/use-workers-params";
import { EditWorkerDialog } from "./edit-worker-dialog";
import { WorkersToolbar } from "./workers-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type WorkerRow = RouterOutput["workers"]["list"]["items"][number];

const SORTABLE_COLUMNS = new Set(["createdAt", "name", "hourlyRate"]);
const WORKERS_DEFAULT_SORT = "createdAt.desc";

const sortValueToState = (value?: string): SortingState => {
  const sort = value || WORKERS_DEFAULT_SORT;
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

const workerColumns: ColumnDef<WorkerRow>[] = [
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
    id: "name",
    accessorKey: "name",
    header: "Name",
    meta: { label: "Name" },
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-xs">{row.original.name}</p>
        {row.original.employeeId && (
          <p className="text-xs text-primary/60">
            ID: {row.original.employeeId}
          </p>
        )}
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "contact",
    accessorKey: "email",
    header: "Contact",
    meta: { label: "Contact" },
    cell: ({ row }) => (
      <div className="text-xs">
        {row.original.email && (
          <p className="text-primary/80">{row.original.email}</p>
        )}
        {row.original.phone && (
          <p className="text-primary/60">{row.original.phone}</p>
        )}
        {!row.original.email && !row.original.phone && (
          <p className="text-primary/40">—</p>
        )}
      </div>
    ),
  },
  {
    id: "role",
    accessorKey: "role",
    header: "Role",
    meta: { label: "Role" },
    cell: ({ row }) => (
      <p className="text-xs text-primary/80">{row.original.role || "—"}</p>
    ),
  },
  {
    id: "hourlyRate",
    accessorKey: "hourlyRate",
    header: "Rate",
    meta: { label: "Hourly Rate" },
    enableSorting: true,
    cell: ({ row }) => {
      if (!row.original.hourlyRate)
        return <span className="text-primary/40">—</span>;
      return (
        <p className="text-xs font-medium">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: row.original.currency || "USD",
          }).format(Number(row.original.hourlyRate))}
          /hr
        </p>
      );
    },
  },
  {
    id: "isActive",
    accessorKey: "isActive",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          "text-xs",
          row.original.isActive
            ? "bg-emerald-400/20 text-emerald-500 ring ring-emerald-400 border-none shadow-sm px-3"
            : "bg-rose-400/20 text-rose-500 ring ring-rose-400 border-none shadow-sm px-3"
        )}
      >
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last Login",
    meta: { label: "Last Login" },
    cell: ({ row }) => {
      if (!row.original.lastLoginAt) {
        return <span className="text-xs text-primary/40">Never</span>;
      }
      return (
        <span className="text-xs text-primary/60">
          {format(new Date(row.original.lastLoginAt), "MMM d, h:mm a")}
        </span>
      );
    },
  },
  {
    id: "timeLogs",
    accessorKey: "_count.timeLogs",
    header: "Logs",
    meta: { label: "Time Logs" },
    cell: ({ row }) => (
      <span className="text-xs font-medium">
        {row.original._count?.timeLogs || 0}
      </span>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created at",
    meta: { label: "Created at" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary dark:text-white/60">
        {format(new Date(row.original.createdAt), "MMM d, yy")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <WorkerActionsCell row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
];

const PRIMARY_COLUMN_ID = "select";
const WORKER_COLUMN_IDS = workerColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string
);
const COLUMN_ORDER_STORAGE_KEY = "workers-table.column-order";

function WorkerActionsCell({ row }: { row: { original: WorkerRow } }) {
  const [editingWorker, setEditingWorker] = React.useState<WorkerRow | null>(
    null
  );
  const { mutate: deleteWorker } = useDeleteWorker();
  const { mutate: generateMagicLink } = useGenerateMagicLink();
  const { mutate: sendMagicLinkEmail } = useSendMagicLinkEmail();

  const handleDelete = (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete ${name}? This will also delete all their time logs.`
      )
    ) {
      deleteWorker(
        { id },
        {
          onSuccess: () => {
            toast.success("Worker deleted successfully");
          },
          onError: (error) => {
            toast.error(error.message || "Failed to delete worker");
          },
        }
      );
    }
  };

  const handleGenerateMagicLink = (workerId: string, name: string) => {
    generateMagicLink(
      { workerId },
      {
        onSuccess: (data) => {
          navigator.clipboard.writeText(data.magicLink);
          toast.success(`Magic link copied to clipboard for ${name}`, {
            description: `Link expires ${format(data.expiresAt, "PPp")}`,
          });
        },
        onError: (error) => {
          toast.error(error.message || "Failed to generate magic link");
        },
      }
    );
  };

  const handleSendEmail = (
    workerId: string,
    name: string,
    email?: string | null
  ) => {
    if (!email) {
      toast.error("Worker does not have an email address");
      return;
    }

    sendMagicLinkEmail(
      { workerId },
      {
        onSuccess: () => {
          toast.success(`Magic link sent to ${email}`, {
            description: `${name} can now access the worker portal`,
          });
        },
        onError: (error) => {
          toast.error(error.message || "Failed to send email");
        },
      }
    );
  };

  return (
    <>
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
          <DropdownMenuItem
            className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleSendEmail(
                row.original.id,
                row.original.name,
                row.original.email
              );
            }}
            disabled={!row.original.email}
          >
            <Send className="mr-0.5 size-3.5" />
            Send Login Email
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleGenerateMagicLink(row.original.id, row.original.name);
            }}
          >
            <LinkIcon className="mr-0.5 size-3.5" />
            Copy Magic Link
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
          <DropdownMenuItem
            className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setEditingWorker(row.original);
            }}
          >
            <Edit className="mr-0.5 size-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.original.id, row.original.name);
            }}
          >
            <Trash2 className="mr-0.5 size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editingWorker && (
        <EditWorkerDialog
          worker={editingWorker}
          open={!!editingWorker}
          onOpenChange={(open) => {
            if (!open) setEditingWorker(null);
          }}
          onSuccess={() => {
            setEditingWorker(null);
          }}
        />
      )}
    </>
  );
}

// Helper functions for column management
function normalizeColumnOrder(
  order: string[],
  defaults: string[],
  fixedFirst?: string
) {
  const seen = new Set<string>();
  const next: string[] = [];

  // Add fixed first column
  if (fixedFirst && defaults.includes(fixedFirst)) {
    seen.add(fixedFirst);
    next.push(fixedFirst);
  }

  // Add columns from order (excluding fixed first)
  for (const id of order) {
    if (!defaults.includes(id)) continue;
    if (fixedFirst && id === fixedFirst) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }

  // Add any missing columns from defaults (excluding fixed first)
  for (const id of defaults) {
    if (fixedFirst && id === fixedFirst) continue;
    if (!seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  }

  return next;
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function"
    ? (updater as (input: T) => T)(previous)
    : updater;
}

function shallowEqualArrays(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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

type WorkersTableProps = {
  scope?: "agency" | "all-clients";
};

export function WorkersTable({ scope = "agency" }: WorkersTableProps) {
  const trpc = useTRPC();
  const [params, setParams] = useWorkersParams();
  const [rowSelection, setRowSelection] = React.useState({});

  // Client filter for "all-clients" scope (agency viewing all client data)
  const [selectedSubaccountId, setSelectedSubaccountId] = useQueryState(
    "subaccountId",
    parseAsString.withDefault("")
  );

  const { data, isFetching } = useSuspenseQuery(
    trpc.workers.list.queryOptions({
      search: params.search || undefined,
      roles: params.roles && params.roles.length > 0 ? params.roles : undefined,
      isActive: params.isActive ?? undefined,
      rateMin: params.rateMin ?? undefined,
      rateMax: params.rateMax ?? undefined,
      createdAfter: params.createdAfter
        ? new Date(params.createdAfter)
        : undefined,
      createdBefore: params.createdBefore
        ? new Date(params.createdBefore)
        : undefined,
      // For "all-clients" scope, pass the selected subaccount filter
      ...(scope === "all-clients" && {
        includeAllClients: !selectedSubaccountId, // If no specific client selected, show all
        subaccountId: selectedSubaccountId || undefined, // If client selected, filter by it
      }),
    })
  );

  const workers = data?.items || [];

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort]
  );

  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns]
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));

  const pendingHiddenRef = React.useRef<string[] | null>(null);

  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(WORKER_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") {
      return;
    }
    const next = normalizeColumnOrder(
      order,
      WORKER_COLUMN_IDS,
      PRIMARY_COLUMN_ID
    );
    if (shallowEqualArrays(next, WORKER_COLUMN_IDS)) {
      window.localStorage.removeItem(COLUMN_ORDER_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(next));
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const next = normalizeColumnOrder(
          parsed,
          WORKER_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        setColumnOrder(next);
      }
    } catch {
      // ignore
    }
  }, []);

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

  const handleSortingChange = React.useCallback(
    (state: SortingState) => {
      const nextValue = sortingStateToValue(state) ?? WORKERS_DEFAULT_SORT;
      setParams((prev) => ({ ...prev, sort: nextValue }));
    },
    [setParams]
  );

  const handleSearchChange = React.useCallback(
    (search: string) => {
      setParams((prev) => ({ ...prev, search }));
    },
    [setParams]
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, sort: value }));
    },
    [setParams]
  );

  const handleApplyFilters = React.useCallback(
    (filters: {
      roles: string[];
      status: boolean | null;
      rateMin?: number;
      rateMax?: number;
    }) => {
      setParams((prev) => ({
        ...prev,
        roles: filters.roles,
        isActive: filters.status,
        rateMin: filters.rateMin ?? null,
        rateMax: filters.rateMax ?? null,
      }));
    },
    [setParams]
  );

  const handleDateRangeChange = React.useCallback(
    (start?: Date, end?: Date) => {
      setParams((prev) => ({
        ...prev,
        createdAfter: start ? start.toISOString() : "",
        createdBefore: end ? end.toISOString() : "",
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
          WORKER_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder]
  );

  return (
    <div className="space-y-4 pt-6">
      <DataTable
        data={workers}
        columns={workerColumns}
        isLoading={isFetching}
        getRowId={(row) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={WORKER_COLUMN_IDS}
        initialSorting={[{ id: "createdAt", desc: true }]}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        toolbar={{
          filters: (ctx) => (
            <WorkersToolbar
              search={params.search || ""}
              onSearchChange={handleSearchChange}
              sortValue={params.sort || WORKERS_DEFAULT_SORT}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={WORKER_COLUMN_IDS}
              selectedRoles={params.roles || []}
              selectedStatus={params.isActive ?? null}
              selectedRateMin={params.rateMin ?? undefined}
              selectedRateMax={params.rateMax ?? undefined}
              startDate={
                params.createdAfter ? new Date(params.createdAfter) : undefined
              }
              endDate={
                params.createdBefore
                  ? new Date(params.createdBefore)
                  : undefined
              }
              onApplyAllFilters={handleApplyFilters}
              onStartDateChange={handleDateRangeChange}
              scope={scope}
              selectedSubaccountId={selectedSubaccountId}
              onSubaccountIdChange={setSelectedSubaccountId}
            />
          ),
        }}
      />
    </div>
  );
}
