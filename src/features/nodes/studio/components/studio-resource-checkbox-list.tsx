"use client";

import { Checkbox } from "@/components/ui/checkbox";

export type StudioResourceOption = {
  id: string;
  label: string;
  description?: string;
};

export function StudioResourceCheckboxList(props: {
  options: StudioResourceOption[];
  selectedIds: string[];
  loading: boolean;
  emptyMessage: string;
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
            <span className="block text-sm font-medium">{option.label}</span>
            {option.description ? (
              <span className="block text-xs text-muted-foreground">
                {option.description}
              </span>
            ) : null}
          </span>
        </label>
      ))}
      {!props.loading && props.options.length === 0 ? (
        <p className="p-2 text-xs text-muted-foreground">
          {props.emptyMessage}
        </p>
      ) : null}
    </div>
  );
}
