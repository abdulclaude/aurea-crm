"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FormMappingSelect,
  type FormMappingField,
} from "@/features/forms-builder/components/form-member-mapping-controls";
import {
  DEFAULT_FORM_AUTOMATION_CONFIG,
  formAutomationConfigSchema,
  type FormAutomationConfig,
} from "@/features/forms-builder/lib/form-automation-config";
import { useTRPC } from "@/trpc/client";

export function FormAutomationMapping({
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
        toast.success("Automation consent saved");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const checkboxFields = fields.filter((field) => field.type === "CHECKBOX");

  return (
    <section className="space-y-4">
      <div>
        <Label>Automation consent</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Tell workflows which answers grant permission for each kind of
          follow-up. Consent is never inferred from a question label.
        </p>
      </div>
      <FormMappingSelect
        label="Email marketing permission"
        fields={checkboxFields}
        value={config.emailMarketingConsentFieldId}
        onChange={(emailMarketingConsentFieldId) =>
          setConfig({ ...config, emailMarketingConsentFieldId })
        }
      />
      <FormMappingSelect
        label="SMS marketing permission"
        fields={checkboxFields}
        value={config.smsMarketingConsentFieldId}
        onChange={(smsMarketingConsentFieldId) =>
          setConfig({ ...config, smsMarketingConsentFieldId })
        }
      />
      <FormMappingSelect
        label="Follow-up permission"
        fields={checkboxFields}
        value={config.followUpConsentFieldId}
        onChange={(followUpConsentFieldId) =>
          setConfig({ ...config, followUpConsentFieldId })
        }
      />
      <Button
        type="button"
        size="sm"
        variant="gradient"
        className="w-max"
        disabled={
          update.isPending ||
          !formAutomationConfigSchema.safeParse(config).success
        }
        onClick={() =>
          update.mutate({ id: formId, automationConfig: config })
        }
      >
        {update.isPending ? "Saving..." : "Save automation consent"}
      </Button>
    </section>
  );
}

function parseConfig(value: unknown): FormAutomationConfig {
  const parsed = formAutomationConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_FORM_AUTOMATION_CONFIG;
}
