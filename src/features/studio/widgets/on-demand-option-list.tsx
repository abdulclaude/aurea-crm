"use client";

import { Checkbox } from "@/components/ui/checkbox";

type OnDemandOption = {
  id: string;
  title: string;
  durationSeconds: number | null;
};

export function OnDemandOptionList({
  options,
  selectedIds,
  loading,
  onToggle,
}: {
  options: OnDemandOption[];
  selectedIds: string[];
  loading: boolean;
  onToggle: (id: string, selected: boolean) => void;
}) {
  return (
    <div className="max-h-44 space-y-2 overflow-y-auto border-y py-2">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <Checkbox
            checked={selectedIds.includes(option.id)}
            onCheckedChange={(next) => onToggle(option.id, next === true)}
          />
          <span className="min-w-0 flex-1 truncate">{option.title}</span>
          {option.durationSeconds ? (
            <span className="text-xs text-muted-foreground">
              {Math.ceil(option.durationSeconds / 60)} min
            </span>
          ) : null}
        </label>
      ))}
      {!loading && options.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No published public free videos with safe HTTPS media URLs found.
        </p>
      ) : null}
    </div>
  );
}
