"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTabPanel } from "@/components/ui/page-tabs";
import { useTRPC } from "@/trpc/client";

import {
  ArchiveButton,
  CommerceSettingsSection,
  ReadinessStatus,
} from "./commerce-settings-shared";
import type { CommerceSettingsSectionProps } from "./commerce-settings-types";

export function RevenueSettingsSection({
  activeTab,
  settings,
  canManage,
  submit,
}: CommerceSettingsSectionProps): React.JSX.Element {
  const trpc = useTRPC();
  const createCategory = useMutation(
    trpc.commerceSettings.createRevenueCategory.mutationOptions(),
  );
  const archiveCategory = useMutation(
    trpc.commerceSettings.archiveRevenueCategory.mutationOptions(),
  );

  return (
    <PageTabPanel
      idPrefix="commerce-settings"
      tabId="revenue"
      activeTab={activeTab}
      className="p-6"
    >
      <CommerceSettingsSection
        title="Revenue categories"
        description="Account references document a future accounting mapping; they do not create a sync."
      >
        <div className="flex items-center gap-2">
          <ReadinessStatus value={settings.readiness.revenueMapping} />
        </div>
        <div className="divide-y border-y">
          {settings.revenueCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between py-3 text-xs"
            >
              <span>
                {category.name}{" "}
                <span className="text-muted-foreground">
                  {category.code}
                  {category.accountingAccountReference
                    ? ` · ${category.accountingAccountReference}`
                    : ""}
                </span>
              </span>
              <ArchiveButton
                label={category.name}
                disabled={!canManage || Boolean(category.archivedAt)}
                onClick={() =>
                  void submit(
                    () => archiveCategory.mutateAsync({ id: category.id }),
                    "Revenue category archived",
                  )
                }
              />
            </div>
          ))}
        </div>
        {canManage ? (
          <form
            className="grid gap-2 md:grid-cols-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              const saved = await submit(
                () =>
                  createCategory.mutateAsync({
                    name: String(data.get("name")),
                    code: String(data.get("code")).toUpperCase(),
                    description: null,
                    accountingAccountReference:
                      String(data.get("account")) || null,
                    accountingAccountName: null,
                  }),
                "Revenue category created",
              );
              if (saved) form.reset();
            }}
          >
            <Label htmlFor="revenue-category-name" className="sr-only">
              Category name
            </Label>
            <Input
              id="revenue-category-name"
              name="name"
              placeholder="Category name"
              required
            />
            <Label htmlFor="revenue-category-code" className="sr-only">
              Category code
            </Label>
            <Input
              id="revenue-category-code"
              name="code"
              placeholder="MEMBERSHIPS"
              required
            />
            <Label htmlFor="revenue-account-reference" className="sr-only">
              Accounting account reference
            </Label>
            <Input
              id="revenue-account-reference"
              name="account"
              placeholder="Accounting account reference"
            />
            <Button type="submit" disabled={createCategory.isPending}>
              <Plus />
              Add category
            </Button>
          </form>
        ) : null}
      </CommerceSettingsSection>
    </PageTabPanel>
  );
}
