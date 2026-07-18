import type { SortingState } from "@tanstack/react-table";

import type { ReportDataRow, ReportField } from "@/features/reports/types";

import { parseReportDate } from "./report-table-formatters";
import type { ReportFilterState } from "./report-table-types";
import { compareReportValues } from "@/features/reports/lib/report-view-projection";

export type ReportDateBounds = {
  field: ReportField;
  maxDate: Date;
  minDate: Date;
};

export function getUniqueValues(
  rows: readonly ReportDataRow[],
  fieldId: string,
): readonly string[] {
  const values = new Set<string>();

  for (const row of rows) {
    const value = row[fieldId];
    if (value !== null && value !== undefined && String(value).trim()) {
      values.add(String(value));
    }
  }

  return Array.from(values).sort().slice(0, 50);
}

export function matchesReportSearch(
  row: ReportDataRow,
  search: string,
): boolean {
  const query = search.toLocaleLowerCase("en-GB").trim();
  if (!query) return true;

  return Object.values(row).some((value) =>
    String(value ?? "")
      .toLocaleLowerCase("en-GB")
      .includes(query),
  );
}

export function sortReportRows(
  rows: readonly ReportDataRow[],
  fields: readonly ReportField[],
  sorting: SortingState,
): ReportDataRow[] {
  const activeSort = sorting[0];
  if (!activeSort) return [...rows];

  const field = fields.find((item) => item.id === activeSort.id);
  if (!field) return [...rows];

  return [...rows].sort((first, second) => {
    const direction = activeSort.desc ? -1 : 1;
    return (
      compareReportValues(first[field.id], second[field.id], field) * direction
    );
  });
}

export function getDateBounds(
  rows: readonly ReportDataRow[],
  fields: readonly ReportField[],
): ReportDateBounds | null {
  for (const field of fields) {
    if (field.type !== "Date") continue;

    const dates = rows
      .map((row) => parseReportDate(row[field.id] ?? null))
      .filter((date): date is Date => date !== null);

    if (dates.length === 0) continue;

    return {
      field,
      maxDate: new Date(Math.max(...dates.map((date) => date.getTime()))),
      minDate: new Date(Math.min(...dates.map((date) => date.getTime()))),
    };
  }

  return null;
}

export function matchesDateRange(
  row: ReportDataRow,
  dateBounds: ReportDateBounds | null,
  dateRange: { start: Date; end: Date } | null,
): boolean {
  if (!dateBounds || !dateRange) return true;

  const date = parseReportDate(row[dateBounds.field.id] ?? null);
  if (!date) return false;

  return (
    date >= startOfReportDay(dateRange.start) &&
    date <= endOfReportDay(dateRange.end)
  );
}

export function matchesSelectedFilters(
  row: ReportDataRow,
  filters: ReportFilterState,
): boolean {
  return Object.entries(filters).every(([fieldId, selectedValues]) => {
    if (selectedValues.length === 0) return true;
    return selectedValues.includes(String(row[fieldId] ?? ""));
  });
}

export function isSameReportDay(first: Date, second: Date): boolean {
  return (
    startOfReportDay(first).getTime() === startOfReportDay(second).getTime()
  );
}

function startOfReportDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfReportDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}
