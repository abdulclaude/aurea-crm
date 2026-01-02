"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  type Table as TanstackTable,
  type Updater,
  useReactTable,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table as UiTable,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";

export interface DataTableToolbarContext<TData> {
  table: TanstackTable<TData>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
}

export type ToolbarRenderer<TData> = (
  ctx: DataTableToolbarContext<TData>
) => React.ReactNode;

export interface DataTableSearchConfig {
  placeholder?: string;
  columns?: string[];
  inputClassName?: string;
  debounceMs?: number;
}

export interface DataTableToolbarConfig<TData> {
  filters?: ToolbarRenderer<TData>;
  sort?: ToolbarRenderer<TData>;
  view?: ToolbarRenderer<TData>;
  search?: DataTableSearchConfig;
}

export interface DataTablePaginationConfig {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  toolbar?: DataTableToolbarConfig<TData>;
  isLoading?: boolean;
  skeletonRowCount?: number;
  emptyState?: React.ReactNode;
  className?: string;
  getRowId?: (originalRow: TData, index: number) => string;
  initialSorting?: SortingState;
  sorting?: SortingState;
  onSortingChange?: (state: SortingState) => void;
  globalFilterValue?: string;
  onGlobalFilterChange?: (value: string) => void;
  enableGlobalSearch?: boolean;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (state: VisibilityState) => void;
  initialColumnVisibility?: VisibilityState;
  columnOrder?: ColumnOrderState;
  onColumnOrderChange?: (state: ColumnOrderState) => void;
  initialColumnOrder?: ColumnOrderState;
  onRowClick?: (row: TData) => void;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (state: RowSelectionState) => void;
  initialRowSelection?: RowSelectionState;
  pagination?: DataTablePaginationConfig;
}

const resolveUpdater = <T,>(updater: Updater<T>, previous: T) => {
  return typeof updater === "function"
    ? (updater as (old: T) => T)(previous)
    : updater;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  isLoading = false,
  skeletonRowCount = 8,
  emptyState,
  className,
  getRowId,
  initialSorting = [],
  sorting: sortingProp,
  onSortingChange,
  globalFilterValue,
  onGlobalFilterChange,
  enableGlobalSearch = true,
  columnVisibility: columnVisibilityProp,
  onColumnVisibilityChange,
  initialColumnVisibility = {},
  columnOrder: columnOrderProp,
  onColumnOrderChange,
  initialColumnOrder = [],
  onRowClick,
  enableRowSelection = false,
  rowSelection: rowSelectionProp,
  onRowSelectionChange,
  initialRowSelection = {},
  pagination,
}: DataTableProps<TData, TValue>) {
  const [sortingState, setSortingState] =
    React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [globalFilterInternal, setGlobalFilterInternal] = React.useState("");
  const globalFilter = globalFilterValue ?? globalFilterInternal;
  const sorting = sortingProp ?? sortingState;
  const [columnVisibilityState, setColumnVisibilityState] =
    React.useState<VisibilityState>(initialColumnVisibility);
  const columnVisibility = columnVisibilityProp ?? columnVisibilityState;
  const [columnOrderState, setColumnOrderState] =
    React.useState<ColumnOrderState>(() => {
      // Ensure "select" column is always first
      if (initialColumnOrder.includes("select")) {
        return [
          "select",
          ...initialColumnOrder.filter((id) => id !== "select"),
        ];
      }
      return initialColumnOrder;
    });
  const columnOrder = React.useMemo(() => {
    const order = columnOrderProp ?? columnOrderState;
    // Ensure "select" column is always first in the computed order
    if (order.includes("select")) {
      return ["select", ...order.filter((id) => id !== "select")];
    }
    return order;
  }, [columnOrderProp, columnOrderState]);
  const [searchInputValue, setSearchInputValue] = React.useState(globalFilter);
  const [rowSelectionState, setRowSelectionState] =
    React.useState<RowSelectionState>(initialRowSelection);
  const rowSelection = rowSelectionProp ?? rowSelectionState;
  const skeletonRowKeys = React.useMemo(
    () =>
      Array.from({ length: skeletonRowCount }).map(
        (_, index) => `skeleton-${index}`
      ),
    [skeletonRowCount]
  );

  const searchColumns = toolbar?.search?.columns;

  const globalSearchFn = React.useMemo<FilterFn<TData>>(() => {
    if (!enableGlobalSearch) {
      return () => true;
    }

    return (row, _columnId, filterValue) => {
      const query = String(filterValue ?? "")
        .toLowerCase()
        .trim();
      if (!query) return true;

      const columnsToSearch =
        searchColumns && searchColumns.length > 0 ? searchColumns : undefined;

      if (columnsToSearch) {
        return columnsToSearch.some((columnKey) => {
          const value = row.getValue(columnKey);
          if (value === undefined || value === null) return false;
          return String(value).toLowerCase().includes(query);
        });
      }

      try {
        const raw = JSON.stringify(row.original ?? {}).toLowerCase();
        return raw.includes(query);
      } catch {
        return false;
      }
    };
  }, [enableGlobalSearch, searchColumns]);

  React.useEffect(() => {
    setSearchInputValue(globalFilter);
  }, [globalFilter]);

  const handleGlobalFilterChange = React.useCallback(
    (updater: Updater<string>) => {
      const nextValue = resolveUpdater(updater, globalFilter);
      if (onGlobalFilterChange) {
        onGlobalFilterChange(nextValue);
      } else {
        setGlobalFilterInternal(nextValue);
      }
    },
    [globalFilter, onGlobalFilterChange]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      columnOrder,
      rowSelection,
    },
    enableRowSelection,
    onSortingChange: React.useCallback(
      (updater: Updater<SortingState>) => {
        const nextValue = resolveUpdater(updater, sorting);
        if (onSortingChange) {
          onSortingChange(nextValue);
        } else {
          setSortingState(nextValue);
        }
      },
      [onSortingChange, sorting]
    ),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: handleGlobalFilterChange,
    onColumnVisibilityChange: React.useCallback(
      (updater: Updater<VisibilityState>) => {
        const nextValue = resolveUpdater(updater, columnVisibility);
        if (onColumnVisibilityChange) {
          onColumnVisibilityChange(nextValue);
        } else {
          setColumnVisibilityState(nextValue);
        }
      },
      [columnVisibility, onColumnVisibilityChange]
    ),
    onColumnOrderChange: React.useCallback(
      (updater: Updater<ColumnOrderState>) => {
        let nextValue = resolveUpdater(updater, columnOrder);

        // Ensure "select" column is always first and cannot be reordered
        if (nextValue.includes("select")) {
          nextValue = ["select", ...nextValue.filter((id) => id !== "select")];
        }

        if (onColumnOrderChange) {
          onColumnOrderChange(nextValue);
        } else {
          setColumnOrderState(nextValue);
        }
      },
      [columnOrder, onColumnOrderChange]
    ),
    onRowSelectionChange: React.useCallback(
      (updater: Updater<RowSelectionState>) => {
        const nextValue = resolveUpdater(updater, rowSelection);
        if (onRowSelectionChange) {
          onRowSelectionChange(nextValue);
        } else {
          setRowSelectionState(nextValue);
        }
      },
      [rowSelection, onRowSelectionChange]
    ),
    globalFilterFn: enableGlobalSearch ? globalSearchFn : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: enableGlobalSearch ? getFilteredRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  const columnCount =
    table.getVisibleLeafColumns().length || columns.length || 1;

  const toolbarCtx = React.useMemo(
    () => ({
      table,
      columnVisibility,
      columnOrder,
    }),
    [table, columnVisibility, columnOrder]
  );

  const renderSearchInput = toolbar?.search ? (
    <div className=" min-w-[250px] shrink-0 sm:min-w-96 w-full">
      <Input
        placeholder={toolbar.search.placeholder ?? "Search"}
        className={cn(
          "w-full text-xs rounded-sm border-black/5 dark:border-white/5 bg-background",
          toolbar.search.inputClassName
        )}
        value={searchInputValue}
        onChange={(event) => setSearchInputValue(event.currentTarget.value)}
      />
    </div>
  ) : null;

  const hasToolbar =
    toolbar?.filters || toolbar?.sort || toolbar?.view || toolbar?.search;

  const hasRows = table.getRowModel().rows.length > 0;

  React.useEffect(() => {
    if (!toolbar?.search) return;
    if (searchInputValue === globalFilter) return;
    const debounceMs = toolbar.search.debounceMs ?? 300;
    if (debounceMs <= 0) {
      table.setGlobalFilter(searchInputValue);
      return;
    }
    const timeout = window.setTimeout(() => {
      table.setGlobalFilter(searchInputValue);
    }, debounceMs);
    return () => window.clearTimeout(timeout);
  }, [globalFilter, searchInputValue, table, toolbar?.search]);

  return (
    <div className={cn(" max-w-screen w-full", className)}>
      {hasToolbar && (
        <div className="flex items-center justify-between px-6 w-full min-w-0 flex-wrap gap-4">
          <div className="flex items-center gap-2 min-w-0 w-full">
            {toolbar?.filters?.(toolbarCtx)}
            {toolbar?.sort?.(toolbarCtx)}
            {toolbar?.view?.(toolbarCtx)}
          </div>

          {renderSearchInput}
        </div>
      )}

      <div className="border-y border-black/5 dark:border-white/5 overflow-x-auto w-full max-w-screen">
        <UiTable className="w-max min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-xs font-normal text-primary/80 dark:text-white/40 border-b border-black/5 whitespace-nowrap",
                      header.column.id === "select" ? "p-6 px-6" : "p-6"
                    )}
                    style={
                      header.column.id === "select"
                        ? { width: "40px", minWidth: "40px", maxWidth: "40px" }
                        : { minWidth: "150px" }
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              skeletonRowKeys.map((key) => (
                <TableRow key={key}>
                  <TableCell colSpan={columnCount}>
                    <Skeleton className="h-16 rounded-sm w-full bg-primary-foreground border-black/5 dark:border-white/5" />
                  </TableCell>
                </TableRow>
              ))
            ) : hasRows ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    "h-14 text-xs hover:bg-primary-foreground/50 hover:text-black border-y border-black/5",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.id === "select" ? "p-6 px-6" : "p-6 py-6"
                      )}
                      style={
                        cell.column.id === "select"
                          ? {
                              width: "40px",
                              minWidth: "40px",
                              maxWidth: "40px",
                            }
                          : { minWidth: "150px" }
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  {emptyState ?? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-primary/80 dark:text-white/50">
                      No results found.
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </UiTable>
      </div>

      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={pagination.pageSizeOptions}
        />
      )}
    </div>
  );
}
