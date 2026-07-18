"use client";

import { CheckCircle2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { FormBuilderPreviewNavigation } from "@/features/forms-builder/components/form-builder-preview-navigation";
import type {
  FormEditorStep,
  FormSettingsDraft,
  FormStylePreset,
} from "@/features/forms-builder/components/form-editor-types";
import { buildPreviewField } from "@/features/forms-builder/lib/form-preview-field";
import { PublishedFormField } from "@/features/publications/public/published-form-field";
import { PublishedFormProgress } from "@/features/publications/public/published-form-progress";

type PreviewStyle = React.CSSProperties & {
  "--publication-background": string;
  "--publication-border": string;
  "--publication-button-text": string;
  "--publication-primary": string;
};

export function FormBuilderPreview({
  settings,
  steps,
  theme,
}: {
  settings: FormSettingsDraft;
  steps: FormEditorStep[];
  theme: FormStylePreset | undefined;
}) {
  const [mode, setMode] = React.useState<"form" | "submitted">("form");
  const [values, setValues] = React.useState<Record<string, unknown>>({});
  const [stepIndex, setStepIndex] = React.useState(0);
  const safeStepIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const visibleSteps = settings.isMultiStep
    ? steps.slice(safeStepIndex, safeStepIndex + 1)
    : steps;
  const backgroundColor = validColor(
    settings.backgroundColor,
    theme?.backgroundColor ?? "#ffffff",
  );
  const textColor = validColor(
    settings.textColor,
    theme?.textColor ?? "#111827",
  );
  const primaryColor = validColor(
    settings.primaryColor,
    theme?.primaryColor ?? "#2563eb",
  );
  const buttonTextColor = validColor(settings.buttonTextColor, "#ffffff");
  const borderColor = theme?.borderColor ?? "#e5e7eb";
  const previewStyle: PreviewStyle = {
    "--publication-background": backgroundColor,
    "--publication-border": borderColor,
    "--publication-button-text": buttonTextColor,
    "--publication-primary": primaryColor,
    backgroundColor,
    borderColor,
    color: textColor,
    borderRadius: 8,
  };

  React.useEffect(() => {
    setStepIndex((current) => Math.min(current, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  return (
    <section className="flex min-h-0 flex-col bg-muted/20">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h2 className="text-xs font-semibold">Preview</h2>
        <div className="flex items-center rounded-[12px] border bg-background p-0.5 gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "form" ? "gradient" : "ghost"}
            className="h-6 text-[11px] w-max"
            onClick={() => setMode("form")}
          >
            Form
          </Button>

          <Button
            type="button"
            size="sm"
            variant={mode === "submitted" ? "gradient" : "ghost"}
            className="h-6 text-[11px] w-max"
            onClick={() => setMode("submitted")}
          >
            Submitted
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <div
          className="mx-auto min-h-[520px] max-w-xl border p-5 shadow-sm"
          style={previewStyle}
        >
          {mode === "submitted" ? (
            <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
              <CheckCircle2
                className="size-9"
                style={{ color: primaryColor }}
                aria-hidden="true"
              />
              <h3 className="mt-4 text-base font-semibold">Response received</h3>
              <p className="mt-2 max-w-sm text-xs opacity-70">
                {settings.successMessage ||
                  "Thank you for your submission."}
              </p>
            </div>
          ) : (
            <>
              <header className="border-b pb-5" style={{ borderColor }}>
                <h3 className="break-words text-lg font-semibold">
                  {settings.name || "Untitled form"}
                </h3>
                {settings.description ? (
                  <p className="mt-2 break-words text-xs leading-5 opacity-70">
                    {settings.description}
                  </p>
                ) : null}
              </header>
              <div className="mt-5 space-y-7">
                {settings.isMultiStep && settings.showProgress ? (
                  <PublishedFormProgress
                    current={safeStepIndex + 1}
                    total={steps.length}
                    variant={settings.progressDisplay}
                  />
                ) : null}
                {visibleSteps.map((step) => (
                  <div key={step.id} className="space-y-5">
                    {settings.isMultiStep ? (
                      <h4 className="text-xs font-semibold">{step.name}</h4>
                    ) : null}
                    {step.formField.map((field) => {
                      const publicField = buildPreviewField(field);
                      return publicField ? (
                        <PublishedFormField
                          key={field.id}
                          field={publicField}
                          value={values[field.id]}
                          onValueChange={(value) =>
                            setValues((current) => ({
                              ...current,
                              [field.id]: value,
                            }))
                          }
                        />
                      ) : (
                        <div
                          key={field.id}
                          className="border border-dashed p-3 text-xs opacity-65"
                        >
                          {field.label} requires a configured provider before it
                          can be previewed or published.
                        </div>
                      );
                    })}
                  </div>
                ))}
                {steps.every((step) => step.formField.length === 0) ? (
                  <div className="border border-dashed p-8 text-center text-xs opacity-60">
                    Add a field to preview the form.
                  </div>
                ) : null}
                <FormBuilderPreviewNavigation
                  isMultiStep={settings.isMultiStep}
                  stepIndex={safeStepIndex}
                  totalSteps={steps.length}
                  primaryColor={primaryColor}
                  buttonTextColor={buttonTextColor}
                  onBack={() =>
                    setStepIndex((current) => Math.max(current - 1, 0))
                  }
                  onContinue={() =>
                    setStepIndex((current) =>
                      Math.min(current + 1, Math.max(steps.length - 1, 0)),
                    )
                  }
                  onSubmit={() => setMode("submitted")}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function validColor(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}
