"use client";

import { useEffect, useMemo, useState } from "react";

import type { ReportDataRow, ReportField } from "@/features/reports/types";

import type { ReportDateFilter } from "./report-table-types";
import {
  getDateBounds,
  isSameReportDay,
  type ReportDateBounds,
} from "./report-table-utils";

type DateRange = {
  start: Date;
  end: Date;
};

export function useReportDateFilter(
  rows: readonly ReportDataRow[],
  fields: readonly ReportField[],
): {
  dateBounds: ReportDateBounds | null;
  dateFilter: ReportDateFilter | undefined;
  dateRange: DateRange | null;
} {
  const dateBounds = useMemo(() => getDateBounds(rows, fields), [fields, rows]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  useEffect(() => {
    if (!dateBounds) {
      setDateRange(null);
      return;
    }

    setDateRange((previous) => {
      if (
        !previous ||
        previous.start < dateBounds.minDate ||
        previous.end > dateBounds.maxDate ||
        previous.start > previous.end
      ) {
        return { start: dateBounds.minDate, end: dateBounds.maxDate };
      }

      return previous;
    });
  }, [dateBounds]);

  const dateFilter = useMemo<ReportDateFilter | undefined>(() => {
    if (!dateBounds || !dateRange) return undefined;

    return {
      fieldId: dateBounds.field.id,
      isActive:
        !isSameReportDay(dateRange.start, dateBounds.minDate) ||
        !isSameReportDay(dateRange.end, dateBounds.maxDate),
      label: dateBounds.field.name,
      maxDate: dateBounds.maxDate,
      minDate: dateBounds.minDate,
      onChange: (start, end) => setDateRange({ start, end }),
      valueEnd: dateRange.end,
      valueStart: dateRange.start,
    };
  }, [dateBounds, dateRange]);

  return { dateBounds, dateFilter, dateRange };
}
