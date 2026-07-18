"use client";

import { useMutation } from "@tanstack/react-query";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { PageTabPanel } from "@/components/ui/page-tabs";
import { useTRPC } from "@/trpc/client";

import {
  CommerceSettingsSection,
  ReadinessStatus,
} from "./commerce-settings-shared";
import type { CommerceSettingsSectionProps } from "./commerce-settings-types";
import { GuestPassPolicyForm } from "./guest-pass-policy-form";

export function GuestPassSettingsSection({
  activeTab,
  settings,
  canManage,
  submit,
}: CommerceSettingsSectionProps): React.JSX.Element {
  const trpc = useTRPC();
  const versionGuestPass = useMutation(
    trpc.commerceSettings.versionGuestPassPolicy.mutationOptions(),
  );
  const [guestEnabled, setGuestEnabled] = React.useState(
    settings.activeGuestPassPolicy?.values.enabled ?? false,
  );

  return (
    <PageTabPanel
      idPrefix="commerce-settings"
      tabId="guest-passes"
      activeTab={activeTab}
      className="p-6"
    >
      <CommerceSettingsSection
        title="Guest-pass policy"
        description="Each change creates a version so downstream records can retain the policy that was in effect."
      >
        <div className="flex items-center gap-2">
          <ReadinessStatus value={settings.readiness.guestPasses} />{" "}
          {settings.activeGuestPassPolicy ? (
            <Badge variant="outline">
              Version {settings.activeGuestPassPolicy.version}
            </Badge>
          ) : null}
        </div>
        {canManage ? (
          <GuestPassPolicyForm
            settings={settings}
            enabled={guestEnabled}
            onEnabledChange={setGuestEnabled}
            onSave={(input) =>
              void submit(
                () => versionGuestPass.mutateAsync(input),
                "Guest-pass policy versioned",
              )
            }
            pending={versionGuestPass.isPending}
          />
        ) : null}
        <div className="divide-y border-y">
          {settings.guestPassPolicyHistory.map((policy) => (
            <div key={policy.id} className="py-3 text-xs">
              Version {policy.version} · {policy.values.passesPerMember} passes
              · {policy.values.validityDays} days{" "}
              {policy.isActive ? (
                <Badge variant="secondary">Current</Badge>
              ) : null}
            </div>
          ))}
        </div>
      </CommerceSettingsSection>
    </PageTabPanel>
  );
}
