"use client";

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";

export type WorkersParams = {
  page: number;
  pageSize: number;
  search?: string;
  roles?: string[];
  isActive?: boolean | null;
  rateMin?: number | null;
  rateMax?: number | null;
  createdAfter?: string;
  createdBefore?: string;
  sort?: string;
  hiddenColumns?: string[];
};

export function useWorkersParams() {
  return useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(20),
      search: parseAsString.withDefault(""),
      roles: parseAsArrayOf(parseAsString).withDefault([]),
      isActive: parseAsBoolean,
      rateMin: parseAsInteger,
      rateMax: parseAsInteger,
      createdAfter: parseAsString.withDefault(""),
      createdBefore: parseAsString.withDefault(""),
      sort: parseAsString.withDefault("createdAt.desc"),
      hiddenColumns: parseAsArrayOf(parseAsString).withDefault([]),
    },
    {
      history: "push",
      shallow: true,
    },
  );
}
