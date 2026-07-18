"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageTabPanel, PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";

import { StaffCompensationPanel } from "./staff-compensation-panel";
import { StaffOperationsPolicyCard } from "./staff-operations-policy-card";

const STAFF_SETTINGS_TABS = [
  { id: "operations", label: "Operations" },
  { id: "compensation", label: "Compensation" },
] as const;

type StaffSettingsTab = (typeof STAFF_SETTINGS_TABS)[number]["id"];

function LoadingState({ label }: { label: string }): React.JSX.Element {
  return (
    <div role="status" className="p-6 text-xs text-muted-foreground">
      {label}
    </div>
  );
}

export function StaffSettingsPage(): React.JSX.Element {
  const trpc = useTRPC();
  const [activeTab, setActiveTab] =
    React.useState<StaffSettingsTab>("operations");
  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const policy = useQuery(
    trpc.staffSettings.getOperationsPolicy.queryOptions(),
  );
  const canViewCompensation =
    permissions.data?.capabilities.includes("compensation.view") ?? false;
  const templates = useQuery({
    ...trpc.staffSettings.listCompensationTemplates.queryOptions(),
    enabled: activeTab === "compensation" && canViewCompensation,
  });
  const assignments = useQuery({
    ...trpc.staffSettings.listCompensationAssignments.queryOptions(),
    enabled: activeTab === "compensation" && canViewCompensation,
  });
  const instructors = useQuery({
    ...trpc.staffSettings.listAssignableInstructors.queryOptions(),
    enabled: activeTab === "compensation" && canViewCompensation,
  });
  const canManageOperations =
    permissions.data?.capabilities.includes("team.manage") ?? false;
  const canManageCompensation =
    permissions.data?.capabilities.includes("compensation.manage") ?? false;
  const visibleTabs = canViewCompensation
    ? STAFF_SETTINGS_TABS
    : STAFF_SETTINGS_TABS.filter((tab) => tab.id === "operations");

  const refreshOperations = async (): Promise<unknown> => policy.refetch();
  const refreshCompensation = async (): Promise<unknown> =>
    Promise.all([
      templates.refetch(),
      assignments.refetch(),
      instructors.refetch(),
    ]);

  if (permissions.isLoading || policy.isLoading)
    return <LoadingState label="Loading staff settings" />;
  if (permissions.isError || policy.isError || !policy.data) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="max-w-3xl">
          <AlertTitle>Staff settings could not be loaded</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                Promise.all([permissions.refetch(), policy.refetch()])
              }
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="p-6">
        <h1 className="text-lg font-semibold text-primary">Staff settings</h1>
        <p className="text-xs text-muted-foreground">
          Versioned staff defaults for the current workspace scope.
        </p>
      </div>
      <Separator />
      <PageTabs
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === "operations" || tab === "compensation") setActiveTab(tab);
        }}
        className="px-6"
        ariaLabel="Staff settings sections"
        idPrefix="staff-settings"
      />
      <PageTabPanel
        idPrefix="staff-settings"
        tabId="operations"
        activeTab={activeTab}
        className="p-6"
      >
        <StaffOperationsPolicyCard
          currentVersion={policy.data.currentVersion}
          canManage={canManageOperations}
          onSaved={refreshOperations}
        />
      </PageTabPanel>
      <PageTabPanel
        idPrefix="staff-settings"
        tabId="compensation"
        activeTab={activeTab}
        className="p-6"
      >
        {templates.isLoading ||
        assignments.isLoading ||
        instructors.isLoading ? (
          <LoadingState label="Loading compensation settings" />
        ) : null}
        {templates.isError || assignments.isError || instructors.isError ? (
          <Alert variant="destructive" className="max-w-3xl">
            <AlertTitle>Compensation settings could not be loaded</AlertTitle>
            <AlertDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshCompensation()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {templates.data && assignments.data && instructors.data ? (
          <StaffCompensationPanel
            canManage={canManageCompensation}
            templates={templates.data}
            assignments={assignments.data}
            instructors={instructors.data}
            onSaved={refreshCompensation}
          />
        ) : null}
      </PageTabPanel>
    </div>
  );
}
