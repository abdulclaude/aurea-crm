"use client";

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";

export type WorkersParams = {
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
