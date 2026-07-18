"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageTabPanel, PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { FieldDefinitionsPanel } from "@/features/customer-settings/components/field-definitions-panel";
import { HouseholdPolicyPanel } from "@/features/customer-settings/components/household-policy-panel";
import { NoteTemplatesPanel } from "@/features/customer-settings/components/note-templates-panel";
import { TagDefinitionsPanel } from "@/features/customer-settings/components/tag-definitions-panel";
import { useTRPC } from "@/trpc/client";

type Tab = "fields" | "tags" | "templates" | "households";

const tabs = [
  { id: "fields", label: "Profile fields" },
  { id: "tags", label: "Tags" },
  { id: "templates", label: "Note templates" },
  { id: "households", label: "Households" },
] as const;

export function CustomerSettingsPage(): React.JSX.Element {
  const trpc = useTRPC();
  const [tab, setTab] = React.useState<Tab>("fields");
  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const fields = useQuery(trpc.customerSettings.listFields.queryOptions());
  const tags = useQuery(trpc.customerSettings.listTags.queryOptions());
  const templates = useQuery(
    trpc.customerSettings.listNoteTemplates.queryOptions(),
  );
  const policy = useQuery(
    trpc.customerSettings.getHouseholdPolicy.queryOptions(),
  );
  const policyHistory = useQuery(
    trpc.customerSettings.listHouseholdPolicyHistory.queryOptions(),
  );
  const canManage =
    permissions.data?.capabilities.includes("settings.manage") ?? false;

  const queries = [permissions, fields, tags, templates, policy, policyHistory];
  if (queries.some((query) => query.isLoading)) {
    return (
      <div role="status" className="p-6 text-xs text-muted-foreground">
        Loading customer settings
      </div>
    );
  }
  if (queries.some((query) => query.isError)) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="max-w-3xl">
          <AlertTitle>Customer settings could not be loaded</AlertTitle>
          <AlertDescription>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void Promise.all(queries.map((query) => query.refetch()))
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
    <div className="space-y-0">
      <div className="p-6">
        <h1 className="text-lg font-semibold text-primary">
          Customer settings
        </h1>
        <p className="text-xs text-primary/70">
          Configure reusable customer data, note patterns, and household
          sharing.
        </p>
      </div>
      <Separator />
      <PageTabs
        tabs={tabs}
        activeTab={tab}
        onTabChange={(value) => setTab(value as Tab)}
        className="px-6"
        idPrefix="customer-settings"
        ariaLabel="Customer settings sections"
      />
      <PageTabPanel
        idPrefix="customer-settings"
        tabId="fields"
        activeTab={tab}
        className="p-6"
      >
        <FieldDefinitionsPanel
          items={fields.data ?? []}
          canManage={canManage}
          onRefresh={fields.refetch}
        />
      </PageTabPanel>
      <PageTabPanel
        idPrefix="customer-settings"
        tabId="tags"
        activeTab={tab}
        className="p-6"
      >
        <TagDefinitionsPanel
          items={tags.data ?? []}
          canManage={canManage}
          onRefresh={tags.refetch}
        />
      </PageTabPanel>
      <PageTabPanel
        idPrefix="customer-settings"
        tabId="templates"
        activeTab={tab}
        className="p-6"
      >
        <NoteTemplatesPanel
          items={templates.data ?? []}
          canManage={canManage}
          onRefresh={templates.refetch}
        />
      </PageTabPanel>
      <PageTabPanel
        idPrefix="customer-settings"
        tabId="households"
        activeTab={tab}
        className="p-6"
      >
        <HouseholdPolicyPanel
          policy={policy.data}
          history={policyHistory.data ?? []}
          canManage={canManage}
          onRefresh={async () => {
            await Promise.all([policy.refetch(), policyHistory.refetch()]);
          }}
        />
      </PageTabPanel>
    </div>
  );
}
