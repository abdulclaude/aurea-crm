"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormSettingsDraft } from "@/features/forms-builder/components/form-editor-types";

export function FormBuilderSettings({
  draft,
  stepCount,
  onChange,
}: {
  draft: FormSettingsDraft;
  stepCount: number;
  onChange: (next: FormSettingsDraft) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SettingsField label="Name and public title">
        <Input
          value={draft.name}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          placeholder="Lead intake form"
        />
      </SettingsField>
      <SettingsField label="Form layout">
        <Select
          value={draft.isMultiStep ? "multi" : "single"}
          onValueChange={(value) =>
            onChange({ ...draft, isMultiStep: value === "multi" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single" disabled={stepCount > 1}>
              Single page
            </SelectItem>
            <SelectItem value="multi">Multiple steps</SelectItem>
          </SelectContent>
        </Select>
        {stepCount > 1 ? (
          <p className="text-[10px] text-muted-foreground">
            Delete extra steps before switching to a single page.
          </p>
        ) : null}
      </SettingsField>
      <div className="space-y-2 sm:col-span-2">
        <Label>Subtitle</Label>
        <Textarea
          rows={3}
          value={draft.description}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
          placeholder="Tell people what this form is for."
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Submission message</Label>
        <Textarea
          rows={3}
          value={draft.successMessage}
          onChange={(event) =>
            onChange({ ...draft, successMessage: event.target.value })
          }
          placeholder="Thank you. We have received your response."
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Redirect URL</Label>
        <Input
          type="url"
          value={draft.redirectUrl}
          onChange={(event) =>
            onChange({ ...draft, redirectUrl: event.target.value })
          }
          placeholder="https://example.com/thank-you"
        />
        <p className="text-[10px] text-muted-foreground">
          After submission, people can continue to this page.
        </p>
      </div>
    </div>
  );
}

function SettingsField({
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
