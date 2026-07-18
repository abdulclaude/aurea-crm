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
import type { MembershipWidgetConfig } from "@/features/studio/widgets/contracts";

export function MembershipDisplayFields({
  idPrefix,
  config,
  options,
  onChange,
}: {
  idPrefix: string;
  config: MembershipWidgetConfig;
  options: { id: string; name: string }[];
  onChange: (patch: Partial<MembershipWidgetConfig>) => void;
}) {
  const selectedOptions = options.filter((option) =>
    config.pricingOptionIds.includes(option.id),
  );
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-layout`}>Layout</Label>
        <Select
          value={config.layout}
          onValueChange={(layout: MembershipWidgetConfig["layout"]) =>
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
        <Label htmlFor={`${idPrefix}-featured`}>Featured membership</Label>
        <Select
          value={config.featuredPricingOptionId ?? "none"}
          onValueChange={(value) =>
            onChange({ featuredPricingOptionId: value === "none" ? null : value })
          }
        >
          <SelectTrigger id={`${idPrefix}-featured`} className="shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {selectedOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Toggle id={`${idPrefix}-price`} label="Show price" checked={config.showPrice} onCheckedChange={(showPrice) => onChange({ showPrice })} />
      <Toggle id={`${idPrefix}-billing`} label="Show billing interval" checked={config.showBillingInterval} onCheckedChange={(showBillingInterval) => onChange({ showBillingInterval })} />
      <Toggle id={`${idPrefix}-description`} label="Show description" checked={config.showDescription} onCheckedChange={(showDescription) => onChange({ showDescription })} />
      <Toggle id={`${idPrefix}-access`} label="Show access summary" checked={config.showAccessSummary} onCheckedChange={(showAccessSummary) => onChange({ showAccessSummary })} />
    </>
  );
}

function Toggle({ id, label, checked, onCheckedChange }: { id: string; label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between"><Label htmlFor={id}>{label}</Label><Switch id={id} checked={checked} onCheckedChange={onCheckedChange} /></div>;
}
