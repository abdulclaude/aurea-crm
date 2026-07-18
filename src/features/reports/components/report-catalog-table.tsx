"use client";

import type {
  ColumnOrderState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ReportCatalogItem } from "@/features/reports/types";

import { getReportCatalogColumns } from "./report-catalog-columns";
import {
  getTotalPages,
  paginateItems,
  REPORT_PAGE_SIZE_OPTIONS,
} from "./report-pagination";
import { ReportCatalogToolbar } from "./report-catalog-toolbar";
import {
  getCatalogFilterOptions,
  matchesReportCatalogFilters,
  matchesReportCatalogSearch,
  sortReportCatalogItems,
} from "./report-catalog-table-utils";
import type { ReportFilterState } from "./report-table-types";

type ReportCatalogTableProps = {
  reports: readonly ReportCatalogItem[];
  getReportHref?: (report: ReportCatalogItem) => string;
};

export function ReportCatalogTable({
  reports,
  getReportHref,
}: ReportCatalogTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const initialColumnOrder = useMemo<ColumnOrderState>(
    () =>
      getReportHref
        ? ["name", "groupId", "category", "actions"]
        : ["name", "groupId", "category"],
    [getReportHref],
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    useState<ColumnOrderState>(initialColumnOrder);
  const [selectedFilters, setSelectedFilters] = useState<ReportFilterState>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const columnLabels = useMemo(
    () => ({
      actions: "Open",
      category: "Category",
      groupId: "Group",
      name: "Report",
    }),
    [],
  );
  const filterOptions = useMemo(
    () => getCatalogFilterOptions(reports),
    [reports],
  );
  const filteredReports = useMemo(
    () =>
      sortReportCatalogItems(
        reports.filter(
          (report) =>
            matchesReportCatalogSearch(report, search) &&
            matchesReportCatalogFilters(report, selectedFilters),
        ),
        sorting,
      ),
    [reports, search, selectedFilters, sorting],
  );
  const totalPages = getTotalPages(filteredReports.length, pageSize);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedReports = useMemo(
    () => paginateItems(filteredReports, safeCurrentPage, pageSize),
    [filteredReports, pageSize, safeCurrentPage],
  );
  const columns = useMemo(
    () => getReportCatalogColumns(getReportHref),
    [getReportHref],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, reports, search, selectedFilters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <DataTable
      columns={columns}
      data={paginatedReports}
      getRowId={(report) => report.id}
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
      initialSorting={[{ id: "name", desc: false }]}
      onRowClick={
        getReportHref
          ? (report) => {
              router.push(getReportHref(report));
            }
          : undefined
      }
      toolbar={{
        filters: (ctx) => (
          <ReportCatalogToolbar
            columnLabels={columnLabels}
            columnOrder={columnOrder}
            columnVisibility={columnVisibility}
            filters={filterOptions}
            initialColumnOrder={initialColumnOrder}
            onColumnOrderChange={setColumnOrder}
            onFiltersChange={setSelectedFilters}
            onSearchChange={setSearch}
            onSortingChange={setSorting}
            previewCount={filteredReports.length}
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
        totalItems: filteredReports.length,
        onPageChange: setCurrentPage,
        onPageSizeChange: setPageSize,
        pageSizeOptions: [...REPORT_PAGE_SIZE_OPTIONS],
      }}
      emptyState={
        <Empty className="border-0 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ExternalLink className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No reports found</EmptyTitle>
            <EmptyDescription>
              Adjust the group, category, or search term to see more reports.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
