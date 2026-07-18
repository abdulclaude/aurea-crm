"use client";

import { useMutation } from "@tanstack/react-query";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { PageTabPanel } from "@/components/ui/page-tabs";
import { useTRPC } from "@/trpc/client";

import {
  ArchiveButton,
  CommerceSettingsSection,
  ReadinessStatus,
} from "./commerce-settings-shared";
import type { CommerceSettingsSectionProps } from "./commerce-settings-types";
import { TaxAssignmentForm } from "./tax-assignment-form";
import { TaxRateForm } from "./tax-rate-form";

export function TaxSettingsSection({
  activeTab,
  settings,
  canManage,
  submit,
}: CommerceSettingsSectionProps): React.JSX.Element {
  const trpc = useTRPC();
  const createTax = useMutation(
    trpc.commerceSettings.createTaxRate.mutationOptions(),
  );
  const archiveTax = useMutation(
    trpc.commerceSettings.archiveTaxRate.mutationOptions(),
  );
  const assignTax = useMutation(
    trpc.commerceSettings.upsertTaxAssignment.mutationOptions(),
  );
  const activeRates = settings.taxRates.filter(
    (rate) => rate.archivedAt === null,
  );

  return (
    <PageTabPanel
      idPrefix="commerce-settings"
      tabId="tax"
      activeTab={activeTab}
      className="p-6"
    >
      <CommerceSettingsSection
        title="Tax definitions"
        description="Rates are reusable definitions. Archive them rather than deleting history."
      >
        <div className="flex items-center gap-2">
          <ReadinessStatus value={settings.readiness.tax} />
        </div>
        <div className="divide-y border-y">
          {settings.taxRates.map((rate) => (
            <div
              key={rate.id}
              className="flex items-center justify-between py-3 text-xs"
            >
              <span>
                {rate.name}{" "}
                <span className="text-muted-foreground">
                  {rate.code} · {(rate.rateBasisPoints / 100).toFixed(2)}%
                </span>
              </span>
              <div className="flex items-center gap-2">
                {rate.archivedAt ? (
                  <Badge variant="outline">Archived</Badge>
                ) : null}
                <ArchiveButton
                  label={rate.name}
                  disabled={!canManage || Boolean(rate.archivedAt)}
                  onClick={() =>
                    void submit(
                      () => archiveTax.mutateAsync({ id: rate.id }),
                      "Tax rate archived",
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
        {canManage ? (
          <TaxRateForm
            createTaxRate={createTax.mutateAsync}
            isPending={createTax.isPending}
            submit={submit}
          />
        ) : null}
        <TaxAssignmentForm
          activeRates={activeRates}
          assignTaxRate={assignTax.mutateAsync}
          canManage={canManage}
          isPending={assignTax.isPending}
          submit={submit}
        />
      </CommerceSettingsSection>
    </PageTabPanel>
  );
}
