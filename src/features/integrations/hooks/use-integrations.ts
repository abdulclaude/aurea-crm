"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export const useSuspenseIntegrations = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.integrations.getMany.queryOptions());
};

export const useSyncGoogleCalendarIntegration = () => {
  const trpc = useTRPC();
  return useMutation(trpc.integrations.syncGoogleCalendar.mutationOptions({}));
};

export const useSuspenseIntegrationProviders = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.integrations.getConnectedProviders.queryOptions()
  );
};
