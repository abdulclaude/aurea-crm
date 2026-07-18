"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { InstructorWidgetConfig } from "@/features/studio/widgets/contracts";

export function InstructorDisplayFields({
  idPrefix,
  config,
  onChange,
}: {
  idPrefix: string;
  config: InstructorWidgetConfig;
  onChange: (patch: Partial<InstructorWidgetConfig>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-layout`}>Layout</Label>
        <Select
          value={config.layout}
          onValueChange={(layout: InstructorWidgetConfig["layout"]) =>
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
        <div className="space-y-3">
          <Label>Columns: {config.columns}</Label>
          <Slider
            value={[config.columns]}
            min={1}
            max={4}
            step={1}
            onValueChange={([columns]) =>
              columns !== undefined && onChange({ columns })
            }
          />
        </div>
      ) : null}
      <Toggle id={`${idPrefix}-photo`} label="Show profile photos" checked={config.showProfilePhoto} onCheckedChange={(showProfilePhoto) => onChange({ showProfilePhoto })} />
      <Toggle id={`${idPrefix}-bio`} label="Show bios" checked={config.showBio} onCheckedChange={(showBio) => onChange({ showBio })} />
      <Toggle id={`${idPrefix}-specialties`} label="Show specialties" checked={config.showSpecialties} onCheckedChange={(showSpecialties) => onChange({ showSpecialties })} />
      <Toggle id={`${idPrefix}-certifications`} label="Show certifications" checked={config.showCertifications} onCheckedChange={(showCertifications) => onChange({ showCertifications })} />
    </>
  );
}

function Toggle({ id, label, checked, onCheckedChange }: { id: string; label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between"><Label htmlFor={id}>{label}</Label><Switch id={id} checked={checked} onCheckedChange={onCheckedChange} /></div>;
}
