"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { BookingWidgetConfig } from "@/features/studio/widgets/contracts";

export function BookingDisplayFields({
  idPrefix,
  config,
  onChange,
}: {
  idPrefix: string;
  config: BookingWidgetConfig;
  onChange: (patch: Partial<BookingWidgetConfig>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-layout`}>Layout</Label>
        <Select
          value={config.layout}
          onValueChange={(layout: BookingWidgetConfig["layout"]) =>
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
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-button-label`}>Button label</Label>
        <Input
          id={`${idPrefix}-button-label`}
          className="shadow-none"
          maxLength={40}
          value={config.buttonLabel}
          onChange={(event) => onChange({ buttonLabel: event.target.value })}
        />
      </div>
      <Toggle
        id={`${idPrefix}-description`}
        label="Show description"
        checked={config.showDescription}
        onCheckedChange={(showDescription) => onChange({ showDescription })}
      />
      <Toggle
        id={`${idPrefix}-duration`}
        label="Show duration"
        checked={config.showDuration}
        onCheckedChange={(showDuration) => onChange({ showDuration })}
      />
      <Toggle
        id={`${idPrefix}-price`}
        label="Show free price"
        checked={config.showPrice}
        onCheckedChange={(showPrice) => onChange({ showPrice })}
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
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
