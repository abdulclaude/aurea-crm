"use client";

import {
  EntityContainer,
  EntityHeader,
} from "@/components/react-flow/entity-components";
import { Button } from "@/components/ui/button";
import {
  useSuspenseIntegrations,
  useSyncGoogleCalendarIntegration,
  useSyncGmailIntegration,
  useSyncGoogleIntegration,
  useSyncWhatsAppIntegration,
} from "../hooks/use-integrations";
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
import { IntegrationProvider } from "@/generated/prisma/enums";
import {
  GMAIL_SCOPES,
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_FULL_SCOPES,
  WHATSAPP_SCOPES,
} from "@/features/integrations/constants";

export const IntegrationsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Integrations"
          description="Connect external tools to automate your workflows."
        />
      }
    >
      {children}
    </EntityContainer>
  );
};

type IntegrationCatalogItem = {
  id: string;
  provider: IntegrationProvider;
  title: string;
  description: string;
  icon: string;
  scopes: string[];
  authProvider: "google" | "facebook";
};

const integrationsCatalog: IntegrationCatalogItem[] = [
  {
    id: "google-calendar",
    provider: IntegrationProvider.GOOGLE_CALENDAR,
    title: "Google Calendar",
    description:
      "Stream calendar events directly into your workflows and let workflows create or update events automatically.",
    icon: "/logos/googlecalendar.svg",
    scopes: GOOGLE_CALENDAR_SCOPES,
    authProvider: "google",
  },
  {
    id: "gmail",
    provider: IntegrationProvider.GMAIL,
    title: "Gmail",
    description:
      "Read incoming messages and send automated replies directly from your workflows.",
    icon: "/logos/google.svg",
    scopes: GMAIL_SCOPES,
    authProvider: "google",
  },
  {
    id: "google-workspace",
    provider: IntegrationProvider.GOOGLE,
    title: "Google Workspace",
    description:
      "Grant all Google permissions at once to unlock Gmail, Calendar, and future Google-powered nodes.",
    icon: "/logos/google.svg",
    scopes: GOOGLE_FULL_SCOPES,
    authProvider: "google",
  },
  {
    id: "whatsapp",
    provider: IntegrationProvider.WHATSAPP,
    title: "WhatsApp",
    description:
      "Receive and send messages via WhatsApp Cloud API using your connected business number.",
    icon: "/logos/whatsapp.svg",
    scopes: WHATSAPP_SCOPES,
    authProvider: "facebook",
  },
] as const;

export const IntegrationsList = () => {
  const integrations = useSuspenseIntegrations();
  const {
    mutate: syncGoogleCalendarMutate,
    isPending: isSyncingGoogleCalendar,
  } = useSyncGoogleCalendarIntegration();
  const { mutate: syncGmailMutate, isPending: isSyncingGmail } =
    useSyncGmailIntegration();
  const { mutate: syncGoogleWorkspaceMutate, isPending: isSyncingGoogle } =
    useSyncGoogleIntegration();
  const { mutate: syncWhatsAppMutate, isPending: isSyncingWhatsApp } =
    useSyncWhatsAppIntegration();
  const [connectingProvider, setConnectingProvider] =
    useState<IntegrationProvider | null>(null);
  const refetchIntegrations = integrations.refetch;

  useEffect(() => {
    syncGoogleCalendarMutate(undefined, {
      onSettled: () => refetchIntegrations(),
    });
    syncGmailMutate(undefined, {
      onSettled: () => refetchIntegrations(),
    });
    syncGoogleWorkspaceMutate(undefined, {
      onSettled: () => refetchIntegrations(),
    });
  }, [
    syncGoogleCalendarMutate,
    syncGmailMutate,
    syncGoogleWorkspaceMutate,
    refetchIntegrations,
  ]);

  type SyncHandler = ReturnType<
    typeof useSyncGoogleCalendarIntegration
  >["mutate"];

  const syncByProvider = useMemo<
    Partial<Record<IntegrationProvider, SyncHandler>>
  >(
    () => ({
      [IntegrationProvider.GOOGLE_CALENDAR]: syncGoogleCalendarMutate,
      [IntegrationProvider.GMAIL]: syncGmailMutate,
      [IntegrationProvider.GOOGLE]: syncGoogleWorkspaceMutate,
      [IntegrationProvider.WHATSAPP]: syncWhatsAppMutate,
    }),
    [
      syncGoogleCalendarMutate,
      syncGmailMutate,
      syncGoogleWorkspaceMutate,
      syncWhatsAppMutate,
    ]
  );

  const syncLoadingByProvider: Record<
    IntegrationProvider,
    boolean | undefined
  > = {
    [IntegrationProvider.GOOGLE_CALENDAR]: isSyncingGoogleCalendar,
    [IntegrationProvider.GMAIL]: isSyncingGmail,
    [IntegrationProvider.GOOGLE]: isSyncingGoogle,
    [IntegrationProvider.WHATSAPP]: isSyncingWhatsApp,
    [IntegrationProvider.TELEGRAM]: undefined,
  };

  const handleConnect = async (
    provider: IntegrationProvider,
    authProvider: "google" | "facebook",
    scopes: string[],
    label: string
  ) => {
    try {
      setConnectingProvider(provider);
      await authClient.linkSocial({
        provider: authProvider,
        scopes,
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
        onSettled: () => refetchIntegrations(),
      });
    } catch (_error) {
      toast.error("Failed to connect Google. Please try again.");
    } finally {
      setConnectingProvider(null);
    }
  };

  const connected = new Set(integrations.data.map((item) => item.provider));

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {integrationsCatalog.map((integration) => {
        const isConnected = connected.has(integration.provider);
        const isSyncing = syncLoadingByProvider[integration.provider] ?? false;
        const isConnecting = connectingProvider === integration.provider;
        return (
          <Card
            key={integration.id}
            className="bg-[#1A2326] border-white/5 text-white p-0"
          >
            <CardContent className="flex flex-col gap-10 p-5">
              <div className="flex flex-col items-start gap-2.5">
                <div className="">
                  <Image
                    src={integration.icon}
                    alt={integration.title}
                    width={32}
                    height={32}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <CardTitle className="text-sm">{integration.title}</CardTitle>
                  <CardDescription className="text-[13px] text-white/50 font-medium tracking-tight">
                    {integration.description}
                  </CardDescription>
                </div>
              </div>

              <Button
                variant={isConnected ? "outline" : "default"}
                disabled={isSyncing || isConnecting || isConnected}
                onClick={() => {
                  if (isConnected) {
                    toast.info(`${integration.title} is already connected.`);
                    return;
                  }
                  handleConnect(
                    integration.provider,
                    integration.authProvider,
                    integration.scopes,
                    integration.title
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

export const IntegrationsPageContent = () => {
  return (
    <IntegrationsContainer>
      <IntegrationsList />
    </IntegrationsContainer>
  );
};
