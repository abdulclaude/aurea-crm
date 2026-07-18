"use client";

import type { ColumnDef, ColumnOrderState, VisibilityState } from "@tanstack/react-table";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import {
  StudioTableToolbar,
  type FilterGroup,
} from "@/features/studio/components/studio-table-toolbar";

type WaiverDataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyLabel: string;
  filterGroups?: FilterGroup[];
  getRowId: (row: TData) => string;
  initialColumnOrder: string[];
  isLoading?: boolean;
  primaryColumnId: string;
  searchPlaceholder: string;
};

export function WaiverDataTable<TData>({
  columns,
  data,
  emptyLabel,
  filterGroups = [],
  getRowId,
  initialColumnOrder,
  isLoading,
  primaryColumnId,
  searchPlaceholder,
}: WaiverDataTableProps<TData>) {
  const [search, setSearch] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(initialColumnOrder);

  return (
    <DataTable<TData, unknown>
      columns={columns}
      data={data}
      getRowId={getRowId}
      isLoading={isLoading}
      globalFilterValue={search}
      onGlobalFilterChange={setSearch}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      initialColumnOrder={initialColumnOrder}
      emptyState={
        <div className="flex justify-center py-12 text-xs text-primary/50">
          {emptyLabel}
        </div>
      }
      toolbar={{
        filters: (context) => (
          <StudioTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={searchPlaceholder}
            filterGroups={filterGroups}
            table={context.table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            initialColumnOrder={initialColumnOrder}
            primaryColumnId={primaryColumnId}
          />
        ),
      }}
    />
  );
}
