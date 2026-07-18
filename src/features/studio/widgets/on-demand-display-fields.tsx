"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { OnDemandWidgetConfig } from "@/features/studio/widgets/contracts";

export function OnDemandDisplayFields({
  idPrefix,
  config,
  onChange,
}: {
  idPrefix: string;
  config: OnDemandWidgetConfig;
  onChange: (patch: Partial<OnDemandWidgetConfig>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-layout`}>Layout</Label>
        <Select
          value={config.layout}
          onValueChange={(layout: OnDemandWidgetConfig["layout"]) =>
            onChange({ layout })
          }
        >
          <SelectTrigger id={`${idPrefix}-layout`} className="shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GRID">Grid</SelectItem>
            <SelectItem value="LIST">List</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {config.layout === "GRID" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-columns`}>Columns</Label>
          <Select
            value={String(config.columns)}
            onValueChange={(value) => onChange({ columns: Number(value) })}
          >
            <SelectTrigger id={`${idPrefix}-columns`} className="shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">One</SelectItem>
              <SelectItem value="2">Two</SelectItem>
              <SelectItem value="3">Three</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <Toggle id={`${idPrefix}-description`} label="Show description" checked={config.showDescription} onCheckedChange={(showDescription) => onChange({ showDescription })} />
      <Toggle id={`${idPrefix}-duration`} label="Show duration" checked={config.showDuration} onCheckedChange={(showDuration) => onChange({ showDuration })} />
      <Toggle id={`${idPrefix}-instructor`} label="Show instructor" checked={config.showInstructor} onCheckedChange={(showInstructor) => onChange({ showInstructor })} />
      <Toggle id={`${idPrefix}-class-type`} label="Show class type" checked={config.showClassType} onCheckedChange={(showClassType) => onChange({ showClassType })} />
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
}) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
