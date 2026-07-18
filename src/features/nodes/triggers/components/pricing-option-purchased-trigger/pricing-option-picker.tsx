"use client";

import { Checkbox } from "@/components/ui/checkbox";

type PricingOptionItem = {
  id: string;
  name: string;
  type: string;
};

export function PricingOptionPicker(props: {
  options: PricingOptionItem[];
  selectedIds: string[];
  loading: boolean;
  onToggle: (id: string, selected: boolean) => void;
}) {
  return (
    <div className="max-h-56 space-y-1 overflow-y-auto rounded-sm border border-border p-2">
      {props.options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-start gap-3 rounded-sm p-2 hover:bg-muted/50"
        >
          <Checkbox
            checked={props.selectedIds.includes(option.id)}
            onCheckedChange={(checked) =>
              props.onToggle(option.id, checked === true)
            }
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{option.name}</span>
            <span className="block text-xs text-muted-foreground">
              {option.type.toLowerCase().replaceAll("_", " ")}
            </span>
          </span>
        </label>
      ))}
      {!props.loading && props.options.length === 0 ? (
        <p className="p-2 text-xs text-muted-foreground">
          No active pricing options are available.
        </p>
      ) : null}
    </div>
  );
}
