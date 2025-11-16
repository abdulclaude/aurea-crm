"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";

export const useSuspenseIntegrations = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.integrations.getMany.queryOptions());
};

export const useSyncGoogleCalendarIntegration = () => {
  const trpc = useTRPC();
  return useMutation(trpc.integrations.syncGoogleCalendar.mutationOptions({}));
};

export const useSyncGmailIntegration = () => {
  const trpc = useTRPC();
  return useMutation(trpc.integrations.syncGmail.mutationOptions({}));
};

export const useSyncGoogleIntegration = () => {
  const trpc = useTRPC();
  return useMutation(trpc.integrations.syncGoogleWorkspace.mutationOptions({}));
};

export const useSyncWhatsAppIntegration = () => {
  const trpc = useTRPC();
  return useMutation(trpc.integrations.syncWhatsApp.mutationOptions({}));
};

export const useSuspenseIntegrationProviders = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.integrations.getConnectedProviders.queryOptions()
  );
};

export const useIntegrationsQuery = () => {
  const trpc = useTRPC();
  return useQuery(trpc.integrations.getMany.queryOptions());
};
