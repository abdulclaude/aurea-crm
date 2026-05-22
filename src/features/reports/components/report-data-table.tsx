"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { ReportDataRow, ReportField, ReportGroupId } from "@/features/reports/types";
import { useTRPC } from "@/trpc/client";

import {
  getTotalPages,
  paginateItems,
  REPORT_PAGE_SIZE_OPTIONS,
} from "./report-pagination";
import { ReportTableToolbar } from "./report-table-toolbar";
import { renderReportValue } from "./report-table-formatters";
import type { ReportFilterState } from "./report-table-types";
import {
  getUniqueValues,
  matchesReportSearch,
  matchesDateRange,
  matchesSelectedFilters,
  sortReportRows,
} from "./report-table-utils";
import { useReportDateFilter } from "./use-report-date-filter";

type ReportDataTableProps = {
  fields: readonly ReportField[];
  groupId: ReportGroupId;
  reportId: string;
  reportName: string;
};

export function ReportDataTable({
  fields,
  groupId,
  reportId,
  reportName,
}: ReportDataTableProps) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.reports.rows.queryOptions({ groupId, reportId }),
  );
  const rows = data?.rows ?? [];
  const primaryColumnId = fields[0]?.id ?? "report";
  const initialColumnOrder = useMemo<ColumnOrderState>(
    () => fields.map((field) => field.id),
    [fields],
  );
  const columnLabels = useMemo(
    () =>
      Object.fromEntries(
        fields.map((field) => [field.id, field.name] as const),
      ),
    [fields],
  );
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: primaryColumnId, desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    useState<ColumnOrderState>(initialColumnOrder);
  const [selectedFilters, setSelectedFilters] = useState<ReportFilterState>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { dateBounds, dateFilter, dateRange } = useReportDateFilter(rows, fields);

  const columns = useMemo<ColumnDef<ReportDataRow>[]>(
    () =>
      fields.map((field) => ({
        id: field.id,
        accessorFn: (row) => row[field.id],
        header: field.name,
        enableHiding: field.id !== primaryColumnId,
        cell: ({ row }) => (
          <div className="min-w-0">
            {renderReportValue(field, row.original[field.id] ?? null)}
          </div>
        ),
      })),
    [fields, primaryColumnId],
  );
  const filterOptions = useMemo(
    () =>
      fields
        .filter((field) => field.type !== "Date")
        .map((field) => ({
          fieldId: field.id,
          label: field.name,
          values: getUniqueValues(rows, field.id),
        }))
        .filter((filter) => filter.values.length > 0),
    [fields, rows],
  );
  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          matchesDateRange(row, dateBounds, dateRange) &&
          matchesSelectedFilters(row, selectedFilters) &&
          matchesReportSearch(row, search),
      ),
    [dateBounds, dateRange, rows, search, selectedFilters],
  );
  const sortedRows = useMemo(
    () => sortReportRows(filteredRows, fields, sorting),
    [fields, filteredRows, sorting],
  );
  const totalPages = getTotalPages(sortedRows.length, pageSize);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(
    () => paginateItems(sortedRows, safeCurrentPage, pageSize),
    [pageSize, safeCurrentPage, sortedRows],
  );
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, groupId, pageSize, reportId, search, selectedFilters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <DataTable
      columns={columns}
      data={paginatedRows}
      isLoading={isLoading}
      getRowId={(_row, index) => `${reportName}-${safeCurrentPage}-${index}`}
      enableGlobalSearch={false}
      globalFilterValue={search}
      onGlobalFilterChange={setSearch}
      sorting={sorting}
      onSortingChange={setSorting}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      initialColumnOrder={initialColumnOrder}
      initialSorting={[{ id: primaryColumnId, desc: false }]}
      toolbar={{
        filters: (ctx) => (
          <ReportTableToolbar
            columnLabels={columnLabels}
            columnOrder={columnOrder}
            columnVisibility={columnVisibility}
            dateFilter={dateFilter}
            filters={filterOptions}
            initialColumnOrder={initialColumnOrder}
            onColumnOrderChange={setColumnOrder}
            onFiltersChange={setSelectedFilters}
            onSearchChange={setSearch}
            onSortingChange={setSorting}
            previewCount={filteredRows.length}
            primaryColumnId={primaryColumnId}
            search={search}
            selectedFilters={selectedFilters}
            sorting={sorting}
            table={ctx.table}
          />
        ),
      }}
      pagination={{
        currentPage: safeCurrentPage,
        totalPages,
        pageSize,
        totalItems: sortedRows.length,
        onPageChange: setCurrentPage,
        onPageSizeChange: setPageSize,
        pageSizeOptions: [...REPORT_PAGE_SIZE_OPTIONS],
      }}
      emptyState={
        <Empty className="border-0 py-10">
          <EmptyHeader>
            <EmptyTitle className="text-sm">No report data found</EmptyTitle>
            <EmptyDescription className="text-xs">
              {reportName} uses this location&apos;s clients, instructors, revenue, inventory, and booking data.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
