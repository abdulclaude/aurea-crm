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

export const useAppProviders = (enabled = true) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.apps.getConnectedProviders.queryOptions(),
    enabled,
  });
};

export const useAppsQuery = () => {
  const trpc = useTRPC();
  return useQuery(trpc.apps.getMany.queryOptions());
};

export const useSyncMicrosoftApp = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.syncMicrosoft.mutationOptions({}));
};

export const useSyncSlackApp = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.syncSlack.mutationOptions({}));
};

export const useSyncDiscordApp = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.syncDiscord.mutationOptions({}));
};

export const useSyncOAuthAccount = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.syncOAuthAccount.mutationOptions({}));
};

export const useDiscordGuilds = (providerAccountId: string, enabled = true) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.apps.listDiscordGuilds.queryOptions({ providerAccountId }),
    enabled: enabled && Boolean(providerAccountId),
  });
};

export const useSlackWorkspaces = (
  providerAccountId: string,
  enabled = true,
) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.apps.listSlackWorkspaces.queryOptions({ providerAccountId }),
    enabled: enabled && Boolean(providerAccountId),
  });
};

export const useSlackChannels = (providerAccountId: string, enabled = true) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.apps.listSlackChannels.queryOptions({ providerAccountId }),
    enabled: enabled && Boolean(providerAccountId),
  });
};

export const useDiscordChannels = (
  providerAccountId: string,
  guildId: string | null,
) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.apps.listDiscordChannels.queryOptions({
      providerAccountId,
      guildId: guildId ?? "",
    }),
    enabled: Boolean(providerAccountId && guildId),
  });
};

export const useUpdateDiscordMetadata = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.updateDiscordMetadata.mutationOptions({}));
};

export const useUpdateSlackMetadata = () => {
  const trpc = useTRPC();
  return useMutation(trpc.apps.updateSlackMetadata.mutationOptions({}));
};
