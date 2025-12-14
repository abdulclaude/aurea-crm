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
import { Eye, MoreHorizontal, Pencil, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
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
import { PIPELINES_DEFAULT_SORT } from "@/features/crm/pipelines/constants";
import { usePipelinesParams } from "@/features/crm/pipelines/hooks/use-pipelines-params";
import { getCurrencySymbol } from "@/features/crm/lib/currency";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { PipelinesToolbar } from "./pipelines-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type PipelineRow = RouterOutput["pipelines"]["list"]["items"][number];

const SORTABLE_COLUMNS = new Set(["name", "createdAt", "updatedAt"]);

const sortValueToState = (value?: string): SortingState => {
  const sort = value || PIPELINES_DEFAULT_SORT;
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

const getPipelineColumns = (
  selectedCurrency?: string | null
): ColumnDef<PipelineRow>[] => [
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
    accessorFn: (row) => row.name,
    header: "Pipeline name",
    meta: { label: "Pipeline" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => {
      const pipeline = row.original;
      return (
        <div className="flex flex-col gap-1 max-w-[200px]">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-primary/80 hover:text-black dark:text-white group">
              {pipeline.name}
            </p>
            {pipeline.isDefault && (
              <Badge className="text-[10px] uppercase bg-blue-400 text-white dark:bg-blue-500/20 dark:text-blue-200">
                Default
              </Badge>
            )}
          </div>
          {pipeline.description && (
            <p className="text-[11px] text-primary/80 hover:text-black dark:text-white/50 group line-clamp-1 truncate">
              {pipeline.description}
            </p>
          )}
        </div>
      );
    },
  },
  {
    id: "stages",
    header: "Stages",
    meta: { label: "Stages" },
    cell: ({ row }) => {
      const pipeline = row.original;
      return (
        <div className="flex flex-col gap-2 max-w-[150px]">
          <div className="flex items-center gap-1 flex-wrap">
            {pipeline.stages.slice(0, 2).map((stage) => (
              <Badge
                key={stage.id}
                className="text-[10px]"
                style={{
                  backgroundColor: stage.color
                    ? `${stage.color}15`
                    : "rgba(255, 255, 255, 0.1)",
                  color: stage.color || "rgba(255, 255, 255, 0.7)",
                }}
              >
                {stage.name}
              </Badge>
            ))}
          </div>

          {pipeline.stages.length > 2 && (
            <Badge className="text-[10px] text-white bg-primary dark:bg-primary/10 brightness-120">
              +{pipeline.stages.length - 2} more
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: "contacts",
    header: "Contacts",
    meta: { label: "Contacts" },
    cell: ({ row }) => {
      const pipeline = row.original;
      const contacts = pipeline.contacts || [];

      if (contacts.length === 0) {
        return (
          <span className="text-xs text-primary/80 hover:text-black dark:text-white/40 group truncate">
            No contacts
          </span>
        );
      }

      if (contacts.length === 1) {
        const contact = contacts[0];
        return (
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarImage src={contact.logo || undefined} />
              <AvatarFallback className="text-[10px] text-white bg-[#202e32] brightness-120">
                {contact.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs text-primary hover:text-black dark:text-white font-medium group">
                {contact.name}
              </span>
              {contact.email && (
                <span className="text-[10px] text-primary/75 hover:text-black dark:text-white/50 group">
                  {contact.email}
                </span>
              )}
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            <div className="flex -space-x-1.5">
              {contacts.slice(0, 3).map((contact) => (
                <Avatar
                  key={contact.id}
                  className="size-7 relative first:z-10 first:opacity-100 opacity-100"
                >
                  <AvatarImage src={contact.logo || undefined} />
                  <AvatarFallback className="text-[10px] bg-[#202e32] text-white brightness-120 rounded-full relative border">
                    {contact.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            {contacts.length > 3 && (
              <Avatar className="size-7">
                <AvatarFallback className="text-[8px] bg-[#202e32] text-white brightness-120 rounded-full relative first:z-10 border">
                  +{contacts.length - 3}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "dealsCount",
    header: "# of Deals",
    meta: { label: "# of Deals" },
    cell: ({ row }) => (
      <span className="text-xs text-primary  dark:text-white/80 group max-w-[50px] truncate">
        {row.original.dealsCount || 0}
      </span>
    ),
  },
  {
    id: "dealsValue",
    header: "Deals Value",
    meta: { label: "Deals Value" },
    cell: ({ row }) => {
      const value = row.original.dealsValue || 0;
      const currencySymbol = getCurrencySymbol(selectedCurrency || "USD");
      return (
        <span className="text-xs text-primary  dark:text-white/80 group max-w-[50px] truncate">
          {currencySymbol}
          {value.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    id: "winRate",
    header: "Win Rate %",
    meta: { label: "Win Rate %" },
    cell: ({ row }) => {
      const winRate = row.original.winRate || 0;
      return (
        <span className="text-xs text-primary hover:text-black dark:text-white/80 group max-w-[50px] truncate">
          {winRate.toFixed(1)}%
        </span>
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
        className={cn(
          "text-[10px] uppercase",
          row.original.isActive
            ? "bg-emerald-400 text-white"
            : "bg-gray-500/20 text-gray-400"
        )}
      >
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created at",
    meta: { label: "Created at" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {format(new Date(row.original.createdAt), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Last updated",
    meta: { label: "Last updated" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {format(new Date(row.original.updatedAt), "MMM d, yy'' 'at' HH:mm")}
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
              asChild
            >
              <a
                href={`/pipelines/${row.original.id}/edit`}
                onClick={(e) => e.stopPropagation()}
              >
                <Pencil className="mr-0.5 size-3.5" />
                Edit pipeline
              </a>
            </DropdownMenuItem>
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
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

const PRIMARY_COLUMN_ID = "name";
const COLUMN_ORDER_STORAGE_KEY = "pipelines-table.column-order";

// Get default column IDs using null currency (will show USD by default)
const PIPELINE_COLUMN_IDS = getPipelineColumns(null).map(
  (column, index) => (column.id ?? `column-${index}`) as string
);

type PipelinesTableProps = {
  scope?: "agency" | "all-clients";
};

export function PipelinesTable({ scope = "agency" }: PipelinesTableProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [params, setParams] = usePipelinesParams();
  const [rowSelection, setRowSelection] = React.useState({});

  // Pagination state
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState("pageSize", parseAsInteger.withDefault(20));

  // Client filter for "all-clients" scope (agency viewing all client data)
  const [selectedSubaccountId, setSelectedSubaccountId] = useQueryState(
    "subaccountId",
    parseAsString.withDefault("")
  );

  // Date query state hooks (using parseAsString like profitableedge)
  const [createdAtStartStr, setCreatedAtStartStr] = useQueryState(
    "createdAtStart",
    parseAsString.withDefault("")
  );
  const [createdAtEndStr, setCreatedAtEndStr] = useQueryState(
    "createdAtEnd",
    parseAsString.withDefault("")
  );
  const [updatedAtStartStr, setUpdatedAtStartStr] = useQueryState(
    "updatedAtStart",
    parseAsString.withDefault("")
  );
  const [updatedAtEndStr, setUpdatedAtEndStr] = useQueryState(
    "updatedAtEnd",
    parseAsString.withDefault("")
  );

  // Convert strings to Date objects for use in components
  const createdAtStart = createdAtStartStr
    ? new Date(createdAtStartStr)
    : undefined;
  const createdAtEnd = createdAtEndStr ? new Date(createdAtEndStr) : undefined;
  const updatedAtStart = updatedAtStartStr
    ? new Date(updatedAtStartStr)
    : undefined;
  const updatedAtEnd = updatedAtEndStr ? new Date(updatedAtEndStr) : undefined;

  // Generate columns with the selected currency
  const pipelineColumns = React.useMemo(
    () => getPipelineColumns(params.dealsValueCurrency ?? null),
    [params.dealsValueCurrency]
  );

  const { data, isFetching } = useSuspenseQuery(
    trpc.pipelines.list.queryOptions({
      page,
      pageSize,
      search: params.search || undefined,
      isActive: params.isActive ?? undefined,
      stages:
        params.stages && params.stages.length > 0 ? params.stages : undefined,
      contacts:
        params.contacts && params.contacts.length > 0
          ? params.contacts
          : undefined,
      dealsCountMin: params.dealsCountMin ?? undefined,
      dealsCountMax: params.dealsCountMax ?? undefined,
      dealsValueCurrency: params.dealsValueCurrency ?? undefined,
      dealsValueMin: params.dealsValueMin ?? undefined,
      dealsValueMax: params.dealsValueMax ?? undefined,
      winRateMin: params.winRateMin ?? undefined,
      winRateMax: params.winRateMax ?? undefined,
      createdAtStart: createdAtStart || undefined,
      createdAtEnd: createdAtEnd || undefined,
      updatedAtStart: updatedAtStart || undefined,
      updatedAtEnd: updatedAtEnd || undefined,
      // For "all-clients" scope, pass the selected subaccount filter
      ...(scope === "all-clients" && {
        includeAllClients: !selectedSubaccountId, // If no specific client selected, show all
        subaccountId: selectedSubaccountId || undefined, // If client selected, filter by it
      }),
    })
  );

  const { data: stats } = useSuspenseQuery(trpc.pipelines.stats.queryOptions());

  // Set default currency to first available if none selected
  React.useEffect(() => {
    if (!params.dealsValueCurrency && stats.currencies.length > 0) {
      setParams((prev) => ({
        ...prev,
        dealsValueCurrency: stats.currencies[0],
      }));
    }
  }, [params.dealsValueCurrency, stats.currencies, setParams]);

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort]
  );
  const searchValue = params.search ?? "";
  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns]
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(PIPELINE_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") {
      return;
    }
    const next = normalizeColumnOrder(
      order,
      PIPELINE_COLUMN_IDS,
      PRIMARY_COLUMN_ID
    );
    if (shallowEqualArrays(next, PIPELINE_COLUMN_IDS)) {
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
          PIPELINE_COLUMN_IDS,
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
      const nextValue = sortingStateToValue(state) ?? PIPELINES_DEFAULT_SORT;
      setParams((prev) => ({ ...prev, sort: nextValue }));
    },
    [setParams]
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => void setPage(newPage),
    [setPage]
  );

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      void setPageSize(newPageSize);
      void setPage(1);
    },
    [setPageSize, setPage]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, search: value }));
      void setPage(1);
    },
    [setParams, setPage]
  );

  const handleActiveFilterChange = React.useCallback(
    (isActive: boolean | null) => {
      setParams((prev) => ({ ...prev, isActive }));
      void setPage(1);
    },
    [setParams, setPage]
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, sort: value }));
      void setPage(1);
    },
    [setParams, setPage]
  );

  const handleCreatedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setCreatedAtStartStr(start ? toYMD(start) : "");
      void setCreatedAtEndStr(end ? toYMD(end) : "");
      void setPage(1);
    },
    [setCreatedAtStartStr, setCreatedAtEndStr, setPage]
  );

  const handleUpdatedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setUpdatedAtStartStr(start ? toYMD(start) : "");
      void setUpdatedAtEndStr(end ? toYMD(end) : "");
      void setPage(1);
    },
    [setUpdatedAtStartStr, setUpdatedAtEndStr, setPage]
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
          PIPELINE_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder]
  );

  const handleRowClick = React.useCallback(
    (pipeline: PipelineRow) => {
      router.push(`/pipelines/${pipeline.id}`);
    },
    [router]
  );

  const handleCurrencyChange = React.useCallback(
    (currency: string) => {
      setParams((prev) => ({
        ...prev,
        dealsValueCurrency: currency,
      }));
      void setPage(1);
    },
    [setParams, setPage]
  );

  const handleApplyAllFilters = React.useCallback(
    (filters: {
      stages: string[];
      contacts: string[];
      dealsCountMin?: number;
      dealsCountMax?: number;
      dealsValueMin?: number;
      dealsValueMax?: number;
      winRateMin?: number;
      winRateMax?: number;
    }) => {
      setParams((prev) => ({
        ...prev,
        stages: filters.stages,
        contacts: filters.contacts,
        dealsCountMin: filters.dealsCountMin,
        dealsCountMax: filters.dealsCountMax,
        dealsValueMin: filters.dealsValueMin,
        dealsValueMax: filters.dealsValueMax,
        winRateMin: filters.winRateMin,
        winRateMax: filters.winRateMax,
      }));
      void setPage(1);
    },
    [setParams, setPage]
  );

  // Extract unique stages and contacts from all pipelines
  const uniqueStages = React.useMemo(() => {
    const stageNames = new Set<string>();
    data.items.forEach((pipeline) => {
      pipeline.stages.forEach((stage) => {
        stageNames.add(stage.name);
      });
    });
    return Array.from(stageNames).sort();
  }, [data.items]);

  // Extract unique contacts with their IDs and names
  const uniqueContactsWithIds = React.useMemo(() => {
    const seen = new Set<string>();
    const contacts: Array<{ id: string; name: string }> = [];

    data.items.forEach((pipeline) => {
      pipeline.contacts.forEach((contact: any) => {
        if (contact && !seen.has(contact.id)) {
          seen.add(contact.id);
          contacts.push({ id: contact.id, name: contact.name || "Unknown" });
        }
      });
    });

    return contacts.sort((a, b) => a.name.localeCompare(b.name));
  }, [data.items]);

  return (
    <div className="space-y-4 w-full pt-6">
      <DataTable
        data={data.items}
        columns={pipelineColumns}
        isLoading={isFetching}
        getRowId={(row) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={PIPELINE_COLUMN_IDS}
        initialSorting={[{ id: "updatedAt", desc: true }]}
        enableGlobalSearch={false}
        onRowClick={handleRowClick}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        pagination={{
          currentPage: data.pagination.currentPage,
          totalPages: data.pagination.totalPages,
          pageSize: data.pagination.pageSize,
          totalItems: data.pagination.totalItems,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No pipelines have been created yet. <br /> Start by creating a
            pipeline.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <PipelinesToolbar
              search={searchValue}
              onSearchChange={handleSearchChange}
              isActive={params.isActive ?? null}
              onActiveFilterChange={handleActiveFilterChange}
              sortValue={params.sort ?? PIPELINES_DEFAULT_SORT}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={PIPELINE_COLUMN_IDS}
              stages={uniqueStages}
              selectedStages={params.stages ?? []}
              contacts={uniqueContactsWithIds}
              selectedContacts={params.contacts ?? []}
              dealsCountMin={stats.minDealsCount}
              dealsCountMax={stats.maxDealsCount}
              dealsValueMin={stats.minDealsValue}
              dealsValueMax={stats.maxDealsValue}
              currencies={stats.currencies}
              selectedCurrency={
                params.dealsValueCurrency || stats.currencies[0]
              }
              onCurrencyChange={handleCurrencyChange}
              selectedDealsCountMin={params.dealsCountMin ?? undefined}
              selectedDealsCountMax={params.dealsCountMax ?? undefined}
              selectedDealsValueMin={params.dealsValueMin ?? undefined}
              selectedDealsValueMax={params.dealsValueMax ?? undefined}
              selectedWinRateMin={params.winRateMin ?? undefined}
              selectedWinRateMax={params.winRateMax ?? undefined}
              onApplyAllFilters={handleApplyAllFilters}
              createdAtStart={createdAtStart}
              createdAtEnd={createdAtEnd}
              onCreatedAtChange={handleCreatedAtChange}
              updatedAtStart={updatedAtStart}
              updatedAtEnd={updatedAtEnd}
              onUpdatedAtChange={handleUpdatedAtChange}
              scope={scope}
              selectedSubaccountId={selectedSubaccountId}
              onSubaccountChange={setSelectedSubaccountId}
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
