"use client";

import type { JSX } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ReferralWidgetConfig } from "@/features/studio/widgets/contracts";

export function ReferralDisplayFields({
  idPrefix,
  config,
  onChange,
}: {
  idPrefix: string;
  config: ReferralWidgetConfig;
  onChange: (patch: Partial<ReferralWidgetConfig>) => void;
}): JSX.Element {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-layout`}>Layout</Label>
        <Select
          value={config.layout}
          onValueChange={(layout: ReferralWidgetConfig["layout"]) =>
            onChange({ layout })
          }
        >
          <SelectTrigger id={`${idPrefix}-layout`} className="shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="STACKED">Stacked</SelectItem>
            <SelectItem value="INLINE">Side by side</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Toggle
        id={`${idPrefix}-referrer`}
        label="Show member reward"
        checked={config.showReferrerReward}
        onCheckedChange={(showReferrerReward) => onChange({ showReferrerReward })}
      />
      <Toggle
        id={`${idPrefix}-referee`}
        label="Show new client reward"
        checked={config.showRefereeReward}
        onCheckedChange={(showRefereeReward) => onChange({ showRefereeReward })}
      />
      <Toggle
        id={`${idPrefix}-window`}
        label="Show offer validity"
        checked={config.showOfferWindow}
        onCheckedChange={(showOfferWindow) => onChange({ showOfferWindow })}
      />
    </>
  );
}

function Toggle({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
