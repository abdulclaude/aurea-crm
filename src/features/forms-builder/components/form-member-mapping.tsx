"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FormMappingSelect,
  FormMappingToggle,
  type FormMappingField,
} from "@/features/forms-builder/components/form-member-mapping-controls";
import {
  DEFAULT_FORM_CRM_RESOLUTION_CONFIG,
  formCrmResolutionConfigSchema,
  type FormCrmResolutionConfig,
} from "@/features/forms-builder/lib/form-crm-resolution";
import { useTRPC } from "@/trpc/client";

export function FormMemberMapping({
  formId,
  fields,
  value,
}: {
  formId: string;
  fields: FormMappingField[];
  value: unknown;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const initial = useMemo(() => parseConfig(value), [value]);
  const [config, setConfig] = useState(initial);
  useEffect(() => setConfig(initial), [initial]);
  const update = useMutation(
    trpc.forms.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.forms.get.queryOptions({ id: formId }),
        );
        toast.success("Member mapping saved");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const emailFields = fields.filter((field) => field.type === "EMAIL");
  const phoneFields = fields.filter((field) => field.type === "PHONE");
  const nameFields = fields.filter((field) => field.type === "SHORT_TEXT");

  function toggleEnabled(enabled: boolean) {
    setConfig((current) => ({
      ...current,
      enabled,
      emailFieldId: current.emailFieldId ?? emailFields[0]?.id ?? null,
      phoneFieldId: current.phoneFieldId ?? phoneFields[0]?.id ?? null,
      fullNameFieldId: current.fullNameFieldId ?? nameFields[0]?.id ?? null,
    }));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Member profile</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Link each response to an existing member or create one.
          </p>
        </div>
        <Switch checked={config.enabled} onCheckedChange={toggleEnabled} />
      </div>
      {config.enabled ? (
        <>
          <FormMappingSelect
            label="Email"
            fields={emailFields}
            value={config.emailFieldId}
            required
            onChange={(emailFieldId) => setConfig({ ...config, emailFieldId })}
          />
          <FormMappingSelect
            label="Phone"
            fields={phoneFields}
            value={config.phoneFieldId}
            onChange={(phoneFieldId) => setConfig({ ...config, phoneFieldId })}
          />
          <FormMappingSelect
            label="Full name"
            fields={nameFields}
            value={config.fullNameFieldId}
            required={config.createIfMissing}
            onChange={(fullNameFieldId) =>
              setConfig({ ...config, fullNameFieldId })
            }
          />
          <FormMappingToggle
            label="Match by phone when email misses"
            checked={config.matchBy === "EMAIL_OR_PHONE"}
            onChange={(checked) =>
              setConfig({
                ...config,
                matchBy: checked ? "EMAIL_OR_PHONE" : "EMAIL",
              })
            }
          />
          <FormMappingToggle
            label="Create a member when none matches"
            checked={config.createIfMissing}
            onChange={(createIfMissing) =>
              setConfig({ ...config, createIfMissing })
            }
          />
          <FormMappingToggle
            label="Fill empty details on existing members"
            checked={config.updateExisting === "FILL_EMPTY"}
            onChange={(checked) =>
              setConfig({
                ...config,
                updateExisting: checked ? "FILL_EMPTY" : "NEVER",
              })
            }
          />
        </>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="gradient"
        className="w-max"
        disabled={
          update.isPending ||
          !formCrmResolutionConfigSchema.safeParse(config).success
        }
        onClick={() =>
          update.mutate({ id: formId, crmResolutionConfig: config })
        }
      >
        {update.isPending ? "Saving..." : "Save member mapping"}
      </Button>
    </section>
  );
}

function parseConfig(value: unknown): FormCrmResolutionConfig {
  const parsed = formCrmResolutionConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_FORM_CRM_RESOLUTION_CONFIG;
}
