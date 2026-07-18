import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/features/customer-settings/components/field-label";
import { SettingsCard } from "@/features/customer-settings/components/settings-card";
import type {
  HouseholdPolicy,
  HouseholdPolicyHistoryEntry,
  RefreshSettings,
} from "@/features/customer-settings/components/types";
import { householdSharingKeys } from "@/features/customer-settings/contracts";
import { useTRPC } from "@/trpc/client";

export function HouseholdPolicyPanel({
  policy,
  history,
  canManage,
  onRefresh,
}: {
  policy: HouseholdPolicy | null | undefined;
  history: HouseholdPolicyHistoryEntry[];
  canManage: boolean;
  onRefresh: RefreshSettings;
}): React.JSX.Element {
  const trpc = useTRPC();
  const [relationships, setRelationships] = React.useState(""),
    [sharedData, setSharedData] = React.useState<
      Array<(typeof householdSharingKeys)[number]>
    >([]),
    [requireApproval, setRequireApproval] = React.useState(true);

  React.useEffect(() => {
    if (policy) {
      setRelationships(
        policy.values.relationships
          .map((relationship) => `${relationship.key}:${relationship.label}`)
          .join("\n"),
      );
      setSharedData(policy.values.sharedData);
      setRequireApproval(policy.values.requirePrimaryContactApproval);
    }
  }, [policy]);

  const save = useMutation(
    trpc.customerSettings.saveHouseholdPolicy.mutationOptions(),
  );
  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const parsed = relationships
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, ...label] = line.split(":");
        return {
          key: key?.trim() ?? "",
          label: label.join(":").trim(),
          reciprocalLabel: null,
        };
      });
    try {
      await save.mutateAsync({
        expectedVersion: policy?.version ?? null,
        changeNote: null,
        values: {
          relationships: parsed,
          sharedData,
          requirePrimaryContactApproval: requireApproval,
        },
      });
      toast.success("Household policy saved as a new version");
      await onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Household policy could not be saved",
      );
    }
  };

  return (
    <SettingsCard
      title="Household relationships and sharing"
      description={
        policy
          ? `Current version ${policy.version}. Saving creates a new version.`
          : "Set the relationship vocabulary and information categories households can share."
      }
    >
      <form className="space-y-5" onSubmit={submit}>
        <FieldLabel
          id="household-relationships"
          label="Relationship definitions"
        >
          <Textarea
            id="household-relationships"
            disabled={!canManage}
            className="min-h-32 font-mono"
            value={relationships}
            onChange={(event) => setRelationships(event.target.value)}
            placeholder="partner: Partner\nguardian: Guardian"
          />
          <p className="text-xs text-muted-foreground">
            One stable key and label per line, separated by a colon.
          </p>
        </FieldLabel>
        <div className="space-y-3">
          <p className="text-sm font-medium">Shared data</p>
          {householdSharingKeys.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between border-b py-2 last:border-0"
            >
              <Label htmlFor={`shared-${key}`} className="text-xs">
                {key.replaceAll("_", " ")}
              </Label>
              <Switch
                id={`shared-${key}`}
                disabled={!canManage}
                checked={sharedData.includes(key)}
                onCheckedChange={(checked) =>
                  setSharedData(
                    checked
                      ? [...sharedData, key]
                      : sharedData.filter((value) => value !== key),
                  )
                }
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="household-primary-approval">
            Require primary-contact approval
          </Label>
          <Switch
            id="household-primary-approval"
            disabled={!canManage}
            checked={requireApproval}
            onCheckedChange={setRequireApproval}
          />
        </div>
        {canManage ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>
              <Save className="size-3.5" />
              Save new version
            </Button>
          </div>
        ) : null}
      </form>
      {history.length > 0 ? (
        <div className="mt-6 border-t pt-4">
          <p className="text-sm font-medium">Version history</p>
          <div className="mt-2 divide-y">
            {history.map((version) => (
              <div
                key={version.version}
                className="flex items-center justify-between gap-3 py-2 text-xs"
              >
                <span>Version {version.version}</span>
                <span className="text-muted-foreground">
                  {version.changeNote ?? "Saved policy"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </SettingsCard>
  );
}
