"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";

import { useTRPCClient } from "@/trpc/client";
import { CLIENTS_PAGE_SIZE } from "../constants";

export type ClientsInfiniteFilters = {
  search?: string;
  sort?: string;
  countries?: string[];
  industries?: string[];
  attention?: boolean;
  hiddenColumns?: string[];
};

export function useClientsInfiniteQuery(filters: ClientsInfiniteFilters) {
  const client = useTRPCClient();
  const { hiddenColumns: _hiddenColumns, ...queryFilters } = filters;
  const input = { ...queryFilters, limit: CLIENTS_PAGE_SIZE };

  return useSuspenseInfiniteQuery({
    queryKey: ["organizations.getClientsInfinite", input],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      client.organizations.getClientsInfinite.query({
        ...input,
        cursor: pageParam ?? null,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
