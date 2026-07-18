"use client";

import { Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldType } from "@/db/enums";
import type { FormFieldDraft } from "@/features/forms-builder/components/form-field-editor-utils";
import {
  choiceField,
  EDITABLE_FORM_FIELD_TYPES,
  formFieldTypeLabel,
  numericField,
} from "@/features/forms-builder/components/form-field-presets";

export function FormFieldSettings({
  fieldId,
  draft,
  pending,
  onChange,
  onSave,
  onDelete,
}: {
  fieldId: string;
  draft: FormFieldDraft;
  pending: boolean;
  onChange: (draft: FormFieldDraft) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-4 border-t bg-muted/15 p-4 sm:grid-cols-2">
      <EditorField label="Field type">
        <Select
          value={draft.type}
          onValueChange={(type) =>
            onChange({ ...draft, type: type as FormFieldType })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITABLE_FORM_FIELD_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {formFieldTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </EditorField>
      <EditorField label="Question">
        <Input
          value={draft.label}
          onChange={(event) =>
            onChange({ ...draft, label: event.target.value })
          }
        />
      </EditorField>
      <EditorField label="Placeholder">
        <Input
          value={draft.placeholder}
          onChange={(event) =>
            onChange({ ...draft, placeholder: event.target.value })
          }
        />
      </EditorField>
      <EditorField label="Help text">
        <Input
          value={draft.helpText}
          onChange={(event) =>
            onChange({ ...draft, helpText: event.target.value })
          }
        />
      </EditorField>
      {choiceField(draft.type) ? (
        <div className="space-y-2 sm:col-span-2">
          <Label>Options</Label>
          <Textarea
            rows={3}
            value={draft.optionsText}
            onChange={(event) =>
              onChange({ ...draft, optionsText: event.target.value })
            }
            placeholder={"One option per line\nAnother option"}
          />
          <p className="text-[10px] text-muted-foreground">
            Add one option per line. Empty and duplicate options are removed.
          </p>
        </div>
      ) : null}
      <EditorField label="Default value">
        <Input
          value={draft.defaultValue}
          onChange={(event) =>
            onChange({ ...draft, defaultValue: event.target.value })
          }
        />
      </EditorField>
      {numericField(draft.type) ? (
        <div className="grid grid-cols-3 gap-2">
          <NumberRule
            label="Minimum"
            value={draft.min}
            onChange={(min) => onChange({ ...draft, min })}
          />
          <NumberRule
            label="Maximum"
            value={draft.max}
            onChange={(max) => onChange({ ...draft, max })}
          />
          <NumberRule
            label="Step"
            value={draft.step}
            onChange={(step) => onChange({ ...draft, step })}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <div>
          <Label htmlFor={`required-${fieldId}`}>Required</Label>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            People must answer this before continuing.
          </p>
        </div>
        <Switch
          id={`required-${fieldId}`}
          checked={draft.required}
          onCheckedChange={(required) => onChange({ ...draft, required })}
        />
      </div>
      <div className="flex justify-between gap-2 border-t pt-4 sm:col-span-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Remove
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || !draft.label.trim()}
          onClick={onSave}
        >
          <Save className="size-3.5" aria-hidden="true" />
          {pending ? "Saving" : "Save field"}
        </Button>
      </div>
    </div>
  );
}

function EditorField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberRule(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]">{props.label}</Label>
      <Input
        type="number"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}
