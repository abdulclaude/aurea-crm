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
import { MoreHorizontal, Users, MapPin } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
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
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { ClassesToolbar } from "./classes-toolbar";
import { useRouter } from "next/navigation";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ClassRow = RouterOutput["studioClasses"]["list"]["classes"][number];

const SORTABLE_COLUMNS = new Set(["name", "startTime", "instructorName"]);
const CLASSES_DEFAULT_SORT = "startTime.asc";

const sortValueToState = (value?: string): SortingState => {
  const sort = value || CLASSES_DEFAULT_SORT;
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

const classColumns: ColumnDef<ClassRow>[] = [
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
    header: "Class name",
    meta: { label: "Class" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs font-medium text-primary">
        {row.original.name}
      </span>
    ),
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    meta: { label: "Description" },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs text-primary/75 line-clamp-2 max-w-xs">
        {row.original.description || "—"}
      </span>
    ),
  },
  {
    id: "startTime",
    accessorKey: "startTime",
    header: "Time",
    meta: { label: "Start time" },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs text-primary">
          {format(new Date(row.original.startTime), "PPp")}
        </span>
        <span className="text-[11px] text-primary/75">
          {format(new Date(row.original.endTime), "p")}
        </span>
      </div>
    ),
  },
  {
    id: "instructorName",
    accessorKey: "instructorName",
    header: "Instructor",
    meta: { label: "Instructor" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.instructorName || "—"}
      </span>
    ),
  },
  {
    id: "location",
    header: "Location",
    meta: { label: "Location" },
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        {row.original.location && <MapPin className="h-3.5 w-3.5" />}
        <span className="text-xs text-primary">
          {row.original.location || "—"}
        </span>
      </div>
    ),
  },
  {
    id: "capacity",
    header: "Capacity",
    meta: { label: "Capacity" },
    cell: ({ row }) => {
      const booked = (row.original._count as any)?.studioBooking ?? 0;
      const max = row.original.maxCapacity;
      const percentage = max ? Math.round((booked / max) * 100) : 0;

      return (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div className="text-right">
            <p className="text-xs font-medium text-primary">
              {booked} / {max ?? "∞"}
            </p>
            {max && (
              <p className="text-[10px] text-primary/75">
                {percentage}% full
              </p>
            )}
          </div>
        </div>
      );
    },
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
                // View details action
              }}
            >
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

const PRIMARY_COLUMN_ID = "select";
const CLASS_COLUMN_IDS = classColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string
);
const COLUMN_ORDER_STORAGE_KEY = "studio-classes-table.column-order";

export function ClassesTable() {
  const trpc = useTRPC();
  const router = useRouter();
  const [rowSelection, setRowSelection] = React.useState({});

  // URL search params
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [sortParam, setSortParam] = useQueryState("sort", parseAsString.withDefault(CLASSES_DEFAULT_SORT));
  const [hiddenColumnsParam, setHiddenColumnsParam] = useQueryState("hidden", parseAsString.withDefault(""));

  // Pagination params
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState("pageSize", parseAsInteger.withDefault(20));

  // Date filters
  const [startDateStr, setStartDateStr] = useQueryState("startDate", parseAsString.withDefault(""));
  const [endDateStr, setEndDateStr] = useQueryState("endDate", parseAsString.withDefault(""));
  const [instructorFilter, setInstructorFilter] = useQueryState("instructor", parseAsString.withDefault(""));

  // Convert strings to Date objects
  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  // Hidden columns from URL
  const hiddenColumns = React.useMemo(
    () => (hiddenColumnsParam ? hiddenColumnsParam.split(",").filter(Boolean) : []),
    [hiddenColumnsParam]
  );

  const { data, isFetching } = useSuspenseQuery(
    trpc.studioClasses.list.queryOptions({
      page,
      pageSize,
      search: search || undefined,
      startDate: startDateStr || undefined,
      endDate: endDateStr || undefined,
      instructorName: instructorFilter || undefined,
    })
  );

  const { data: stats } = useSuspenseQuery(trpc.studioClasses.stats.queryOptions());

  const sortingState = React.useMemo(
    () => sortValueToState(sortParam),
    [sortParam]
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(CLASS_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return;
    const next = normalizeColumnOrder(
      order,
      CLASS_COLUMN_IDS,
      PRIMARY_COLUMN_ID
    );
    if (shallowEqualArrays(next, CLASS_COLUMN_IDS)) {
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
          CLASS_COLUMN_IDS,
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
      const nextValue = sortingStateToValue(state) ?? CLASSES_DEFAULT_SORT;
      void setSortParam(nextValue);
    },
    [setSortParam]
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      void setSortParam(value);
    },
    [setSortParam]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      void setSearch(value);
      void setPage(1); // Reset to page 1 on search
    },
    [setSearch, setPage]
  );

  const handleDateRangeChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setStartDateStr(start ? toYMD(start) : "");
      void setEndDateStr(end ? toYMD(end) : "");
      void setPage(1); // Reset to page 1 on filter change
    },
    [setStartDateStr, setEndDateStr, setPage]
  );

  const handleInstructorChange = React.useCallback(
    (value: string) => {
      void setInstructorFilter(value);
      void setPage(1); // Reset to page 1 on filter change
    },
    [setInstructorFilter, setPage]
  );

  const handleClearFilters = React.useCallback(() => {
    void setSearch("");
    void setStartDateStr("");
    void setEndDateStr("");
    void setInstructorFilter("");
    void setPage(1);
  }, [setSearch, setStartDateStr, setEndDateStr, setInstructorFilter, setPage]);

  const handleColumnVisibilityChange = React.useCallback(
    (state: VisibilityState) => {
      const nextState = { ...state };
      setColumnVisibility(nextState);
      const nextHidden = Object.entries(nextState)
        .filter(([, visible]) => visible === false)
        .map(([id]) => id);
      pendingHiddenRef.current = nextHidden;
      void setHiddenColumnsParam(nextHidden.join(","));
    },
    [setHiddenColumnsParam]
  );

  const handleColumnOrderChange = React.useCallback(
    (updater: Updater<ColumnOrderState>) => {
      setColumnOrder((previous) => {
        const resolved = resolveUpdater(updater, previous);
        const next = normalizeColumnOrder(
          resolved,
          CLASS_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder]
  );

  const handleRowClick = React.useCallback(
    (classItem: ClassRow) => {
      router.push(`/studio/classes/${classItem.id}`);
    },
    [router]
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      void setPage(newPage);
    },
    [setPage]
  );

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      void setPageSize(newPageSize);
      void setPage(1); // Reset to page 1 when changing page size
    },
    [setPageSize, setPage]
  );

  return (
    <div className="space-y-4 pt-6">
      <DataTable
        data={data.classes}
        columns={classColumns}
        isLoading={isFetching}
        getRowId={(row) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={CLASS_COLUMN_IDS}
        initialSorting={[{ id: "startTime", desc: false }]}
        onRowClick={handleRowClick}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No classes found. <br /> Try adjusting your filters or sync from Mindbody.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <ClassesToolbar
              search={search}
              onSearchChange={handleSearchChange}
              sortValue={sortParam}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={CLASS_COLUMN_IDS}
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
              instructor={instructorFilter}
              onInstructorChange={handleInstructorChange}
              onClearFilters={handleClearFilters}
              stats={stats}
            />
          ),
        }}
        pagination={{
          currentPage: data.pagination.currentPage,
          totalPages: data.pagination.totalPages,
          pageSize: data.pagination.pageSize,
          totalItems: data.pagination.totalItems,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
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
