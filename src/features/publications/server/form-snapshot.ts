import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { form, formField, formStep } from "@/db/schema";
import { buildPublicFormSnapshot } from "@/features/forms-builder/lib/public-form-snapshot";
import { canonicalPublicationValue } from "@/features/publications/lib/content-hash";
import type { PublicationSourceScope } from "@/features/publications/server/source-types";

export async function buildFormSourceSnapshot(input: {
  sourceId: string;
  scope: PublicationSourceScope;
}): Promise<{
  snapshot: ReturnType<typeof canonicalPublicationValue>;
  errors: string[];
  warnings: string[];
}> {
  const [forms, steps, fields] = await Promise.all([
    db
      .select({
        id: form.id,
        name: form.name,
        description: form.description,
        isMultiStep: form.isMultiStep,
        showProgress: form.showProgress,
        progressDisplay: form.progressDisplay,
        successMessage: form.successMessage,
        redirectUrl: form.redirectUrl,
        primaryColor: form.primaryColor,
        buttonTextColor: form.buttonTextColor,
        backgroundColor: form.backgroundColor,
        textColor: form.textColor,
        locationId: form.locationId,
        updatedAt: form.updatedAt,
      })
      .from(form)
      .where(
        and(
          eq(form.id, input.sourceId),
          eq(form.organizationId, input.scope.organizationId),
          input.scope.locationId
            ? eq(form.locationId, input.scope.locationId)
            : isNull(form.locationId),
        ),
      )
      .limit(1),
    db
      .select({
        id: formStep.id,
        name: formStep.name,
        order: formStep.order,
        showConditions: formStep.showConditions,
      })
      .from(formStep)
      .where(eq(formStep.formId, input.sourceId))
      .orderBy(asc(formStep.order), asc(formStep.id)),
    db
      .select({
        id: formField.id,
        stepId: formField.stepId,
        type: formField.type,
        label: formField.label,
        placeholder: formField.placeholder,
        helpText: formField.helpText,
        required: formField.required,
        validation: formField.validation,
        options: formField.options,
        defaultValue: formField.defaultValue,
        showConditions: formField.showConditions,
        order: formField.order,
        styles: formField.styles,
      })
      .from(formField)
      .innerJoin(formStep, eq(formStep.id, formField.stepId))
      .where(eq(formStep.formId, input.sourceId))
      .orderBy(asc(formField.stepId), asc(formField.order), asc(formField.id)),
  ]);
  const result = buildPublicFormSnapshot({
    form: forms[0] ?? null,
    steps,
    fields,
  });
  return {
    snapshot: canonicalPublicationValue(result.source),
    errors: result.errors,
    warnings: result.warnings,
  };
}
