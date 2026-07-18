"use client";

import { CircleGauge, ListOrdered, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormColorField } from "@/features/forms-builder/components/form-color-field";
import type {
  FormSettingsDraft,
  FormStylePreset,
} from "@/features/forms-builder/components/form-editor-types";
import type { FormProgressDisplay } from "@/features/forms-builder/lib/form-progress";
import { DEFAULT_FORM_THEME } from "@/features/forms-builder/lib/form-theme";

const PROGRESS_OPTIONS: Array<{
  value: FormProgressDisplay;
  label: string;
  icon: typeof CircleGauge;
}> = [
  { value: "RING", label: "Ring", icon: CircleGauge },
  { value: "STEPS", label: "Steps", icon: ListOrdered },
  { value: "BAR", label: "Progress bar", icon: Rows3 },
];

export function FormBuilderStyling({
  draft,
  themes,
  onChange,
}: {
  draft: FormSettingsDraft;
  themes: FormStylePreset[];
  onChange: (next: FormSettingsDraft) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Style preset</Label>
        <Select
          value={draft.stylePresetId ?? "default"}
          onValueChange={(value) => {
            const selectedTheme =
              value === "default"
                ? themes.find((theme) => theme.isDefault)
                : themes.find((theme) => theme.id === value);
            onChange({
              ...draft,
              stylePresetId: value === "default" ? null : value,
              primaryColor:
                selectedTheme?.primaryColor ?? DEFAULT_FORM_THEME.primaryColor,
              backgroundColor:
                selectedTheme?.backgroundColor ??
                DEFAULT_FORM_THEME.backgroundColor,
              textColor:
                selectedTheme?.textColor ?? DEFAULT_FORM_THEME.textColor,
              buttonTextColor: DEFAULT_FORM_THEME.buttonTextColor,
            });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Workspace default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Workspace default</SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme.id} value={theme.id}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Form colors</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormColorField
            label="Background"
            value={draft.backgroundColor}
            onChange={(backgroundColor) =>
              onChange({ ...draft, backgroundColor })
            }
          />
          <FormColorField
            label="Text"
            value={draft.textColor}
            onChange={(textColor) => onChange({ ...draft, textColor })}
          />
          <FormColorField
            label="Button background"
            value={draft.primaryColor}
            onChange={(primaryColor) => onChange({ ...draft, primaryColor })}
          />
          <FormColorField
            label="Button text"
            value={draft.buttonTextColor}
            onChange={(buttonTextColor) =>
              onChange({ ...draft, buttonTextColor })
            }
          />
        </div>
      </div>

      <div className="space-y-3 border-t pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="show-form-progress">Display progress</Label>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Show where someone is in a multi-step form.
            </p>
          </div>
          <Switch
            id="show-form-progress"
            checked={draft.showProgress}
            disabled={!draft.isMultiStep}
            onCheckedChange={(showProgress) =>
              onChange({ ...draft, showProgress })
            }
          />
        </div>
        <div
          role="radiogroup"
          aria-label="Progress display"
          className="grid grid-cols-3 gap-2"
        >
          {PROGRESS_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = draft.progressDisplay === option.value;
            return (
              <Button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                variant={selected ? "gradient" : "outline"}
                disabled={!draft.isMultiStep || !draft.showProgress}
                className="h-20 min-w-0 flex-col gap-2 px-2 text-[10px]"
                onClick={() =>
                  onChange({ ...draft, progressDisplay: option.value })
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="max-w-full whitespace-normal text-center">
                  {option.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
