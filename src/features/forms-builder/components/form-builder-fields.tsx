"use client";

import { Plus, Trash2 } from "lucide-react";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { FormFieldUpdate } from "@/features/forms-builder/components/form-field-editor";
import { FormFieldPicker } from "@/features/forms-builder/components/form-field-picker";
import type { FormFieldPreset } from "@/features/forms-builder/components/form-field-presets";
import type { FormEditorStep } from "@/features/forms-builder/components/form-editor-types";
import { FormSortableFields } from "@/features/forms-builder/components/form-sortable-fields";

export function FormBuilderFields({
  steps,
  isMultiStep,
  addPending,
  updatePendingId,
  onAddStep,
  onDeleteStep,
  deleteStepPending,
  onAddField,
  onUpdateField,
  onDeleteField,
  onReorderFields,
}: {
  steps: FormEditorStep[];
  isMultiStep: boolean;
  addPending: boolean;
  updatePendingId: string | null;
  onAddStep: () => void;
  onDeleteStep: (id: string) => void;
  deleteStepPending: boolean;
  onAddField: (stepId: string, preset: FormFieldPreset) => void;
  onUpdateField: (value: FormFieldUpdate) => void;
  onDeleteField: (id: string) => void;
  onReorderFields: (stepId: string, orderedFieldIds: string[]) => void;
}) {
  const [stepToDelete, setStepToDelete] =
    React.useState<FormEditorStep | null>(null);

  return (
    <>
      <section>
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div>
          <h2 className="text-sm font-semibold">Questions</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Add the information this studio needs to collect.
          </p>
        </div>
        {isMultiStep ? (
          <Button type="button" size="sm" variant="outline" onClick={onAddStep}>
            <Plus className="size-3.5" aria-hidden="true" />
            Add step
          </Button>
        ) : null}
      </div>
      <div>
        {steps.map((step) => {
          const headingId = `form-step-${step.id}`;
          return (
            <section
              key={step.id}
              aria-labelledby={headingId}
              className="pb-3"
            >
              <Separator />
              <div className="flex items-center justify-between gap-3 bg-muted/15 px-4 py-3">
                <div>
                  <h3 id={headingId} className="text-xs font-medium">
                    {isMultiStep ? step.name : "Form fields"}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {step.formField.length}{" "}
                    {step.formField.length === 1 ? "field" : "fields"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <FormFieldPicker
                    disabled={addPending}
                    onSelect={(preset) => onAddField(step.id, preset)}
                  />
                  {isMultiStep ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:bg-transparent hover:text-destructive"
                      aria-label={`Delete ${step.name}`}
                      disabled={steps.length <= 1 || deleteStepPending}
                      onClick={() => setStepToDelete(step)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </div>
              {step.formField.length > 0 ? (
                <FormSortableFields
                  fields={step.formField}
                  updatePendingId={updatePendingId}
                  onUpdateField={onUpdateField}
                  onDeleteField={onDeleteField}
                  onReorder={(orderedFieldIds) =>
                    onReorderFields(step.id, orderedFieldIds)
                  }
                />
              ) : (
                <div className="mx-4 mb-4 border border-dashed p-8 text-center text-xs text-muted-foreground">
                  Add the first field for this step.
                </div>
              )}
              <Separator />
            </section>
          );
        })}
      </div>
      </section>
      <AlertDialog
        open={stepToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setStepToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this step?</AlertDialogTitle>
            <AlertDialogDescription>
              {stepToDelete
                ? `"${stepToDelete.name}" and all of its questions will be removed from the current draft.`
                : "This step and its questions will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (stepToDelete) onDeleteStep(stepToDelete.id);
                setStepToDelete(null);
              }}
            >
              Delete step
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
