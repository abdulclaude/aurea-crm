"use client";

import * as React from "react";

import { PageTabs } from "@/components/ui/page-tabs";
import { FormBuilderFields } from "@/features/forms-builder/components/form-builder-fields";
import { FormBuilderSettings } from "@/features/forms-builder/components/form-builder-settings";
import { FormBuilderStyling } from "@/features/forms-builder/components/form-builder-styling";
import type { FormFieldUpdate } from "@/features/forms-builder/components/form-field-editor";
import type { FormFieldPreset } from "@/features/forms-builder/components/form-field-presets";
import type {
  FormEditorData,
  FormSettingsDraft,
  FormStylePreset,
} from "@/features/forms-builder/components/form-editor-types";
import { FormMemberMapping } from "@/features/forms-builder/components/form-member-mapping";
import { FormAutomationMapping } from "@/features/forms-builder/components/form-automation-mapping";

export function FormBuilderSidebar({
  form,
  draft,
  themes,
  addPending,
  updatePendingId,
  onDraftChange,
  onAddStep,
  onDeleteStep,
  deleteStepPending,
  onAddField,
  onUpdateField,
  onDeleteField,
  onReorderFields,
}: {
  form: FormEditorData;
  draft: FormSettingsDraft;
  themes: FormStylePreset[];
  addPending: boolean;
  updatePendingId: string | null;
  onDraftChange: (next: FormSettingsDraft) => void;
  onAddStep: () => void;
  onDeleteStep: (id: string) => void;
  deleteStepPending: boolean;
  onAddField: (stepId: string, preset: FormFieldPreset) => void;
  onUpdateField: (value: FormFieldUpdate) => void;
  onDeleteField: (id: string) => void;
  onReorderFields: (stepId: string, orderedFieldIds: string[]) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<
    "details" | "styling" | "questions"
  >("details");

  return (
    <div className="flex h-full min-h-0 flex-col border-r">
      <PageTabs
        tabs={[
          { id: "details", label: "Details" },
          { id: "styling", label: "Styling" },
          { id: "questions", label: "Questions" },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          if (
            tabId === "details" ||
            tabId === "styling" ||
            tabId === "questions"
          ) {
            setActiveTab(tabId);
          }
        }}
        className="shrink-0 px-4"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "details" ? (
          <>
            <section className="p-4 sm:p-5">
              <FormBuilderSettings
                draft={draft}
                stepCount={form.formStep.length}
                onChange={onDraftChange}
              />
            </section>
            <section className="border-t p-4 sm:p-5">
              <FormMemberMapping
                formId={form.id}
                value={form.crmResolutionConfig}
                fields={form.formStep.flatMap((step) =>
                  step.formField.map((field) => ({
                    id: field.id,
                    label: field.label,
                    type: field.type,
                  })),
                )}
              />
            </section>
            <section className="border-t p-4 sm:p-5">
              <FormAutomationMapping
                formId={form.id}
                value={form.automationConfig}
                fields={form.formStep.flatMap((step) =>
                  step.formField.map((field) => ({
                    id: field.id,
                    label: field.label,
                    type: field.type,
                  })),
                )}
              />
            </section>
          </>
        ) : activeTab === "styling" ? (
          <section className="p-4 sm:p-5">
            <FormBuilderStyling
              draft={draft}
              themes={themes}
              onChange={onDraftChange}
            />
          </section>
        ) : (
          <FormBuilderFields
            steps={form.formStep}
            isMultiStep={draft.isMultiStep}
            addPending={addPending}
            updatePendingId={updatePendingId}
            onAddStep={onAddStep}
            onDeleteStep={onDeleteStep}
            deleteStepPending={deleteStepPending}
            onAddField={onAddField}
            onUpdateField={onUpdateField}
            onDeleteField={onDeleteField}
            onReorderFields={onReorderFields}
          />
        )}
      </div>
    </div>
  );
}
