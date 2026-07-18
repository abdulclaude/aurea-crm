"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  type IntegrationProvider,
  integrationProviderSchema,
  type IntegrationSyncDirection,
  integrationSyncDirectionSchema,
} from "@/features/provider-accounts/contracts";
import type { IntegrationProviderDefinition } from "@/features/provider-accounts/integration-catalog";

export type IntegrationAccountFormState = {
  id?: string;
  provider: IntegrationProvider;
  displayName: string;
  inheritToLocations: boolean;
  syncDirection: IntegrationSyncDirection;
  settings: Record<string, string>;
  credentials: Record<string, string>;
};

type Props = {
  open: boolean;
  definitions: IntegrationProviderDefinition[];
  form: IntegrationAccountFormState;
  hasSecret: boolean;
  pending: boolean;
  validationIssues: string[];
  onOpenChange: (open: boolean) => void;
  onChange: (form: IntegrationAccountFormState) => void;
  onValidate: () => void;
  onSave: () => void;
};

export function IntegrationAccountFormDialog({
  open,
  definitions,
  form,
  hasSecret,
  pending,
  validationIssues,
  onOpenChange,
  onChange,
  onValidate,
  onSave,
}: Props) {
  const definition = definitions.find(
    (candidate) => candidate.provider === form.provider,
  );
  const update = <K extends keyof IntegrationAccountFormState>(
    key: K,
    value: IntegrationAccountFormState[K],
  ) => onChange({ ...form, [key]: value });

  if (!definition) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit integration" : "Add integration"}</DialogTitle>
          <DialogDescription>
            {definition.label} · {definition.family.replaceAll("_", " ")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Provider">
            <Select
              disabled={Boolean(form.id)}
              value={form.provider}
              onValueChange={(value) => {
                const parsed = integrationProviderSchema.safeParse(value);
                const next = definitions.find(
                  (candidate) => candidate.provider === parsed.data,
                );
                if (!parsed.success || !next) return;
                onChange(emptyIntegrationForm(next));
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {definitions.map((item) => (
                  <SelectItem key={item.provider} value={item.provider}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Account name">
            <Input
              value={form.displayName}
              onChange={(event) => update("displayName", event.target.value)}
            />
          </Field>
          {definition.settingFields.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input
                placeholder={field.placeholder}
                value={form.settings[field.key] ?? ""}
                onChange={(event) =>
                  update("settings", {
                    ...form.settings,
                    [field.key]: event.target.value,
                  })
                }
              />
            </Field>
          ))}
          {definition.credentialFields.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={hasSecret ? "Leave blank to keep saved value" : field.placeholder}
                value={form.credentials[field.key] ?? ""}
                onChange={(event) =>
                  update("credentials", {
                    ...form.credentials,
                    [field.key]: event.target.value,
                  })
                }
              />
            </Field>
          ))}
          <Field label="Sync direction">
            <Select
              value={form.syncDirection}
              onValueChange={(value) => {
                const parsed = integrationSyncDirectionSchema.safeParse(value);
                if (parsed.success) update("syncDirection", parsed.data);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {integrationSyncDirectionSchema.options.map((direction) => (
                  <SelectItem key={direction} value={direction}>
                    {direction.toLowerCase().replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Separator />
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="integration-inheritance">Share with locations</Label>
          <Switch
            id="integration-inheritance"
            checked={form.inheritToLocations}
            onCheckedChange={(checked) => update("inheritToLocations", checked)}
          />
        </div>

        {validationIssues.length > 0 && (
          <div className="border-l-2 border-destructive pl-3 text-xs text-destructive">
            {validationIssues.join(" ")}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onValidate} disabled={pending}>
            Validate
          </Button>
          <Button onClick={onSave} disabled={pending || !form.displayName.trim()}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function emptyIntegrationForm(
  definition: IntegrationProviderDefinition,
): IntegrationAccountFormState {
  return {
    provider: definition.provider,
    displayName: definition.label,
    inheritToLocations: false,
    syncDirection: definition.defaultSyncDirection,
    settings: {},
    credentials: {},
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}
