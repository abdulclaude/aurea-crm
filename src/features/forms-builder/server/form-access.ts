import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { form, formField, formStep, formSubmission } from "@/db/schema";

export type FormAccessScope = {
  organizationId: string;
  locationId: string | null;
};

const locationScope = (scope: FormAccessScope): SQL =>
  scope.locationId
    ? eq(form.locationId, scope.locationId)
    : isNull(form.locationId);

function formTenantWhere(scope: FormAccessScope): SQL {
  return and(
    eq(form.organizationId, scope.organizationId),
    locationScope(scope),
  )!;
}

export function formScopeWhere(
  formId: string,
  scope: FormAccessScope,
): SQL {
  return and(
    eq(form.id, formId),
    formTenantWhere(scope),
  )!;
}

export function formSubmissionScopeWhere(
  formId: string,
  scope: FormAccessScope,
  submissionId?: string,
): SQL {
  return and(
    eq(formSubmission.formId, formId),
    eq(formSubmission.organizationId, scope.organizationId),
    scope.locationId
      ? eq(formSubmission.locationId, scope.locationId)
      : isNull(formSubmission.locationId),
    submissionId ? eq(formSubmission.id, submissionId) : undefined,
  )!;
}

export async function requireScopedStep(
  stepId: string,
  scope: FormAccessScope,
): Promise<{ id: string; formId: string }> {
  const [step] = await db
    .select({ id: formStep.id, formId: formStep.formId })
    .from(formStep)
    .innerJoin(form, eq(form.id, formStep.formId))
    .where(and(eq(formStep.id, stepId), formTenantWhere(scope)))
    .limit(1);

  if (!step) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Step not found" });
  }
  return step;
}

export async function requireScopedField(
  fieldId: string,
  scope: FormAccessScope,
): Promise<{ id: string; stepId: string }> {
  const [field] = await db
    .select({ id: formField.id, stepId: formField.stepId })
    .from(formField)
    .innerJoin(formStep, eq(formStep.id, formField.stepId))
    .innerJoin(form, eq(form.id, formStep.formId))
    .where(and(eq(formField.id, fieldId), formTenantWhere(scope)))
    .limit(1);

  if (!field) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Field not found" });
  }
  return field;
}
