"use client";

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";

export const STAFF_DEFAULT_SORT = "createdAt.desc";
export const STAFF_PAGE_SIZE = 20;

export function useStaffParams() {
  return useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(STAFF_PAGE_SIZE),
      search: parseAsString.withDefault(""),
      roles: parseAsArrayOf(parseAsString).withDefault([]),
      staffTypes: parseAsArrayOf(parseAsString).withDefault([]),
      isActive: parseAsBoolean,
      sort: parseAsString.withDefault(STAFF_DEFAULT_SORT),
    },
    {
      history: "push",
      shallow: true,
    },
  );
}
