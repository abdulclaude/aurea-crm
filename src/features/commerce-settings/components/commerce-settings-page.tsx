"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";
import { useTRPC } from "@/trpc/client";

import { CommerceSettingsSections } from "./commerce-settings-sections";
import {
  COMMERCE_SETTINGS_TABS,
  type CommerceSettingsTab,
} from "./commerce-settings-tabs";

export function CommerceSettingsPage({
  initialTab = "tax",
}: {
  initialTab?: CommerceSettingsTab;
}): React.JSX.Element {
  const trpc = useTRPC();
  const [activeTab, setActiveTab] =
    React.useState<CommerceSettingsTab>(initialTab);
  const settings = useQuery(trpc.commerceSettings.get.queryOptions());
  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const canManage =
    permissions.data?.capabilities.includes("commerce.manage") ?? false;
  const refresh = async (): Promise<void> => {
    await settings.refetch();
  };

  if (settings.isLoading || permissions.isLoading)
    return (
      <div role="status" className="p-6 text-xs text-muted-foreground">
        Loading commerce settings
      </div>
    );
  if (settings.isError || permissions.isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Commerce settings could not be loaded</AlertTitle>
          <AlertDescription>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void Promise.all([settings.refetch(), permissions.refetch()])
              }
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!settings.data)
    return (
      <div role="status" className="p-6 text-xs text-muted-foreground">
        Select a workspace to manage commerce settings
      </div>
    );

  return (
    <div className="space-y-0">
      <div className="p-6">
        <h1 className="text-lg font-semibold">Commerce settings</h1>
        <p className="text-xs text-muted-foreground">
          Configure definitions and readiness. Accounting sync and payment
          execution are not configured here.
        </p>
      </div>
      <PageTabs
        tabs={COMMERCE_SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as CommerceSettingsTab)}
        className="px-6"
        ariaLabel="Commerce settings sections"
        idPrefix="commerce-settings"
      />
      <CommerceSettingsSections
        activeTab={activeTab}
        settings={settings.data}
        canManage={canManage}
        onRefresh={refresh}
      />
    </div>
  );
}
