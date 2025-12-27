"use client";

import {
  EntityContainer,
  EntityHeader,
} from "@/components/react-flow/entity-components";
import { Button } from "@/components/ui/button";
import {
  useSuspenseApps,
  useSyncGoogleCalendarApp,
  useSyncGmailApp,
  useSyncGoogleApp,
  useSyncMicrosoftApp,
  useSyncSlackApp,
  useSyncDiscordApp,
} from "../hooks/use-apps";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { AppProvider } from "@prisma/client";
import {
  GMAIL_SCOPES,
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_FULL_SCOPES,
  MICROSOFT_SCOPES,
  SLACK_SCOPES,
  DISCORD_SCOPES,
} from "@/features/apps/constants";

import { IconPlusSmall as PlusIcon } from "central-icons/IconPlusSmall";
import { IconSettingsGear3 as SettingsIcon } from "central-icons/IconSettingsGear3";
import { cn } from "@/lib/utils";
import { AppChannelSetupDialog } from "./app-channel-setup-dialog";

export const AppsContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Apps"
          description="Connect external tools to automate your workflows."
        />
      }
    >
      {children}
    </EntityContainer>
  );
};

type AppCatalogItem = {
  id: string;
  provider: AppProvider;
  title: string;
  description: string;
  icon: string;
  scopes: string[];
  authProvider: "google" | "facebook" | "microsoft" | "slack" | "discord";
};

const appsCatalog: AppCatalogItem[] = [
  {
    id: "google-workspace",
    provider: AppProvider.GOOGLE,
    title: "Google Workspace",
    description:
      "Connect Gmail, Calendar, Drive, and Forms to automate email, events, file management, and form responses.",
    icon: "/logos/google.svg",
    scopes: GOOGLE_FULL_SCOPES,
    authProvider: "google",
  },
  {
    id: "microsoft",
    provider: AppProvider.MICROSOFT,
    title: "Microsoft 365",
    description:
      "Connect Outlook, OneDrive, and Calendar to send emails, manage files, and schedule events in workflows.",
    icon: "/logos/microsoft.svg",
    scopes: MICROSOFT_SCOPES,
    authProvider: "microsoft",
  },
  {
    id: "slack",
    provider: AppProvider.SLACK,
    title: "Slack",
    description:
      "Send messages, upload files, and respond to channel events in your Slack workspace.",
    icon: "/logos/slack.svg",
    scopes: SLACK_SCOPES,
    authProvider: "slack",
  },
  {
    id: "discord",
    provider: AppProvider.DISCORD,
    title: "Discord",
    description:
      "Send messages, embeds, and respond to server events in your Discord community.",
    icon: "/logos/discord.svg",
    scopes: DISCORD_SCOPES,
    authProvider: "discord",
  },
] as const;

export const AppsList = () => {
  const apps = useSuspenseApps();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const {
    mutate: syncGoogleCalendarMutate,
    isPending: isSyncingGoogleCalendar,
  } = useSyncGoogleCalendarApp();
  const { mutate: syncGmailMutate, isPending: isSyncingGmail } =
    useSyncGmailApp();
  const { mutate: syncGoogleWorkspaceMutate, isPending: isSyncingGoogle } =
    useSyncGoogleApp();
  const { mutate: syncMicrosoftMutate, isPending: isSyncingMicrosoft } =
    useSyncMicrosoftApp();
  const { mutate: syncSlackMutate, isPending: isSyncingSlack } =
    useSyncSlackApp();
  const { mutate: syncDiscordMutate, isPending: isSyncingDiscord } =
    useSyncDiscordApp();
  const [connectingProvider, setConnectingProvider] =
    useState<AppProvider | null>(null);
  const [hasInitialSync, setHasInitialSync] = useState(false);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [configureProvider, setConfigureProvider] = useState<
    AppProvider.DISCORD | AppProvider.SLACK | null
  >(null);

  // Refetch both apps list and connected providers
  const refetchApps = () => {
    apps.refetch();
    queryClient.invalidateQueries({
      queryKey: trpc.apps.getConnectedProviders.queryOptions().queryKey,
    });
  };

  // Run sync on mount (handles OAuth callback returns)
  useEffect(() => {
    if (hasInitialSync) return;
    setHasInitialSync(true);

    // Run all syncs silently on mount to detect any new connections
    syncGoogleCalendarMutate(undefined, {
      onSettled: () => refetchApps(),
    });
    syncGmailMutate(undefined, {
      onSettled: () => refetchApps(),
    });
    syncGoogleWorkspaceMutate(undefined, {
      onSettled: () => refetchApps(),
    });
    syncMicrosoftMutate(undefined, {
      onSettled: () => refetchApps(),
    });
    syncSlackMutate(undefined, {
      onSettled: () => refetchApps(),
    });
    syncDiscordMutate(undefined, {
      onSettled: () => refetchApps(),
    });
  }, [
    hasInitialSync,
    syncGoogleCalendarMutate,
    syncGmailMutate,
    syncGoogleWorkspaceMutate,
    syncMicrosoftMutate,
    syncSlackMutate,
    syncDiscordMutate,
    refetchApps,
  ]);

  type SyncHandler = ReturnType<typeof useSyncGoogleCalendarApp>["mutate"];

  const syncByProvider = useMemo<Partial<Record<AppProvider, SyncHandler>>>(
    () => ({
      [AppProvider.GOOGLE_CALENDAR]: syncGoogleCalendarMutate,
      [AppProvider.GMAIL]: syncGmailMutate,
      [AppProvider.GOOGLE]: syncGoogleWorkspaceMutate,
      [AppProvider.MICROSOFT]: syncMicrosoftMutate,
      [AppProvider.SLACK]: syncSlackMutate,
      [AppProvider.DISCORD]: syncDiscordMutate,
    }),
    [
      syncGoogleCalendarMutate,
      syncGmailMutate,
      syncGoogleWorkspaceMutate,
      syncMicrosoftMutate,
      syncSlackMutate,
      syncDiscordMutate,
    ]
  );

  const syncLoadingByProvider: Partial<
    Record<AppProvider, boolean | undefined>
  > = {
    [AppProvider.GOOGLE_CALENDAR]: isSyncingGoogleCalendar,
    [AppProvider.GMAIL]: isSyncingGmail,
    [AppProvider.GOOGLE]: isSyncingGoogle,
    [AppProvider.TELEGRAM]: undefined,
    [AppProvider.MICROSOFT]: isSyncingMicrosoft,
    [AppProvider.OUTLOOK]: undefined,
    [AppProvider.ONEDRIVE]: undefined,
    [AppProvider.SLACK]: isSyncingSlack,
    [AppProvider.DISCORD]: isSyncingDiscord,
    [AppProvider.MINDBODY]: undefined,
  };

  const handleConnect = async (
    provider: AppProvider,
    authProvider: "google" | "facebook" | "microsoft" | "slack" | "discord",
    scopes: string[],
    label: string
  ) => {
    try {
      setConnectingProvider(provider);
      // This will redirect to OAuth provider, and when we return,
      // the useEffect will handle syncing the new connection
      await authClient.linkSocial({
        provider: authProvider,
        scopes,
        callbackURL: window.location.href,
      });
    } catch (_error) {
      toast.error(`Failed to connect ${label}. Please try again.`);
      setConnectingProvider(null);
    }
  };

  const connected = new Set(apps.data?.map((item) => item.provider) ?? []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {appsCatalog.map((app) => {
        const isConnected = connected.has(app.provider);
        const isSyncing = syncLoadingByProvider[app.provider] ?? false;
        const isConnecting = connectingProvider === app.provider;
        return (
          <Card
            key={app.id}
            className="bg-background border-none ring! shadow-sm! ring-black/10! text-black p-0"
          >
            <CardContent className="flex flex-col gap-10 p-6 relative">
              <div className="flex flex-col items-start gap-2.5">
                <div className="">
                  <Image
                    src={app.icon}
                    alt={app.title}
                    width={32}
                    height={32}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <CardTitle className="text-sm">{app.title}</CardTitle>
                  <CardDescription className="text-[13px] text-primary/50 font-medium tracking-tight">
                    {app.description}
                  </CardDescription>
                </div>
              </div>

              <div className="absolute right-6 flex gap-2">
                {isConnected &&
                  (app.provider === AppProvider.DISCORD ||
                    app.provider === AppProvider.SLACK) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConfigureProvider(
                          app.provider as
                            | AppProvider.DISCORD
                            | AppProvider.SLACK
                        );
                        setConfigureDialogOpen(true);
                      }}
                      className="h-max! p-1.5!"
                    >
                      <SettingsIcon className="size-4" />
                    </Button>
                  )}
                <Button
                  variant={isConnected ? "outline" : "gradient"}
                  disabled={isSyncing || isConnecting || isConnected}
                  onClick={() => {
                    if (isConnected) {
                      toast.info(`${app.title} is already connected.`);
                      return;
                    }
                    handleConnect(
                      app.provider,
                      app.authProvider,
                      app.scopes,
                      app.title
                    );
                  }}
                  className={cn(
                    "w-max",
                    isConnected ? "h-max! p-1.5! px-3!" : "p-1.5! h-max"
                  )}
                >
                  {isConnected ? "Connected" : <PlusIcon className="size-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {configureProvider && (
        <AppChannelSetupDialog
          open={configureDialogOpen}
          onOpenChange={setConfigureDialogOpen}
          provider={configureProvider}
          onSuccess={() => {
            refetchApps();
          }}
        />
      )}
    </div>
  );
};

export const AppsPageContent = () => {
  return (
    <AppsContainer>
      <AppsList />
    </AppsContainer>
  );
};
