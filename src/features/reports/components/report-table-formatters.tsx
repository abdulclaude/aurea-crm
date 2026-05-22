"use client";

import { format, isValid } from "date-fns";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { ReportDataValue, ReportField } from "@/features/reports/types";
import { cn } from "@/lib/utils";

export function parseReportDate(value: ReportDataValue): Date | null {
  if (value === null) return null;

  const text = String(value);
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(text);
  return isValid(date) ? date : null;
}

export function renderReportValue(
  field: ReportField,
  value: ReportDataValue,
): ReactNode {
  if (value === null || value === undefined || String(value).trim() === "") {
    return <span className="text-xs text-primary/45">-</span>;
  }

  if (field.type === "Status") return renderStatusBadge(value);
  if (field.type === "Date") {
    return (
      <span className="text-xs text-primary/80">{formatReportDate(value)}</span>
    );
  }
  if (field.type === "Currency") return renderFinancialValue(Number(value), value);
  if (field.type === "Percent") return renderPercentValue(Number(value), value);
  if (field.type === "Number") return renderNumberValue(Number(value), value);

  return <span className="text-xs text-primary/80">{String(value)}</span>;
}

function renderFinancialValue(amount: number, fallback: ReportDataValue): ReactNode {
  return (
    <span className={cn("text-xs font-medium", getFinancialClass(amount))}>
      {Number.isFinite(amount) ? formatCurrency(amount) : String(fallback)}
    </span>
  );
}

function renderPercentValue(percent: number, fallback: ReportDataValue): ReactNode {
  return (
    <span className={cn("text-xs font-medium", getFinancialClass(percent))}>
      {Number.isFinite(percent) ? `${formatNumber(percent)}%` : String(fallback)}
    </span>
  );
}

function renderNumberValue(number: number, fallback: ReportDataValue): ReactNode {
  return (
    <span className="text-xs text-primary/80">
      {Number.isFinite(number) ? formatNumber(number) : String(fallback)}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    style: "currency",
  }).format(value);
}

function formatReportDate(value: ReportDataValue): string {
  const date = parseReportDate(value);
  return date ? format(date, "MMM do, yyyy") : "-";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
  }).format(value);
}

function renderStatusBadge(value: ReportDataValue): ReactNode {
  if (value === null) {
    return <span className="text-xs text-primary/45">-</span>;
  }

  const status = String(value);
  const label = status.replaceAll("_", " ").toLowerCase();

  return (
    <Badge
      variant="outline"
      className={cn("w-fit text-[11px] capitalize", getStatusBadgeClass(status))}
    >
      {label}
    </Badge>
  );
}

function getFinancialClass(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "text-primary/70";

  return value < 0
    ? "text-rose-600 dark:text-rose-400"
    : "text-teal-600 dark:text-teal-400";
}

function getStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase().replaceAll(" ", "_");

  if (
    ["ACTIVE", "APPROVED", "COMPLETED", "CUSTOMER", "OPEN", "SETTLED", "SUCCEEDED"].includes(
      normalized,
    )
  ) {
    return "ring-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300";
  }

  if (
    ["BOOKED", "IN_PROGRESS", "LEAD", "PENDING", "PROCESSING", "PROSPECT", "SCHEDULED"].includes(
      normalized,
    )
  ) {
    return "ring-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (
    ["CANCELLED", "CHURN", "EXPIRED", "FAILED", "NO_SHOW", "REFUNDED", "REJECTED", "VOIDED"].includes(
      normalized,
    )
  ) {
    return "ring-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  return "ring-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}
