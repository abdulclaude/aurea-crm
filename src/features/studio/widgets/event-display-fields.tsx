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
import type { EventWidgetConfig } from "@/features/studio/widgets/contracts";

export function EventDisplayFields({
  idPrefix,
  config,
  onChange,
}: {
  idPrefix: string;
  config: EventWidgetConfig;
  onChange: (patch: Partial<EventWidgetConfig>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-layout`}>Layout</Label>
        <Select
          value={config.layout}
          onValueChange={(layout: EventWidgetConfig["layout"]) =>
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
        <Label htmlFor={`${idPrefix}-occurrences`}>Dates per event</Label>
        <Input
          id={`${idPrefix}-occurrences`}
          type="number"
          min={1}
          max={6}
          value={config.occurrencesPerEvent}
          className="shadow-none"
          onChange={(event) =>
            onChange({
              occurrencesPerEvent: Math.min(
                Math.max(Number.parseInt(event.target.value, 10) || 1, 1),
                6,
              ),
            })
          }
        />
      </div>
      <Toggle id={`${idPrefix}-description`} label="Show description" checked={config.showDescription} onCheckedChange={(showDescription) => onChange({ showDescription })} />
      <Toggle id={`${idPrefix}-image`} label="Show image" checked={config.showImage} onCheckedChange={(showImage) => onChange({ showImage })} />
      <Toggle id={`${idPrefix}-price`} label="Show price" checked={config.showPrice} onCheckedChange={(showPrice) => onChange({ showPrice })} />
      <Toggle id={`${idPrefix}-schedule`} label="Show upcoming dates" checked={config.showSchedule} onCheckedChange={(showSchedule) => onChange({ showSchedule })} />
      <Toggle id={`${idPrefix}-location`} label="Show location" checked={config.showLocation} onCheckedChange={(showLocation) => onChange({ showLocation })} />
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
