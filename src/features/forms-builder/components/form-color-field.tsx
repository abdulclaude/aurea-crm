"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="size-9 shrink-0 cursor-pointer p-1"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 font-mono text-xs"
          aria-label={`${label} color hex value`}
          aria-invalid={!valid}
          maxLength={7}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
