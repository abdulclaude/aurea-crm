"use client";

import { Checkbox } from "@/components/ui/checkbox";

const nextDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function EventOptionList({
  options,
  selectedIds,
  loading,
  onToggle,
}: {
  options: { id: string; name: string; nextStartTime: string | null }[];
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
          <span className="min-w-0 flex-1 truncate">{option.name}</span>
          {option.nextStartTime ? (
            <span className="text-xs text-muted-foreground">
              {nextDateFormatter.format(new Date(option.nextStartTime))}
            </span>
          ) : null}
        </label>
      ))}
      {!loading && options.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No public events with upcoming dates found.
        </p>
      ) : null}
    </div>
  );
}
