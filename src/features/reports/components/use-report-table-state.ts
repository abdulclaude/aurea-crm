"use client";

import type {
  ColumnOrderState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import type { ReportViewDefinition } from "@/features/reports/contracts";
import type {
  ReportDataRow,
  ReportField,
  ReportGroupId,
} from "@/features/reports/types";

import { getTotalPages, paginateItems } from "./report-pagination";
import type { ReportFilterState } from "./report-table-types";
import {
  matchesDateRange,
  matchesReportSearch,
  matchesSelectedFilters,
  sortReportRows,
} from "./report-table-utils";
import { useReportDateFilter } from "./use-report-date-filter";

export function useReportTableState(input: {
  fields: readonly ReportField[];
  groupId: ReportGroupId;
  initialColumnOrder: ColumnOrderState;
  primaryColumnId: string;
  reportId: string;
  rows: readonly ReportDataRow[];
}) {
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: input.primaryColumnId, desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    input.initialColumnOrder,
  );
  const [selectedFilters, setSelectedFilters] = useState<ReportFilterState>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeView, setActiveView] = useState<{
    id: string;
    definition: ReportViewDefinition;
  } | null>(null);
  const { applyDateRange, dateBounds, dateFilter, dateRange } =
    useReportDateFilter(input.rows, input.fields);

  const currentDefinition = useMemo<ReportViewDefinition>(
    () => ({
      version: 1,
      search,
      filters: selectedFilters,
      dateRange:
        dateBounds && dateRange && dateFilter?.isActive
          ? {
              fieldId: dateBounds.field.id,
              start: format(dateRange.start, "yyyy-MM-dd"),
              end: format(dateRange.end, "yyyy-MM-dd"),
            }
          : null,
      sorting: sorting.slice(0, 1).map((item) => ({
        id: item.id,
        desc: item.desc,
      })),
      columnOrder,
      columnVisibility,
      pageSize,
    }),
    [
      columnOrder,
      columnVisibility,
      dateBounds,
      dateFilter?.isActive,
      dateRange,
      pageSize,
      search,
      selectedFilters,
      sorting,
    ],
  );
  const filteredRows = useMemo(
    () =>
      input.rows.filter(
        (row) =>
          matchesDateRange(row, dateBounds, dateRange) &&
          matchesSelectedFilters(row, selectedFilters) &&
          matchesReportSearch(row, search),
      ),
    [dateBounds, dateRange, input.rows, search, selectedFilters],
  );
  const sortedRows = useMemo(
    () => sortReportRows(filteredRows, input.fields, sorting),
    [filteredRows, input.fields, sorting],
  );
  const totalPages = getTotalPages(sortedRows.length, pageSize);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(
    () => paginateItems(sortedRows, safeCurrentPage, pageSize),
    [pageSize, safeCurrentPage, sortedRows],
  );

  useEffect(
    () => setCurrentPage(1),
    [
      dateRange,
      input.groupId,
      input.reportId,
      pageSize,
      search,
      selectedFilters,
    ],
  );
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const applySavedView = (id: string, definition: ReportViewDefinition) => {
    setSearch(definition.search);
    setSorting(definition.sorting);
    setColumnOrder(
      definition.columnOrder.length > 0
        ? definition.columnOrder
        : input.initialColumnOrder,
    );
    setColumnVisibility(definition.columnVisibility);
    setSelectedFilters(definition.filters);
    setPageSize(definition.pageSize);
    applyDateRange(definition.dateRange);
    setActiveView({ id, definition });
  };

  return {
    activeView,
    applySavedView,
    columnOrder,
    columnVisibility,
    currentDefinition,
    currentPage: safeCurrentPage,
    dateFilter,
    filteredRows,
    pageSize,
    paginatedRows,
    search,
    selectedFilters,
    setColumnOrder,
    setColumnVisibility,
    setCurrentPage,
    setPageSize,
    setSearch,
    setSelectedFilters,
    setSorting,
    sortedRows,
    sorting,
    totalPages,
  };
}
