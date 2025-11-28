"use client";

import { useQueryStates, parseAsString, parseAsArrayOf, parseAsInteger } from "nuqs";

export type TimesheetParams = {
  search?: string;
  workers?: string[];
  deals?: string[];
  statuses?: string[];
  startDate?: string;
  endDate?: string;
  durationMin?: number | null;
  durationMax?: number | null;
  amountMin?: number | null;
  amountMax?: number | null;
  sort?: string;
  hiddenColumns?: string[];
};

export function useTimesheetParams() {
  return useQueryStates(
    {
      search: parseAsString.withDefault(""),
      workers: parseAsArrayOf(parseAsString).withDefault([]),
      deals: parseAsArrayOf(parseAsString).withDefault([]),
      statuses: parseAsArrayOf(parseAsString).withDefault([]),
      startDate: parseAsString.withDefault(""),
      endDate: parseAsString.withDefault(""),
      durationMin: parseAsInteger,
      durationMax: parseAsInteger,
      amountMin: parseAsInteger,
      amountMax: parseAsInteger,
      sort: parseAsString.withDefault("date.desc"),
      hiddenColumns: parseAsArrayOf(parseAsString).withDefault([]),
    },
    {
      history: "push",
      shallow: true,
    }
  );
}
