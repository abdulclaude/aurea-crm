"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type AudienceOption<T extends string = string> = {
  value: T;
  label: string;
};

type AudienceOptionGroupProps<T extends string> = {
  label: string;
  options: AudienceOption<T>[];
  value: T[];
  disabled?: boolean;
  onChange: (value: T[]) => void;
};

export function AudienceOptionGroup<T extends string>({
  label,
  options,
  value,
  disabled = false,
  onChange,
}: AudienceOptionGroupProps<T>) {
  function toggle(option: T): void {
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-primary">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((option) => (
          <Label
            key={option.value}
            className="flex items-center gap-2 text-xs font-normal text-primary/75"
          >
            <Checkbox
              checked={value.includes(option.value)}
              disabled={disabled}
              onCheckedChange={() => toggle(option.value)}
            />
            {option.label}
          </Label>
        ))}
      </div>
    </fieldset>
  );
}
