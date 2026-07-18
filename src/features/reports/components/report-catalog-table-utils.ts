import type { SortingState } from "@tanstack/react-table";

import {
  getReportGroupLabel,
  toReportSentenceCase,
} from "@/features/reports/helpers";
import type { ReportCatalogItem } from "@/features/reports/types";

import type {
  ReportFilterOption,
  ReportFilterState,
} from "./report-table-types";

export function matchesReportCatalogSearch(
  report: ReportCatalogItem,
  search: string,
): boolean {
  const query = search.toLocaleLowerCase("en-GB").trim();
  if (!query) return true;

  return [
    report.name,
    toReportSentenceCase(report.name),
    report.category,
    toReportSentenceCase(report.category),
    report.description,
    report.groupId,
    getReportGroupLabel(report.groupId),
  ].some((value) => value.toLocaleLowerCase("en-GB").includes(query));
}

export function matchesReportCatalogFilters(
  report: ReportCatalogItem,
  filters: ReportFilterState,
): boolean {
  return Object.entries(filters).every(([fieldId, selectedValues]) => {
    if (selectedValues.length === 0) return true;
    return selectedValues.includes(getCatalogFilterValue(report, fieldId));
  });
}

export function getCatalogFilterOptions(
  reports: readonly ReportCatalogItem[],
): readonly ReportFilterOption[] {
  return [
    {
      fieldId: "category",
      label: "Category",
      values: getUniqueValues(reports, "category"),
    },
    {
      fieldId: "groupId",
      label: "Group",
      values: getUniqueValues(reports, "groupId"),
    },
  ].filter((filter) => filter.values.length > 0);
}

export function sortReportCatalogItems(
  reports: readonly ReportCatalogItem[],
  sorting: SortingState,
): ReportCatalogItem[] {
  const activeSort = sorting[0] ?? { id: "name", desc: false };
  const direction = activeSort.desc ? -1 : 1;

  return [...reports].sort((first, second) => {
    const firstValue = getCatalogSortValue(first, activeSort.id);
    const secondValue = getCatalogSortValue(second, activeSort.id);

    return (
      firstValue.localeCompare(secondValue, "en-GB", {
        numeric: true,
        sensitivity: "base",
      }) * direction
    );
  });
}

function getCatalogSortValue(
  report: ReportCatalogItem,
  columnId: string,
): string {
  if (columnId === "category") return report.category;
  if (columnId === "groupId") return report.groupId;
  return report.name;
}

function getUniqueValues(
  reports: readonly ReportCatalogItem[],
  fieldId: string,
): readonly string[] {
  const values = new Set<string>();

  for (const report of reports) {
    values.add(getCatalogFilterValue(report, fieldId));
  }

  return Array.from(values).sort((first, second) =>
    first.localeCompare(second, "en-GB", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function getCatalogFilterValue(
  report: ReportCatalogItem,
  fieldId: string,
): string {
  if (fieldId === "category") return toReportSentenceCase(report.category);
  if (fieldId === "groupId") return getReportGroupLabel(report.groupId);
  return toReportSentenceCase(report.name);
}
