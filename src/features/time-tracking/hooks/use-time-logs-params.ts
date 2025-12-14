"use client";

import { useQueryStates, parseAsString, parseAsArrayOf, parseAsInteger } from "nuqs";

export type TimeLogsParams = {
  page: number;
  pageSize: number;
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

export function useTimeLogsParams() {
  return useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(20),
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
