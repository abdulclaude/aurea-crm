"use client";

import { Checkbox } from "@/components/ui/checkbox";

type InstructorOption = {
  id: string;
  name: string;
};

export function InstructorOptionList({
  options,
  selectedIds,
  loading,
  onToggle,
}: {
  options: InstructorOption[];
  selectedIds: string[];
  loading: boolean;
  onToggle: (id: string, selected: boolean) => void;
}) {
  return (
    <div className="max-h-44 space-y-2 overflow-y-auto border-y py-2">
      {options.map((profile) => {
        const checked = selectedIds.includes(profile.id);
        return (
          <label
            key={profile.id}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => onToggle(profile.id, next === true)}
            />
            <span>{profile.name}</span>
          </label>
        );
      })}
      {!loading && options.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No active instructors found.
        </p>
      ) : null}
    </div>
  );
}
