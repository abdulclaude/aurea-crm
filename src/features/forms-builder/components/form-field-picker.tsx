"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FORM_FIELD_PRESETS,
  type FormFieldPreset,
} from "@/features/forms-builder/components/form-field-presets";

const GROUPS = [
  "Contact",
  "Questions",
  "Choice",
  "Date and time",
  "Advanced",
] as const;

export function FormFieldPicker({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (preset: FormFieldPreset) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add field
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[min(70vh,560px)] w-80 overflow-y-auto">
        {GROUPS.map((group, groupIndex) => (
          <DropdownMenuGroup key={group}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
              {group}
            </DropdownMenuLabel>
            {FORM_FIELD_PRESETS.filter(
              (preset) => preset.group === group,
            ).map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                disabled={Boolean(preset.disabledReason)}
                className="cursor-pointer items-start gap-3 py-2"
                onSelect={() => onSelect(preset)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium">{preset.label}</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    {preset.disabledReason ?? preset.description}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
