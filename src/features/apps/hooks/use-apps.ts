"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";

export const useSuspenseApps = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.apps.getMany.queryOptions());
};

export const useSyncGoogleCalendarApp = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.syncGoogleCalendar.mutationOptions({}));
};

export const useSyncGmailApp = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.syncGmail.mutationOptions({}));
};

export const useSyncGoogleApp = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.syncGoogleWorkspace.mutationOptions({}));
};

export const useSuspenseAppProviders = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.apps.getConnectedProviders.queryOptions());
};

export const useAppsQuery = () => {
  const trpc = useTRPC();
  return useQuery(trpc.apps.getMany.queryOptions());
};

export const useSyncMicrosoftApp = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.syncMicrosoft.mutationOptions({}));
};
