"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageTabPanel, PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import {
  WORKSPACE_SETTINGS_TABS,
  type WorkspaceSettingsTab,
} from "@/features/workspace-settings/constants";
import { useTRPC } from "@/trpc/client";

import { RegionalSettingsCard } from "./regional-settings-card";
import { RegionalSettingsHistory } from "./regional-settings-history";
import { OperationsSettingsCard } from "./operations-settings-card";
import { OperationsSettingsHistory } from "./operations-settings-history";
import { WorkspaceGeneralCard } from "./workspace-general-card";

function LoadingState({ label }: { label: string }): React.JSX.Element {
  return (
    <div role="status" aria-live="polite" className="flex min-h-40 items-center justify-center text-xs text-primary/60">
      {label}
    </div>
  );
}

export function WorkspaceSettingsPage(): React.JSX.Element {
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = React.useState<WorkspaceSettingsTab>("general");
  const workspace = useQuery(trpc.organizations.getWorkspaceDetails.queryOptions());
  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const regional = useQuery({
    ...trpc.workspaceSettings.getRegionalSettings.queryOptions(),
    enabled: activeTab !== "general",
  });
  const history = useQuery({
    ...trpc.workspaceSettings.listRegionalSettingsHistory.queryOptions(),
    enabled: activeTab === "history",
  });
  const operations = useQuery({
    ...trpc.workspaceSettings.getOperationsSettings.queryOptions(),
    enabled: activeTab === "operations" || activeTab === "history",
  });
  const operationsHistory = useQuery({
    ...trpc.workspaceSettings.listOperationsSettingsHistory.queryOptions(),
    enabled: activeTab === "history",
  });
  const canManage = permissions.data?.capabilities.includes("settings.manage") ?? false;

  const refreshRegional = async (): Promise<unknown> =>
    Promise.all([regional.refetch(), history.refetch()]);
  const refreshOperations = async (): Promise<unknown> =>
    Promise.all([operations.refetch(), operationsHistory.refetch()]);

  if (workspace.isLoading || permissions.isLoading) {
    return <LoadingState label="Loading workspace settings" />;
  }
  if (workspace.isError || permissions.isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="max-w-3xl">
          <AlertTitle>Workspace settings could not be loaded</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => Promise.all([workspace.refetch(), permissions.refetch()])}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!workspace.data?.data) {
    return <LoadingState label="Select a workspace to manage its settings" />;
  }

  return (
    <div className="space-y-0">
      <div className="p-6">
        <h1 className="text-lg font-semibold text-primary">Workspace settings</h1>
        <p className="text-xs text-primary/70">
          Manage workspace identity, inherited defaults, and change history.
        </p>
      </div>
      <Separator />
      <PageTabs
        tabs={WORKSPACE_SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as WorkspaceSettingsTab)}
        className="px-6"
        ariaLabel="Workspace settings sections"
        idPrefix="workspace-settings"
      />
      <PageTabPanel
        idPrefix="workspace-settings"
        tabId="general"
        activeTab={activeTab}
        className="p-6"
      >
        <WorkspaceGeneralCard
          workspace={workspace.data}
          canManage={canManage}
          onSaved={() => workspace.refetch()}
        />
      </PageTabPanel>
      <PageTabPanel
        idPrefix="workspace-settings"
        tabId="regional"
        activeTab={activeTab}
        className="p-6"
      >
        {regional.isLoading ? (
          <LoadingState label="Loading regional defaults" />
        ) : null}
        {regional.isError ? (
          <Alert variant="destructive" className="max-w-3xl">
            <AlertTitle>Regional defaults could not be loaded</AlertTitle>
            <AlertDescription>
              <Button variant="outline" size="sm" onClick={() => regional.refetch()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {regional.data ? (
          <RegionalSettingsCard
            settings={regional.data}
            canManage={canManage}
            onSaved={refreshRegional}
          />
        ) : null}
      </PageTabPanel>
      <PageTabPanel
        idPrefix="workspace-settings"
        tabId="operations"
        activeTab={activeTab}
        className="p-6"
      >
        {operations.isLoading ? (
          <LoadingState label="Loading hours and guest settings" />
        ) : null}
        {operations.isError ? (
          <Alert variant="destructive" className="max-w-3xl">
            <AlertTitle>Operations settings could not be loaded</AlertTitle>
            <AlertDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={() => operations.refetch()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {operations.data ? (
          <OperationsSettingsCard
            settings={operations.data}
            canManage={canManage}
            onSaved={refreshOperations}
          />
        ) : null}
      </PageTabPanel>
      <PageTabPanel
        idPrefix="workspace-settings"
        tabId="history"
        activeTab={activeTab}
        className="p-6"
      >
        {regional.isLoading || history.isLoading || operations.isLoading || operationsHistory.isLoading ? (
          <LoadingState label="Loading version history" />
        ) : null}
        {regional.isError || history.isError || operations.isError || operationsHistory.isError ? (
          <Alert variant="destructive" className="max-w-3xl">
            <AlertTitle>Version history could not be loaded</AlertTitle>
            <AlertDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={() => Promise.all([refreshRegional(), refreshOperations()])}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {history.data && operationsHistory.data ? (
          <div className="max-w-4xl space-y-8">
            <section aria-labelledby="regional-history-heading">
              <h2 id="regional-history-heading" className="mb-4 text-sm font-medium">
                Regional defaults
              </h2>
              <RegionalSettingsHistory
                history={history.data}
                canManage={canManage}
                onRolledBack={refreshRegional}
              />
            </section>
            <Separator />
            <section aria-labelledby="operations-history-heading">
              <h2 id="operations-history-heading" className="mb-4 text-sm font-medium">
                Hours and guests
              </h2>
              <OperationsSettingsHistory
                history={operationsHistory.data}
                canManage={canManage}
                onRolledBack={refreshOperations}
              />
            </section>
          </div>
        ) : null}
      </PageTabPanel>
    </div>
  );
}
