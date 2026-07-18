"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useTRPC } from "@/trpc/client";

import type { StudioResourceOption } from "./resource-picker";
import type { StudioBookingActionFormValues } from "./config";

export function useStudioActionOptions(input: {
  open: boolean;
  classSource: "SELECTED" | "VARIABLE";
  clientSource: "SELECTED" | "VARIABLE";
  operation: StudioBookingActionFormValues["operation"];
}) {
  const trpc = useTRPC();
  const [classSearch, setClassSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [now] = useState(() => new Date().toISOString());
  const markingNoShow = input.operation === "MARK_NO_SHOW";
  const classesQuery = useQuery({
    ...trpc.studioClassesEnhanced.list.queryOptions({
      page: 1,
      pageSize: 100,
      search: classSearch || undefined,
      startDate: markingNoShow ? undefined : now,
      endDate: markingNoShow ? now : undefined,
      status: markingNoShow ? undefined : "SCHEDULED",
      sortDirection: markingNoShow ? "DESC" : "ASC",
    }),
    enabled: input.open && input.classSource === "SELECTED",
  });
  const clientsQuery = useQuery({
    ...trpc.clients.list.queryOptions({
      page: 1,
      pageSize: 20,
      search: clientSearch || undefined,
    }),
    enabled: input.open && input.clientSource === "SELECTED",
  });
  const classOptions = useMemo<StudioResourceOption[]>(
    () =>
      (classesQuery.data?.classes ?? []).map((item) => ({
        id: item.id,
        label: item.name,
        description: new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(item.startTime)),
      })),
    [classesQuery.data],
  );
  const clientOptions = useMemo<StudioResourceOption[]>(
    () =>
      (clientsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        label: item.name,
        description: item.email ?? "No email",
      })),
    [clientsQuery.data],
  );

  return {
    classOptions,
    classSearch,
    classLoading: classesQuery.isLoading,
    clientOptions,
    clientSearch,
    clientLoading: clientsQuery.isLoading,
    setClassSearch,
    setClientSearch,
  };
}
