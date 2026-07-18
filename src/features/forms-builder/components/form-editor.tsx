"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormBuilderPreview } from "@/features/forms-builder/components/form-builder-preview";
import { FormBuilderSidebar } from "@/features/forms-builder/components/form-builder-sidebar";
import { FormEditorHeader } from "@/features/forms-builder/components/form-editor-header";
import type { FormFieldUpdate } from "@/features/forms-builder/components/form-field-editor";
import type { FormFieldPreset } from "@/features/forms-builder/components/form-field-presets";
import type { FormSettingsDraft } from "@/features/forms-builder/components/form-editor-types";
import { useFormEditorMutations } from "@/features/forms-builder/components/use-form-editor-mutations";
import { formThemeSchema } from "@/features/forms-builder/lib/form-theme";
import { useTRPC } from "@/trpc/client";

export function FormEditor({ formId }: { formId: string }) {
  const trpc = useTRPC();
  const formQuery = useQuery(trpc.forms.get.queryOptions({ id: formId }));
  const themesQuery = useQuery(trpc.globalStyles.list.queryOptions());
  const [draft, setDraft] = React.useState<FormSettingsDraft | null>(null);
  const mutations = useFormEditorMutations(formId);

  React.useEffect(() => {
    if (!formQuery.data) return;
    setDraft({
      name: formQuery.data.name,
      description: formQuery.data.description ?? "",
      isMultiStep: formQuery.data.isMultiStep,
      showProgress: formQuery.data.showProgress,
      progressDisplay:
        formQuery.data.progressDisplay === "RING" ||
        formQuery.data.progressDisplay === "STEPS"
          ? formQuery.data.progressDisplay
          : "BAR",
      successMessage: formQuery.data.successMessage,
      redirectUrl: formQuery.data.redirectUrl ?? "",
      stylePresetId: formQuery.data.stylePresetId,
      primaryColor: formQuery.data.primaryColor,
      buttonTextColor: formQuery.data.buttonTextColor,
      backgroundColor: formQuery.data.backgroundColor,
      textColor: formQuery.data.textColor,
    });
  }, [formQuery.data]);

  if (formQuery.isLoading) {
    return (
      <div className="grid h-full grid-cols-1 lg:grid-cols-2">
        <Skeleton className="m-6 h-[70vh] rounded-none" />
        <Skeleton className="m-6 hidden h-[70vh] rounded-none lg:block" />
      </div>
    );
  }
  if (formQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-sm font-semibold">Form unavailable</h1>
          <p className="mt-1 max-w-md text-xs text-destructive">
            {formQuery.error.message}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/builder/forms">Back to forms</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading form settings...
      </div>
    );
  }
  const form = formQuery.data;
  if (!form) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Form not found
      </div>
    );
  }
  const settingsDraft = draft;
  const themes = themesQuery.data ?? [];
  const activeTheme =
    themes.find((theme) => theme.id === settingsDraft.stylePresetId) ??
    themes.find((theme) => theme.isDefault);

  function saveSettings(): void {
    mutations.updateForm.mutate({
      id: formId,
      name: settingsDraft.name.trim(),
      description: settingsDraft.description.trim(),
      isMultiStep: settingsDraft.isMultiStep,
      showProgress: settingsDraft.showProgress,
      progressDisplay: settingsDraft.progressDisplay,
      successMessage: settingsDraft.successMessage.trim(),
      redirectUrl: settingsDraft.redirectUrl.trim() || null,
      stylePresetId: settingsDraft.stylePresetId,
      primaryColor: settingsDraft.primaryColor,
      buttonTextColor: settingsDraft.buttonTextColor,
      backgroundColor: settingsDraft.backgroundColor,
      textColor: settingsDraft.textColor,
    });
  }

  function addPreset(stepId: string, preset: FormFieldPreset): void {
    if (preset.disabledReason) return;
    mutations.addField.mutate({
      stepId,
      type: preset.type,
      label: preset.defaultLabel,
      placeholder: preset.placeholder,
      required: preset.required ?? false,
      options: preset.options,
      validation:
        preset.type === "RATING"
          ? { min: 1, max: 5, step: 1 }
          : preset.type === "SLIDER"
            ? { min: 0, max: 10, step: 1 }
            : undefined,
    });
  }

  function saveField(value: FormFieldUpdate): void {
    mutations.setUpdatingFieldId(value.id);
    mutations.updateField.mutate(value);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <FormEditorHeader
        form={form}
        saving={mutations.updateForm.isPending}
        saveDisabled={
          !settingsDraft.name.trim() ||
          !formThemeSchema.safeParse({
            primaryColor: settingsDraft.primaryColor,
            buttonTextColor: settingsDraft.buttonTextColor,
            backgroundColor: settingsDraft.backgroundColor,
            textColor: settingsDraft.textColor,
          }).success
        }
        onSave={saveSettings}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <FormBuilderSidebar
          form={form}
          draft={settingsDraft}
          themes={themes}
          addPending={mutations.addField.isPending}
          updatePendingId={mutations.updatingFieldId}
          onDraftChange={setDraft}
          onAddStep={() =>
            mutations.addStep.mutate({
              formId,
              name: `Step ${form.formStep.length + 1}`,
            })
          }
          onDeleteStep={(id) => mutations.deleteStep.mutate({ id })}
          deleteStepPending={mutations.deleteStep.isPending}
          onAddField={addPreset}
          onUpdateField={saveField}
          onDeleteField={(id) => mutations.deleteField.mutate({ id })}
          onReorderFields={(stepId, orderedFieldIds) =>
            mutations.reorderFields.mutate({ stepId, orderedFieldIds })
          }
        />
        <FormBuilderPreview
          settings={settingsDraft}
          steps={form.formStep}
          theme={activeTheme}
        />
      </div>
    </div>
  );
}
