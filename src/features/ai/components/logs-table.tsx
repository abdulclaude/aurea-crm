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
import { Eye, MoreHorizontal, Trash } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { LOGS_DEFAULT_SORT } from "@/features/ai/logs/constants";
import { useLogsParams } from "@/features/ai/logs/hooks/use-logs-params";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { LogsToolbar } from "./logs-toolbar";
import { AILogStatus } from "@/generated/prisma/enums";

type RouterOutput = inferRouterOutputs<AppRouter>;
type LogRow = RouterOutput["logs"]["list"]["items"][number];

const SORTABLE_COLUMNS = new Set(["title", "createdAt", "completedAt"]);

const sortValueToState = (value?: string): SortingState => {
  const sort = value || LOGS_DEFAULT_SORT;
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

const getStatusBadgeStyles = (status: AILogStatus) => {
  switch (status) {
    case AILogStatus.COMPLETED:
      return {
        className:
          "text-[11px] bg-green-500/20 text-green-700 dark:text-green-400",
        label: "Completed",
      };
    case AILogStatus.FAILED:
      return {
        className: "text-[11px] bg-red-500/20 text-red-700 dark:text-red-400",
        label: "Failed",
      };
    case AILogStatus.RUNNING:
      return {
        className:
          "text-[11px] bg-blue-500/20 text-blue-700 dark:text-blue-400",
        label: "Running",
      };
    case AILogStatus.PENDING:
      return {
        className:
          "text-[11px] bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
        label: "Pending",
      };
    default:
      return {
        className: "text-[11px] bg-primary-foreground text-primary",
        label: status,
      };
  }
};

const logColumns: ColumnDef<LogRow>[] = [
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
    id: "title",
    accessorKey: "title",
    header: "Title",
    meta: { label: "Title" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col max-w-[250px]">
        <span className="text-xs font-medium text-primary truncate">
          {row.original.title}
        </span>
        {row.original.description && (
          <span className="text-[11px] text-primary/75 truncate">
            {row.original.description}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => {
      const { className, label } = getStatusBadgeStyles(row.original.status);
      return <Badge className={className}>{label}</Badge>;
    },
  },
  {
    id: "intent",
    accessorKey: "intent",
    header: "Intent",
    meta: { label: "Intent" },
    cell: ({ row }) => (
      <span className="text-xs text-primary truncate max-w-[150px] block">
        {row.original.intent || "—"}
      </span>
    ),
  },
  {
    id: "user",
    header: "User",
    meta: { label: "User" },
    cell: ({ row }) => {
      const user = row.original.user;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="text-[10px] text-white bg-[#202e32] brightness-120">
              {user.name?.substring(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-primary truncate">
              {user.name || "Unknown"}
            </span>
            {user.email && (
              <span className="text-[10px] text-primary/75 truncate">
                {user.email}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "userMessage",
    accessorKey: "userMessage",
    header: "Message",
    meta: { label: "Message" },
    cell: ({ row }) => (
      <span className="text-xs text-primary line-clamp-2 truncate">
        {row.original.userMessage}
      </span>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    meta: { label: "Created" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary whitespace-nowrap">
        {format(new Date(row.original.createdAt), "MMM d, yy 'at' HH:mm")}
      </span>
    ),
  },
  {
    id: "completedAt",
    accessorKey: "completedAt",
    header: "Completed",
    meta: { label: "Completed" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary whitespace-nowrap">
        {row.original.completedAt
          ? format(new Date(row.original.completedAt), "MMM d, yy 'at' HH:mm")
          : "—"}
      </span>
    ),
  },
  {
    id: "error",
    accessorKey: "error",
    header: "Error",
    meta: { label: "Error" },
    cell: ({ row }) => (
      <span className="text-xs text-red-600 dark:text-red-400 line-clamp-1 max-w-xs">
        {row.original.error || "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="size-8 p-0 hover:bg-primary/5 border-none"
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
                row.toggleSelected(true);
              }}
            >
              <Eye className="mr-0.5 size-3.5" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Delete action
              }}
            >
              <Trash className="mr-0.5 size-3.5" />
              Delete log
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

const PRIMARY_COLUMN_ID = "select";
const LOG_COLUMN_IDS = logColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string
);
const COLUMN_ORDER_STORAGE_KEY = "logs-table.column-order";

export function LogsTable() {
  const trpc = useTRPC();
  const [params, setParams] = useLogsParams();
  const [rowSelection, setRowSelection] = React.useState({});

  // Date query state hooks
  const [createdAtStartStr, setCreatedAtStartStr] = useQueryState(
    "createdAtStart",
    parseAsString.withDefault("")
  );
  const [createdAtEndStr, setCreatedAtEndStr] = useQueryState(
    "createdAtEnd",
    parseAsString.withDefault("")
  );
  const [completedAtStartStr, setCompletedAtStartStr] = useQueryState(
    "completedAtStart",
    parseAsString.withDefault("")
  );
  const [completedAtEndStr, setCompletedAtEndStr] = useQueryState(
    "completedAtEnd",
    parseAsString.withDefault("")
  );

  // Convert strings to Date objects for use in components
  const createdAtStart = createdAtStartStr
    ? new Date(createdAtStartStr)
    : undefined;
  const createdAtEnd = createdAtEndStr ? new Date(createdAtEndStr) : undefined;
  const completedAtStart = completedAtStartStr
    ? new Date(completedAtStartStr)
    : undefined;
  const completedAtEnd = completedAtEndStr
    ? new Date(completedAtEndStr)
    : undefined;

  const { data, isFetching } = useSuspenseQuery(
    trpc.logs.list.queryOptions({
      search: params.search || undefined,
      statuses:
        params.statuses && params.statuses.length > 0
          ? (params.statuses as AILogStatus[])
          : undefined,
      intents:
        params.intents && params.intents.length > 0
          ? params.intents
          : undefined,
      userIds:
        params.userIds && params.userIds.length > 0
          ? params.userIds
          : undefined,
      createdAtStart: createdAtStart || undefined,
      createdAtEnd: createdAtEnd || undefined,
      completedAtStart: completedAtStart || undefined,
      completedAtEnd: completedAtEnd || undefined,
    })
  );

  const { data: stats } = useSuspenseQuery(trpc.logs.stats.queryOptions());

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort]
  );
  const searchValue = params.search ?? "";
  const selectedStatuses = params.statuses ?? [];
  const selectedIntents = params.intents ?? [];
  const selectedUserIds = params.userIds ?? [];
  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns]
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(LOG_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") {
      return;
    }
    const next = normalizeColumnOrder(order, LOG_COLUMN_IDS, PRIMARY_COLUMN_ID);
    if (shallowEqualArrays(next, LOG_COLUMN_IDS)) {
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
          LOG_COLUMN_IDS,
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
      const nextValue = sortingStateToValue(state) ?? LOGS_DEFAULT_SORT;
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

  const handleCreatedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setCreatedAtStartStr(start ? toYMD(start) : "");
      void setCreatedAtEndStr(end ? toYMD(end) : "");
    },
    [setCreatedAtStartStr, setCreatedAtEndStr]
  );

  const handleCompletedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setCompletedAtStartStr(start ? toYMD(start) : "");
      void setCompletedAtEndStr(end ? toYMD(end) : "");
    },
    [setCompletedAtStartStr, setCompletedAtEndStr]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, search: value }));
    },
    [setParams]
  );

  const handleApplyAllFilters = React.useCallback(
    (filters: { statuses: string[]; intents: string[]; userIds: string[] }) => {
      setParams((prev) => ({
        ...prev,
        statuses: filters.statuses,
        intents: filters.intents,
        userIds: filters.userIds,
      }));
    },
    [setParams]
  );

  const handleClearFilters = React.useCallback(() => {
    setParams((prev) => ({
      ...prev,
      statuses: [],
      intents: [],
      userIds: [],
    }));
    void setCreatedAtStartStr("");
    void setCreatedAtEndStr("");
    void setCompletedAtStartStr("");
    void setCompletedAtEndStr("");
  }, [
    setParams,
    setCreatedAtStartStr,
    setCreatedAtEndStr,
    setCompletedAtStartStr,
    setCompletedAtEndStr,
  ]);

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
          LOG_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder]
  );

  return (
    <div className="space-y-4">
      <DataTable
        data={data.items}
        columns={logColumns}
        isLoading={isFetching}
        getRowId={(row) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={LOG_COLUMN_IDS}
        initialSorting={[{ id: "createdAt", desc: true }]}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No AI logs found. <br /> Logs will appear here after AI assistant
            usage.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <LogsToolbar
              search={searchValue}
              onSearchChange={handleSearchChange}
              selectedStatuses={selectedStatuses}
              selectedIntents={selectedIntents}
              selectedUserIds={selectedUserIds}
              onApplyAllFilters={handleApplyAllFilters}
              onClearFilters={handleClearFilters}
              sortValue={params.sort ?? LOGS_DEFAULT_SORT}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={LOG_COLUMN_IDS}
              createdAtStart={createdAtStart}
              createdAtEnd={createdAtEnd}
              onCreatedAtChange={handleCreatedAtChange}
              completedAtStart={completedAtStart}
              completedAtEnd={completedAtEnd}
              onCompletedAtChange={handleCompletedAtChange}
              stats={stats}
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
