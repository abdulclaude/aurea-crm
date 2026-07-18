import { Save } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { CommerceSettings } from "./commerce-settings-types";

export type GuestPassPolicyInput = {
  values: {
    enabled: boolean;
    passesPerMember: number;
    validityDays: number;
    requiresApproval: boolean;
  };
  expectedVersion: number | null;
  changeNote: string | null;
};

export function GuestPassPolicyForm({
  settings,
  enabled,
  onEnabledChange,
  onSave,
  pending,
}: {
  settings: CommerceSettings;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  onSave: (input: GuestPassPolicyInput) => void;
  pending: boolean;
}): React.JSX.Element {
  const [requiresApproval, setRequiresApproval] = React.useState(
    settings.activeGuestPassPolicy?.values.requiresApproval ?? false,
  );

  return (
    <form
      className="grid gap-3 max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSave({
          values: {
            enabled,
            passesPerMember: Number(data.get("passes")),
            validityDays: Number(data.get("validity")),
            requiresApproval,
          },
          expectedVersion: settings.activeGuestPassPolicy?.version ?? null,
          changeNote: String(data.get("note")) || null,
        });
      }}
    >
      <Label htmlFor="guest-passes-enabled" className="flex items-center gap-2">
        <Switch
          id="guest-passes-enabled"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
        Guest passes enabled
      </Label>
      <Label htmlFor="guest-passes-per-member" className="sr-only">
        Passes per member
      </Label>
      <Input
        id="guest-passes-per-member"
        name="passes"
        type="number"
        min="0"
        max="100"
        defaultValue={
          settings.activeGuestPassPolicy?.values.passesPerMember ?? 1
        }
        placeholder="Passes per member"
        required
      />
      <Label htmlFor="guest-pass-validity-days" className="sr-only">
        Validity days
      </Label>
      <Input
        id="guest-pass-validity-days"
        name="validity"
        type="number"
        min="1"
        max="730"
        defaultValue={settings.activeGuestPassPolicy?.values.validityDays ?? 30}
        placeholder="Validity days"
        required
      />
      <Label htmlFor="guest-pass-approval" className="flex items-center gap-2">
        <Checkbox
          id="guest-pass-approval"
          checked={requiresApproval}
          onCheckedChange={(checked) => setRequiresApproval(checked === true)}
        />
        Require approval
      </Label>
      <Label htmlFor="guest-pass-change-note" className="sr-only">
        Change note
      </Label>
      <Textarea
        id="guest-pass-change-note"
        name="note"
        placeholder="Change note"
      />
      <Button type="submit" disabled={pending}>
        <Save />
        Publish policy version
      </Button>
    </form>
  );
}
