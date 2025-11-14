"use client";

import {
  EntityContainer,
  EntityHeader,
  EmptyView,
} from "@/components/react-flow/entity-components";
import { Button } from "@/components/ui/button";
import {
  useSuspenseIntegrations,
  useSyncGoogleCalendarIntegration,
} from "../hooks/use-integrations";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

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

const integrationsCatalog = [
  {
    id: "google-calendar",
    title: "Google Calendar",
    description:
      "Stream calendar events directly into your workflows and let workflows create or update events automatically.",
    icon: "/logos/googlecalendar.svg",
  },
];

const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
];

export const IntegrationsList = () => {
  const integrations = useSuspenseIntegrations();
  const {
    mutate: syncGoogleCalendarMutate,
    isPending: isSyncingGoogleCalendar,
  } = useSyncGoogleCalendarIntegration();
  const [isConnectingGoogleCalendar, setIsConnectingGoogleCalendar] =
    useState(false);
  const refetchIntegrations = integrations.refetch;

  useEffect(() => {
    syncGoogleCalendarMutate(undefined, {
      onSettled: () => refetchIntegrations(),
    });
  }, [syncGoogleCalendarMutate, refetchIntegrations]);

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnectingGoogleCalendar(true);
      await authClient.linkSocial({
        provider: "google",
        scopes: GOOGLE_CALENDAR_SCOPES,
      });
    } catch (_error) {
      toast.error("Failed to connect Google Calendar. Please try again.");
    } finally {
      setIsConnectingGoogleCalendar(false);
    }
  };

  const connected = new Set(integrations.data.map((item) => item.provider));

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {integrationsCatalog.map((integration) => {
        const isConnected = connected.has("GOOGLE_CALENDAR");
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
                disabled={
                  isSyncingGoogleCalendar ||
                  isConnectingGoogleCalendar ||
                  isConnected
                }
                onClick={() => {
                  if (isConnected) {
                    toast.info("Google Calendar is already connected.");
                    return;
                  }
                  handleConnectGoogleCalendar();
                }}
                className="w-full bg-[#202E32] hover:bg-[#202E32]! hover:brightness-110 text-xs py-2! h-max! font-medium border-none hover:text-white"
              >
                {isConnected ? "Connected" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {integrationsCatalog.length === 0 && (
        <EmptyView
          title="No integrations yet"
          label="integration"
          message="We are working on the first integration. Check back soon."
        />
      )}
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
