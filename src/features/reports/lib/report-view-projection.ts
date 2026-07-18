import type { SortingState } from "@tanstack/react-table";

import type {
  ReportDataRow,
  ReportDataValue,
  ReportField,
} from "@/features/reports/types";

import type { ReportViewDefinition } from "../contracts";

export function projectReportRows(input: {
  rows: readonly ReportDataRow[];
  fields: readonly ReportField[];
  definition: ReportViewDefinition;
}): ReportDataRow[] {
  const dateField = input.definition.dateRange
    ? input.fields.find(
        (field) =>
          field.id === input.definition.dateRange?.fieldId &&
          field.type === "Date",
      )
    : undefined;

  return sortRows(
    input.rows.filter((row) => {
      return (
        matchesSearch(row, input.definition.search) &&
        matchesFilters(row, input.definition.filters) &&
        matchesDate(row, dateField, input.definition.dateRange)
      );
    }),
    input.fields,
    input.definition.sorting,
  );
}

export function visibleReportFields(
  fields: readonly ReportField[],
  definition: ReportViewDefinition,
): ReportField[] {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const ordered = definition.columnOrder
    .map((id) => byId.get(id))
    .filter((field): field is ReportField => Boolean(field));
  const omitted = fields.filter(
    (field) => !definition.columnOrder.includes(field.id),
  );

  return [...ordered, ...omitted].filter(
    (field) => definition.columnVisibility[field.id] !== false,
  );
}

function matchesSearch(row: ReportDataRow, search: string): boolean {
  const query = search.toLocaleLowerCase("en-GB").trim();
  if (!query) return true;
  return Object.values(row).some((value) =>
    String(value ?? "")
      .toLocaleLowerCase("en-GB")
      .includes(query),
  );
}

function matchesFilters(
  row: ReportDataRow,
  filters: Readonly<Record<string, readonly string[]>>,
): boolean {
  return Object.entries(filters).every(([fieldId, values]) => {
    return values.length === 0 || values.includes(String(row[fieldId] ?? ""));
  });
}

function matchesDate(
  row: ReportDataRow,
  dateField: ReportField | undefined,
  range: ReportViewDefinition["dateRange"],
): boolean {
  if (!dateField || !range) return true;
  const date = parseReportDate(row[dateField.id] ?? null);
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

function sortRows(
  rows: readonly ReportDataRow[],
  fields: readonly ReportField[],
  sorting: SortingState,
): ReportDataRow[] {
  const active = sorting[0];
  if (!active) return [...rows];
  const field = fields.find((item) => item.id === active.id);
  if (!field) return [...rows];
  const direction = active.desc ? -1 : 1;

  return [...rows].sort(
    (first, second) =>
      compareReportValues(first[field.id], second[field.id], field) * direction,
  );
}

export function compareReportValues(
  first: ReportDataValue,
  second: ReportDataValue,
  field: ReportField,
): number {
  if (first === second) return 0;
  if (first === null || first === undefined) return 1;
  if (second === null || second === undefined) return -1;
  if (field.type === "Currency") {
    return compareDecimalStrings(String(first), String(second));
  }
  if (["Number", "Percent"].includes(field.type)) {
    return Number(first) - Number(second);
  }
  if (field.type === "Date") {
    return String(first).localeCompare(String(second));
  }
  return String(first).localeCompare(String(second), "en-GB", {
    numeric: true,
    sensitivity: "base",
  });
}

function compareDecimalStrings(first: string, second: string): number {
  const firstDecimal = parseDecimal(first);
  const secondDecimal = parseDecimal(second);
  if (!firstDecimal || !secondDecimal) {
    return first.localeCompare(second, "en-GB", { numeric: true });
  }
  if (firstDecimal.sign !== secondDecimal.sign) {
    return firstDecimal.sign < secondDecimal.sign ? -1 : 1;
  }
  const magnitude = compareMagnitude(firstDecimal, secondDecimal);
  return firstDecimal.sign < 0 ? -magnitude : magnitude;
}

function parseDecimal(value: string): {
  sign: -1 | 1;
  whole: string;
  fraction: string;
} | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match?.[2]) return null;
  const whole = match[2].replace(/^0+(?=\d)/, "");
  const fraction = (match[3] ?? "").replace(/0+$/, "");
  const zero = whole === "0" && fraction === "";
  return { sign: match[1] === "-" && !zero ? -1 : 1, whole, fraction };
}

function compareMagnitude(
  first: { whole: string; fraction: string },
  second: { whole: string; fraction: string },
): number {
  if (first.whole.length !== second.whole.length) {
    return first.whole.length < second.whole.length ? -1 : 1;
  }
  if (first.whole !== second.whole) {
    return first.whole < second.whole ? -1 : 1;
  }
  const length = Math.max(first.fraction.length, second.fraction.length);
  const firstFraction = first.fraction.padEnd(length, "0");
  const secondFraction = second.fraction.padEnd(length, "0");
  if (firstFraction === secondFraction) return 0;
  return firstFraction < secondFraction ? -1 : 1;
}

function parseReportDate(value: ReportDataValue): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(text);
  if (dateOnly) return text;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
