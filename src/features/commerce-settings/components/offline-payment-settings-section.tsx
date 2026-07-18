"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTabPanel } from "@/components/ui/page-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { offlinePaymentKinds } from "@/features/commerce-settings/contracts";
import { useTRPC } from "@/trpc/client";

import {
  ArchiveButton,
  CommerceSettingsSection,
  ReadinessStatus,
} from "./commerce-settings-shared";
import type { CommerceSettingsSectionProps } from "./commerce-settings-types";

type OfflinePaymentKind = (typeof offlinePaymentKinds)[number];

export function OfflinePaymentSettingsSection({
  activeTab,
  settings,
  canManage,
  submit,
}: CommerceSettingsSectionProps): React.JSX.Element {
  const trpc = useTRPC();
  const createOffline = useMutation(
    trpc.commerceSettings.createOfflinePaymentMethod.mutationOptions(),
  );
  const archiveOffline = useMutation(
    trpc.commerceSettings.archiveOfflinePaymentMethod.mutationOptions(),
  );
  const [offlineKind, setOfflineKind] =
    React.useState<OfflinePaymentKind>("CASH");
  const [offlineEnabled, setOfflineEnabled] = React.useState(true);

  return (
    <PageTabPanel
      idPrefix="commerce-settings"
      tabId="payments"
      activeTab={activeTab}
      className="p-6"
    >
      <CommerceSettingsSection
        title="Offline payment methods"
        description="These methods capture operator-facing configuration only; they do not execute or reconcile payments."
      >
        <div className="flex items-center gap-2">
          <ReadinessStatus value={settings.readiness.offlinePayments} />
        </div>
        <div className="divide-y border-y">
          {settings.offlinePaymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between py-3 text-xs"
            >
              <span>
                {method.name}{" "}
                <span className="text-muted-foreground">
                  {method.kind.replaceAll("_", " ")} ·{" "}
                  {method.enabled ? "Enabled" : "Disabled"}
                </span>
              </span>
              <ArchiveButton
                label={method.name}
                disabled={!canManage || Boolean(method.archivedAt)}
                onClick={() =>
                  void submit(
                    () => archiveOffline.mutateAsync({ id: method.id }),
                    "Offline payment method archived",
                  )
                }
              />
            </div>
          ))}
        </div>
        {canManage ? (
          <form
            className="grid gap-2 md:grid-cols-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              const saved = await submit(
                () =>
                  createOffline.mutateAsync({
                    name: String(data.get("name")),
                    kind: offlineKind,
                    instructions: String(data.get("instructions")) || null,
                    enabled: offlineEnabled,
                  }),
                "Offline payment method created",
              );
              if (saved) form.reset();
            }}
          >
            <Label htmlFor="offline-method-name" className="sr-only">
              Method name
            </Label>
            <Input
              id="offline-method-name"
              name="name"
              placeholder="Method name"
              required
            />
            <Select
              value={offlineKind}
              onValueChange={(value) =>
                setOfflineKind(value as OfflinePaymentKind)
              }
            >
              <SelectTrigger aria-label="Offline payment kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {offlinePaymentKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {kind.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="offline-method-instructions" className="sr-only">
              Operator instructions
            </Label>
            <Input
              id="offline-method-instructions"
              name="instructions"
              placeholder="Operator instructions"
            />
            <Label
              htmlFor="offline-method-enabled"
              className="flex items-center gap-2"
            >
              <Switch
                id="offline-method-enabled"
                checked={offlineEnabled}
                onCheckedChange={setOfflineEnabled}
              />
              Enabled
            </Label>
            <Button type="submit" disabled={createOffline.isPending}>
              <Plus />
              Add method
            </Button>
          </form>
        ) : null}
      </CommerceSettingsSection>
    </PageTabPanel>
  );
}
