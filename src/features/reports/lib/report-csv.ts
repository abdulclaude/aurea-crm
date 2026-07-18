import {
  currencyExponent,
  decimalToMinorUnits,
  minorUnitsToDecimal,
} from "@/features/commerce/lib/money";
import type { ReportDataRow, ReportField } from "@/features/reports/types";

export function buildReportCsv(input: {
  rows: readonly ReportDataRow[];
  fields: readonly ReportField[];
  currency: string;
  timezone: string;
}): string {
  const exponent = currencyExponent(input.currency);
  const headers = input.fields.map((field) => {
    if (field.type === "Currency") return `${field.name} (${input.currency})`;
    if (field.type === "Date") return `${field.name} (${input.timezone})`;
    return field.name;
  });
  const rows = input.rows.map((row) =>
    input.fields.map((field) => {
      const value = row[field.id] ?? null;
      if (value === null) return "";
      if (field.type !== "Currency") return String(value);
      const minor = decimalToMinorUnits(String(value), exponent);
      return minorUnitsToDecimal(minor, exponent);
    }),
  );
  const headerLine = headers.map((value) => escapeCsvCell(value, false));
  const dataLines = rows.map((row) =>
    row.map((value, index) => {
      const field = input.fields[index];
      const guardFormula = field?.type === "Text" || field?.type === "Status";
      return escapeCsvCell(value, guardFormula);
    }),
  );
  return [headerLine, ...dataLines].map((row) => row.join(",")).join("\n");
}

export function buildPlainCsv(rows: readonly (readonly string[])[]): string {
  return rows
    .map((row) => row.map((value) => escapeCsvCell(value, true)).join(","))
    .join("\n");
}

function escapeCsvCell(value: string, guardFormula: boolean): string {
  const guarded =
    guardFormula && /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${guarded.replaceAll('"', '""')}"`;
}
