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
import { DEALS_DEFAULT_SORT } from "@/features/crm/deals/constants";
import { useDealsParams } from "@/features/crm/deals/hooks/use-deals-params";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { DealsToolbar } from "./deals-toolbar";

import { useRouter } from "next/navigation";

type RouterOutput = inferRouterOutputs<AppRouter>;
type DealRow = RouterOutput["deals"]["list"]["items"][number];

const SORTABLE_COLUMNS = new Set(["name", "value", "updatedAt"]);

const sortValueToState = (value?: string): SortingState => {
  const sort = value || DEALS_DEFAULT_SORT;
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

const toggleValue = (values: string[], value: string) => {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
};

const dealColumns: ColumnDef<DealRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="max-w-[25px] w-full">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="max-w-[25px] w-full">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Deal name",
    meta: { label: "Deal" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-primary">
          {row.original.name}
        </span>
        <span className="text-[11px] text-primary/75">
          {row.original.pipeline?.name ?? "No pipeline"}
        </span>
      </div>
    ),
  },
  {
    id: "stage",
    header: "Stage",
    meta: { label: "Stage" },
    cell: ({ row }) => {
      const stage = row.original.pipelineStage;
      if (!stage) {
        return <span className="text-xs text-primary/75">No stage</span>;
      }
      return (
        <Badge
          className="text-[11px] text-primary/75 bg-primary-foreground"
          style={{
            backgroundColor: stage.color
              ? `${stage.color}20`
              : "rgba(0, 0, 0, 0.1)",
            color: stage.color || "rgba(0, 0, 0, 0.7)",
          }}
        >
          {stage.name}
        </Badge>
      );
    },
  },
  {
    id: "contacts",
    header: "Contacts",
    meta: { label: "Contacts" },
    cell: ({ row }) => {
      const contacts = row.original.contacts;
      if (contacts.length === 0) {
        return <span className="text-xs text-primary/75">No contacts</span>;
      }
      return (
        <div className="flex flex-col gap-2">
          {contacts.slice(0, 2).map((contact: (typeof contacts)[number]) => (
            <div key={contact.id} className="flex items-center gap-2">
              <Avatar className="size-7 ">
                <AvatarFallback className="bg-[#202e32] text-white brightness-120 text-[10px]">
                  {(contact.name?.[0] ?? "C").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs text-primary">
                  {contact.name ?? "Unknown"}
                </p>
                <p className="truncate text-[10px] text-primary/75">
                  {contact.email ?? "No email"}
                </p>
              </div>
            </div>
          ))}
          {contacts.length > 2 && (
            <span className="text-[11px] text-primary/75">
              +{contacts.length - 2} more contact(s)
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "members",
    header: "Members assigned",
    meta: { label: "Members assigned" },
    cell: ({ row }) => {
      const members = row.original.members;

      if (members.length === 0) {
        return <span className="text-xs text-primary/75">No members</span>;
      }

      if (members.length === 1) {
        const member = members[0];
        return (
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarImage src={member.image || undefined} />
              <AvatarFallback className="text-[10px] text-white bg-[#202e32] brightness-120">
                {member.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs text-primary hover:text-black dark:text-white font-medium group">
                {member.name}
              </span>
              {member.email && (
                <span className="text-[10px] text-primary/75 hover:text-black dark:text-white/50 group">
                  {member.email}
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
              {members.slice(0, 3).map((member) => (
                <Avatar
                  key={member.id}
                  className="size-7 relative first:z-10 first:opacity-100 opacity-100"
                >
                  <AvatarImage src={member.image || undefined} />
                  <AvatarFallback className="text-[10px] bg-[#202e32] text-white brightness-120 rounded-full relative border">
                    {member.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            {members.length > 3 && (
              <Avatar className="size-7">
                <AvatarFallback className="text-[8px] bg-[#202e32] text-white brightness-120 rounded-full relative first:z-10 border">
                  +{members.length - 3}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "value",
    accessorKey: "value",
    header: "Deal value",
    meta: { label: "Deal value" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.value
          ? new Intl.NumberFormat("en", {
              style: "currency",
              currency: row.original.currency ?? "USD",
              maximumFractionDigits: 0,
            }).format(Number(row.original.value))
          : "—"}
      </span>
    ),
  },
  {
    id: "probability",
    header: "Probability",
    meta: { label: "Probability" },
    cell: ({ row }) => (
      <span className="text-xs text-primary max-w-[50px] w-full">
        {row.original.pipelineStage?.probability ?? 0}%
      </span>
    ),
  },
  {
    id: "deadline",
    accessorKey: "deadline",
    header: "Deadline",
    meta: { label: "Deadline" },
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.deadline
          ? format(new Date(row.original.deadline), "MMM d, yyyy")
          : "—"}
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
              onClick={(e) => {
                e.stopPropagation();
                row.toggleSelected(true);
              }}
            >
              <Eye className="mr-0.5 size-3.5" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Edit action - already handled by row click
              }}
            >
              <Pencil className="mr-0.5 size-3.5" />
              Edit deal
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Delete action
              }}
            >
              <Trash className="mr-0.5 size-3.5" />
              Delete deal
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
const DEAL_COLUMN_IDS = dealColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string
);
const COLUMN_ORDER_STORAGE_KEY = "deals-table.column-order";

export function DealsTable() {
  const trpc = useTRPC();
  const [params, setParams] = useDealsParams();
  const [rowSelection, setRowSelection] = React.useState({});
  const router = useRouter();

  // Date query state hooks (using parseAsString like profitableedge)
  const [deadlineStartStr, setDeadlineStartStr] = useQueryState(
    "deadlineStart",
    parseAsString.withDefault("")
  );
  const [deadlineEndStr, setDeadlineEndStr] = useQueryState(
    "deadlineEnd",
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
  const deadlineStart = deadlineStartStr
    ? new Date(deadlineStartStr)
    : undefined;
  const deadlineEnd = deadlineEndStr ? new Date(deadlineEndStr) : undefined;
  const updatedAtStart = updatedAtStartStr
    ? new Date(updatedAtStartStr)
    : undefined;
  const updatedAtEnd = updatedAtEndStr ? new Date(updatedAtEndStr) : undefined;

  const { data, isFetching } = useSuspenseQuery(
    trpc.deals.list.queryOptions({
      search: params.search || undefined,
      pipelineStageIds:
        params.stages && params.stages.length > 0 ? params.stages : undefined,
      contacts:
        params.contacts && params.contacts.length > 0
          ? params.contacts
          : undefined,
      members:
        params.members && params.members.length > 0
          ? params.members
          : undefined,
      valueMin: params.valueMin ?? undefined,
      valueMax: params.valueMax ?? undefined,
      probabilityMin: params.probabilityMin ?? undefined,
      probabilityMax: params.probabilityMax ?? undefined,
      deadlineStart: deadlineStart || undefined,
      deadlineEnd: deadlineEnd || undefined,
      updatedAtStart: updatedAtStart || undefined,
      updatedAtEnd: updatedAtEnd || undefined,
    })
  );

  const { data: stats } = useSuspenseQuery(trpc.deals.stats.queryOptions());

  const handleRowClick = React.useCallback(
    (deal: DealRow) => {
      router.push(`/deals/${deal.id}`);
    },
    [router]
  );

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort]
  );
  const searchValue = params.search ?? "";
  const selectedStages = params.stages ?? [];
  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns]
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(DEAL_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") {
      return;
    }
    const next = normalizeColumnOrder(
      order,
      DEAL_COLUMN_IDS,
      PRIMARY_COLUMN_ID
    );
    if (shallowEqualArrays(next, DEAL_COLUMN_IDS)) {
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
          DEAL_COLUMN_IDS,
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
      const nextValue = sortingStateToValue(state) ?? DEALS_DEFAULT_SORT;
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

  const handleDeadlineChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setDeadlineStartStr(start ? toYMD(start) : "");
      void setDeadlineEndStr(end ? toYMD(end) : "");
    },
    [setDeadlineStartStr, setDeadlineEndStr]
  );

  const handleUpdatedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setUpdatedAtStartStr(start ? toYMD(start) : "");
      void setUpdatedAtEndStr(end ? toYMD(end) : "");
    },
    [setUpdatedAtStartStr, setUpdatedAtEndStr]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, search: value }));
    },
    [setParams]
  );

  const handleToggleStage = React.useCallback(
    (value: string) => {
      setParams((prev) => ({
        ...prev,
        stages: toggleValue(prev.stages ?? [], value),
      }));
    },
    [setParams]
  );

  const handleClearFilters = React.useCallback(() => {
    setParams((prev) => ({
      ...prev,
      stages: [],
      contacts: [],
      members: [],
      valueMin: undefined,
      valueMax: undefined,
      probabilityMin: undefined,
      probabilityMax: undefined,
    }));
  }, [setParams]);

  const handleApplyAllFilters = React.useCallback(
    (filters: {
      stages: string[];
      contacts: string[];
      members: string[];
      valueCurrency?: string;
      valueMin?: number;
      valueMax?: number;
      probabilityMin?: number;
      probabilityMax?: number;
    }) => {
      setParams((prev) => ({
        ...prev,
        stages: filters.stages,
        contacts: filters.contacts,
        members: filters.members,
        valueCurrency: filters.valueCurrency,
        valueMin: filters.valueMin,
        valueMax: filters.valueMax,
        probabilityMin: filters.probabilityMin,
        probabilityMax: filters.probabilityMax,
      }));
    },
    [setParams]
  );

  // Get unique stages for filter with their IDs
  const uniqueStagesWithIds = React.useMemo(() => {
    const seen = new Set<string>();
    return data.items
      .map((item) => item.pipelineStage)
      .filter((stage): stage is NonNullable<typeof stage> => Boolean(stage))
      .filter((stage) => {
        if (seen.has(stage.id)) return false;
        seen.add(stage.id);
        return true;
      })
      .map((stage) => ({ id: stage.id, name: stage.name }));
  }, [data.items]);

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
          DEAL_COLUMN_IDS,
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
        columns={dealColumns}
        isLoading={isFetching}
        getRowId={(row) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={DEAL_COLUMN_IDS}
        initialSorting={[{ id: "updatedAt", desc: true }]}
        onRowClick={handleRowClick}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No deals have been made yet. <br /> Start by making a deal.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <DealsToolbar
              search={searchValue}
              onSearchChange={handleSearchChange}
              stages={uniqueStagesWithIds}
              selectedStages={selectedStages}
              onToggleStage={handleToggleStage}
              onClearFilters={handleClearFilters}
              sortValue={params.sort ?? DEALS_DEFAULT_SORT}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={DEAL_COLUMN_IDS}
              valueMin={stats.minValue}
              valueMax={stats.maxValue}
              maxValueCurrency={stats.maxValueCurrency}
              currencies={stats.currencies}
              selectedValueCurrency={params.valueCurrency ?? undefined}
              selectedValueMin={params.valueMin ?? undefined}
              selectedValueMax={params.valueMax ?? undefined}
              selectedProbabilityMin={params.probabilityMin ?? undefined}
              selectedProbabilityMax={params.probabilityMax ?? undefined}
              onApplyAllFilters={handleApplyAllFilters}
              deadlineStart={deadlineStart}
              deadlineEnd={deadlineEnd}
              onDeadlineChange={handleDeadlineChange}
              updatedAtStart={updatedAtStart}
              updatedAtEnd={updatedAtEnd}
              onUpdatedAtChange={handleUpdatedAtChange}
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
