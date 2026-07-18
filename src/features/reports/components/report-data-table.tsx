"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnOrderState } from "@tanstack/react-table";
import { useMemo } from "react";

import { DataTable } from "@/components/data-table/data-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type {
  ReportDataRow,
  ReportField,
  ReportGroupId,
} from "@/features/reports/types";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";

import { REPORT_PAGE_SIZE_OPTIONS } from "./report-pagination";
import { ReportTableToolbar } from "./report-table-toolbar";
import { ReportDataHealthBar } from "./report-data-health-bar";
import { renderReportValue } from "./report-table-formatters";
import { ReportTableActions } from "./report-table-actions";
import { getUniqueValues } from "./report-table-utils";
import { useReportTableState } from "./use-report-table-state";

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
  const rowsQuery = useQuery(
    trpc.reports.rows.queryOptions({ groupId, reportId }),
  );
  const health = useQuery(
    trpc.reportFoundation.dataHealth.queryOptions({ groupId, reportId }),
  );
  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const rows = rowsQuery.data?.rows ?? [];
  const sourceLimitReached = rowsQuery.data?.sourceLimitReached ?? false;
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
  const state = useReportTableState({
    fields,
    groupId,
    initialColumnOrder,
    primaryColumnId,
    reportId,
    rows,
  });
  const canManage =
    permissions.data?.capabilities.includes("reports.manage") ?? false;
  const canExport =
    permissions.data?.capabilities.includes("reports.export") ?? false;
  const activeSavedViewId =
    state.activeView &&
    JSON.stringify(state.activeView.definition) ===
      JSON.stringify(state.currentDefinition)
      ? state.activeView.id
      : null;

  const columns = useMemo<ColumnDef<ReportDataRow>[]>(
    () =>
      fields.map((field) => ({
        id: field.id,
        accessorFn: (row) => row[field.id],
        header: field.name,
        enableHiding: field.id !== primaryColumnId,
        cell: ({ row }) => (
          <div className="min-w-0">
            {renderReportValue(
              field,
              row.original[field.id] ?? null,
              typeof row.original.currency === "string"
                ? row.original.currency
                : health.data?.currency,
              health.data?.locale,
              health.data?.dateFormat,
            )}
          </div>
        ),
      })),
    [
      fields,
      health.data?.currency,
      health.data?.dateFormat,
      health.data?.locale,
      primaryColumnId,
    ],
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
  return (
    <>
      <ReportDataHealthBar
        groupId={groupId}
        reportId={reportId}
        sourceLimitReached={sourceLimitReached}
      />
      <DataTable
        columns={columns}
        data={state.paginatedRows}
        isLoading={rowsQuery.isLoading}
        getRowId={(_row, index) =>
          `${reportName}-${state.currentPage}-${index}`
        }
        enableGlobalSearch={false}
        globalFilterValue={state.search}
        onGlobalFilterChange={state.setSearch}
        sorting={state.sorting}
        onSortingChange={state.setSorting}
        columnVisibility={state.columnVisibility}
        onColumnVisibilityChange={state.setColumnVisibility}
        columnOrder={state.columnOrder}
        onColumnOrderChange={state.setColumnOrder}
        initialColumnOrder={initialColumnOrder}
        initialSorting={[{ id: primaryColumnId, desc: false }]}
        toolbar={{
          filters: (ctx) => (
            <ReportTableToolbar
              actions={
                <ReportTableActions
                  activeViewId={state.activeView?.id ?? null}
                  canExport={canExport}
                  canManage={canManage}
                  definition={state.currentDefinition}
                  groupId={groupId}
                  onApply={state.applySavedView}
                  reportId={reportId}
                  savedViewId={activeSavedViewId}
                />
              }
              columnLabels={columnLabels}
              columnOrder={state.columnOrder}
              columnVisibility={state.columnVisibility}
              dateFilter={state.dateFilter}
              filters={filterOptions}
              initialColumnOrder={initialColumnOrder}
              onColumnOrderChange={state.setColumnOrder}
              onFiltersChange={state.setSelectedFilters}
              onSearchChange={state.setSearch}
              onSortingChange={state.setSorting}
              previewCount={state.filteredRows.length}
              previewIsPartial={sourceLimitReached}
              primaryColumnId={primaryColumnId}
              search={state.search}
              selectedFilters={state.selectedFilters}
              sorting={state.sorting}
              table={ctx.table}
            />
          ),
        }}
        pagination={{
          currentPage: state.currentPage,
          totalPages: state.totalPages,
          pageSize: state.pageSize,
          totalItems: state.sortedRows.length,
          onPageChange: state.setCurrentPage,
          onPageSizeChange: state.setPageSize,
          pageSizeOptions: [...REPORT_PAGE_SIZE_OPTIONS],
        }}
        emptyState={
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyTitle className="text-sm">
                {rowsQuery.isError
                  ? "Report data unavailable"
                  : "No report data found"}
              </EmptyTitle>
              <EmptyDescription className="text-xs">
                {rowsQuery.isError
                  ? rowsQuery.error.message
                  : `${reportName} uses this location's clients, instructors, revenue, inventory, and booking data.`}
              </EmptyDescription>
              {rowsQuery.isError ? (
                <EmptyContent>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void rowsQuery.refetch()}
                  >
                    Retry
                  </Button>
                </EmptyContent>
              ) : null}
            </EmptyHeader>
          </Empty>
        }
      />
    </>
  );
}
