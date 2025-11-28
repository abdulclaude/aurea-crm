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
} from "../hooks/use-apps";
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
} from "@/features/apps/constants";

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
  authProvider: "google" | "facebook" | "microsoft";
};

const appsCatalog: AppCatalogItem[] = [
  {
    id: "google-calendar",
    provider: AppProvider.GOOGLE_CALENDAR,
    title: "Google Calendar",
    description:
      "Stream calendar events directly into your workflows and let workflows create or update events automatically.",
    icon: "/logos/googlecalendar.svg",
    scopes: GOOGLE_CALENDAR_SCOPES,
    authProvider: "google",
  },
  {
    id: "gmail",
    provider: AppProvider.GMAIL,
    title: "Gmail",
    description:
      "Read incoming messages and send automated replies directly from your workflows.",
    icon: "/logos/google.svg",
    scopes: GMAIL_SCOPES,
    authProvider: "google",
  },
  {
    id: "google-workspace",
    provider: AppProvider.GOOGLE,
    title: "Google Workspace",
    description:
      "Grant all Google permissions at once to unlock Gmail, Calendar, and future Google-powered nodes.",
    icon: "/logos/google.svg",
    scopes: GOOGLE_FULL_SCOPES,
    authProvider: "google",
  },
  {
    id: "microsoft",
    provider: AppProvider.MICROSOFT,
    title: "Microsoft 365",
    description:
      "Connect Outlook and OneDrive to send emails, receive notifications, and manage files in your workflows.",
    icon: "/logos/microsoft.svg",
    scopes: MICROSOFT_SCOPES,
    authProvider: "microsoft",
  },
] as const;

export const AppsList = () => {
  const apps = useSuspenseApps();
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
  const [connectingProvider, setConnectingProvider] =
    useState<AppProvider | null>(null);
  const refetchApps = apps.refetch;

  useEffect(() => {
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
  }, [
    syncGoogleCalendarMutate,
    syncGmailMutate,
    syncGoogleWorkspaceMutate,
    syncMicrosoftMutate,
    refetchApps,
  ]);

  type SyncHandler = ReturnType<typeof useSyncGoogleCalendarApp>["mutate"];

  const syncByProvider = useMemo<Partial<Record<AppProvider, SyncHandler>>>(
    () => ({
      [AppProvider.GOOGLE_CALENDAR]: syncGoogleCalendarMutate,
      [AppProvider.GMAIL]: syncGmailMutate,
      [AppProvider.GOOGLE]: syncGoogleWorkspaceMutate,
      [AppProvider.MICROSOFT]: syncMicrosoftMutate,
    }),
    [
      syncGoogleCalendarMutate,
      syncGmailMutate,
      syncGoogleWorkspaceMutate,
      syncMicrosoftMutate,
    ]
  );

  const syncLoadingByProvider: Record<AppProvider, boolean | undefined> = {
    [AppProvider.GOOGLE_CALENDAR]: isSyncingGoogleCalendar,
    [AppProvider.GMAIL]: isSyncingGmail,
    [AppProvider.GOOGLE]: isSyncingGoogle,
    [AppProvider.TELEGRAM]: undefined,
    [AppProvider.MICROSOFT]: isSyncingMicrosoft,
    [AppProvider.OUTLOOK]: undefined,
    [AppProvider.ONEDRIVE]: undefined,
  };

  const handleConnect = async (
    provider: AppProvider,
    authProvider: "google" | "facebook" | "microsoft",
    scopes: string[],
    label: string
  ) => {
    try {
      setConnectingProvider(provider);
      await authClient.linkSocial({
        provider: authProvider,
        scopes,
        callbackURL: window.location.origin,
      });
      const syncFn = syncByProvider[provider];
      syncFn?.(undefined, {
        onSuccess: (
          result:
            | { connected: boolean; missingScopes?: boolean }
            | { connected?: undefined; missingScopes?: undefined }
        ) => {
          if (result?.missingScopes) {
            toast.error(
              `${label} requires additional permissions. Please reconnect and allow the requested scopes.`
            );
          } else if (result?.connected) {
            toast.success(`${label} connected.`);
          }
        },
        onError: () => {
          toast.error(`Failed to sync ${label}. Please try again.`);
        },
        onSettled: () => refetchApps(),
      });
    } catch (_error) {
      toast.error(`Failed to connect ${label}. Please try again.`);
    } finally {
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
            className="bg-[#1A2326] border-white/5 text-white p-0"
          >
            <CardContent className="flex flex-col gap-10 p-5">
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
                  <CardDescription className="text-[13px] text-white/50 font-medium tracking-tight">
                    {app.description}
                  </CardDescription>
                </div>
              </div>

              <Button
                variant={isConnected ? "outline" : "default"}
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
                className="w-full bg-[#202E32] hover:bg-[#202E32]! hover:brightness-110 text-xs py-2! h-max! font-medium border-none hover:text-white"
              >
                {isConnected ? "Connected" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
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
