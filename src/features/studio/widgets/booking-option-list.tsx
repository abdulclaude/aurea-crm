"use client";

import { Checkbox } from "@/components/ui/checkbox";

type BookingOption = {
  id: string;
  title: string;
  length: number;
};

export function BookingOptionList({
  options,
  selectedIds,
  loading,
  onToggle,
}: {
  options: BookingOption[];
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
          <span className="text-xs text-muted-foreground">
            {option.length} min
          </span>
        </label>
      ))}
      {!loading && options.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No eligible Cal.com appointment types found. Connect and sync a
          location account; paid, team, and approval-required types are excluded.
        </p>
      ) : null}
    </div>
  );
}
