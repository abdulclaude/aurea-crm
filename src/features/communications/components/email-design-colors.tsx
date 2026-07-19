"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailDesignSettings } from "@/features/communications/email-settings-contracts";

const fields = [
  ["headerTextColor", "Header text color"],
  ["bodyTextColor", "Body text color"],
  ["buttonColor", "Button color"],
  ["backgroundColor", "Background color"],
] as const;

export function EmailDesignColors({
  value,
  onChange,
  disabled,
}: {
  value: EmailDesignSettings;
  onChange: (value: EmailDesignSettings) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {fields.map(([key, label]) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`email-${key}`}>{label}</Label>
          <div className="grid grid-cols-[2.5rem_1fr] gap-2">
            <Input
              aria-label={`${label} picker`}
              type="color"
              value={value[key]}
              disabled={disabled}
              className="p-1"
              onChange={(event) =>
                onChange({ ...value, [key]: event.target.value })
              }
            />
            <Input
              id={`email-${key}`}
              value={value[key]}
              disabled={disabled}
              onChange={(event) =>
                onChange({ ...value, [key]: event.target.value })
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
