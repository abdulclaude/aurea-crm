import type { WidgetComparisonMode } from "@/stores/dashboard-comparison";

export type DateRange = { start: Date; end: Date };

export function countRangeDays(range: DateRange) {
  const s = new Date(range.start);
  const e = new Date(range.end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((+e - +s) / 86_400_000) + 1);
}

export function getComparisonRange(
  mode: WidgetComparisonMode,
  range: DateRange,
): DateRange | null {
  if (mode === "none") return null;
  const days = countRangeDays(range);
  const start = new Date(range.start);
  const end = new Date(range.end);
  start.setDate(start.getDate() - days);
  end.setDate(end.getDate() - days);
  return { start, end };
}

export function formatRangeLabel(range: DateRange) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

type CalendarDurationPart = {
  value: number;
  singular: string;
  plural: string;
};

function pluralize({ value, singular, plural }: CalendarDurationPart): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);

  if (next.getDate() !== day) {
    next.setDate(0);
  }

  return next;
}

export function formatRangeDurationLabel(range: DateRange): string {
  const days = countRangeDays(range);
  if (days <= 45) {
    return days === 1 ? "1 day" : `${days} days`;
  }

  const start = new Date(range.start);
  const end = new Date(range.end);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    end.getMonth() -
    start.getMonth();

  if (addMonths(start, totalMonths) > end) {
    totalMonths--;
  }

  const anchor = addMonths(start, Math.max(0, totalMonths));
  const remainingDays = Math.max(
    0,
    Math.round((end.getTime() - anchor.getTime()) / 86_400_000),
  );
  const years = Math.floor(Math.max(0, totalMonths) / 12);
  const months = Math.max(0, totalMonths) % 12;

  const parts = [
    years > 0
      ? pluralize({ value: years, singular: "year", plural: "years" })
      : null,
    months > 0
      ? pluralize({ value: months, singular: "month", plural: "months" })
      : null,
    remainingDays > 0
      ? pluralize({ value: remainingDays, singular: "day", plural: "days" })
      : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(" ") : `${days} days`;
}

export function formatPreviousRangeLabel(range: DateRange): string {
  return `Previous ${formatRangeDurationLabel(range)}`;
}
