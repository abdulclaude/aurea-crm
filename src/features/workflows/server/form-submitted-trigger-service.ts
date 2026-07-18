import "server-only";

import { and, eq, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { form, formSubmission } from "@/db/schema";
import {
  formSubmissionTriggerMatches,
} from "@/features/workflows/lib/studio-trigger-config";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";
import { inngest } from "@/inngest/client";
import { resolveFormSubmissionClient } from "@/features/forms-builder/server/form-client-resolution-service";
import { readFormAutomationConsent } from "@/features/forms-builder/lib/form-automation-config";

const MAX_DISPATCH_ATTEMPTS = 10;
const STALE_DISPATCH_MS = 10 * 60 * 1000;

export async function requestFormSubmittedWorkflowDispatch(
  submissionId: string,
): Promise<void> {
  await inngest.send({
    name: "workflows/form-submitted.dispatch",
    id: `form-submitted-dispatch:${submissionId}`,
    data: { submissionId },
  });
}

export async function dispatchFormSubmittedWorkflows(
  submissionId: string,
): Promise<number> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_DISPATCH_MS);
  const [claimed] = await db
    .update(formSubmission)
    .set({
      triggerDispatchStatus: "DISPATCHING",
      triggerDispatchAttempts: sql`${formSubmission.triggerDispatchAttempts} + 1`,
      triggerDispatchError: null,
      lastTriggerDispatchAttemptAt: now,
    })
    .where(
      and(
        eq(formSubmission.id, submissionId),
        lt(formSubmission.triggerDispatchAttempts, MAX_DISPATCH_ATTEMPTS),
        or(
          eq(formSubmission.triggerDispatchStatus, "PENDING"),
          and(
            eq(formSubmission.triggerDispatchStatus, "DISPATCHING"),
            lt(formSubmission.lastTriggerDispatchAttemptAt, staleBefore),
          ),
        ),
      ),
    )
    .returning({ attempts: formSubmission.triggerDispatchAttempts });

  if (!claimed) return 0;

  try {
    const triggered = await triggerFormSubmittedWorkflows(submissionId);
    await db
      .update(formSubmission)
      .set({
        triggerDispatchStatus: "DISPATCHED",
        triggerDispatchError: null,
        triggerDispatchedAt: new Date(),
      })
      .where(eq(formSubmission.id, submissionId));
    return triggered;
  } catch (error) {
    if (error instanceof FormSubmissionNeedsMemberReviewError) {
      await db
        .update(formSubmission)
        .set({
          triggerDispatchStatus: "WAITING_FOR_CLIENT",
          triggerDispatchError: error.message,
        })
        .where(eq(formSubmission.id, submissionId));
      return 0;
    }
    await db
      .update(formSubmission)
      .set({
        triggerDispatchStatus:
          claimed.attempts >= MAX_DISPATCH_ATTEMPTS ? "FAILED" : "PENDING",
        triggerDispatchError:
          error instanceof Error
            ? error.message.slice(0, 2_000)
            : "Dispatch failed",
      })
      .where(eq(formSubmission.id, submissionId));
    throw error;
  }
}

export async function findPendingFormSubmittedWorkflowDispatches(): Promise<
  string[]
> {
  const staleBefore = new Date(Date.now() - STALE_DISPATCH_MS);
  const rows = await db
    .select({ id: formSubmission.id })
    .from(formSubmission)
    .where(
      and(
        lt(formSubmission.triggerDispatchAttempts, MAX_DISPATCH_ATTEMPTS),
        or(
          eq(formSubmission.triggerDispatchStatus, "PENDING"),
          and(
            eq(formSubmission.triggerDispatchStatus, "DISPATCHING"),
            lt(formSubmission.lastTriggerDispatchAttemptAt, staleBefore),
          ),
        ),
      ),
    )
    .orderBy(formSubmission.submittedAt)
    .limit(200);
  return rows.map(({ id }) => id);
}

export async function triggerFormSubmittedWorkflows(
  submissionId: string,
): Promise<number> {
  const resolution = await resolveFormSubmissionClient(submissionId);
  if (resolution.status === "REVIEW") {
    throw new FormSubmissionNeedsMemberReviewError();
  }
  const [submission] = await db
    .select({
      id: formSubmission.id,
      formId: formSubmission.formId,
      organizationId: formSubmission.organizationId,
      locationId: formSubmission.locationId,
      clientId: formSubmission.clientId,
      values: formSubmission.data,
      automationConfig: formSubmission.automationConfig,
      submittedAt: formSubmission.submittedAt,
      formName: form.name,
    })
    .from(formSubmission)
    .innerJoin(
      form,
      and(
        eq(form.id, formSubmission.formId),
        eq(form.organizationId, formSubmission.organizationId),
      ),
    )
    .where(eq(formSubmission.id, submissionId))
    .limit(1);

  if (!submission?.organizationId) return 0;

  const values = jsonObject(submission.values);
  const consent = readFormAutomationConsent({
    config: submission.automationConfig,
    values,
  });

  return triggerWorkflowsForNodeType({
    nodeType: NodeType.FORM_SUBMITTED_TRIGGER,
    organizationId: submission.organizationId,
    locationId: submission.locationId,
    idempotencyKey: `form-submitted:${submission.id}`,
    triggerData: {
      submission: {
        id: submission.id,
        formId: submission.formId,
        formName: submission.formName,
        clientId: submission.clientId,
        submittedAt: submission.submittedAt.toISOString(),
        consent: {
          emailMarketing: consent.emailMarketing,
          smsMarketing: consent.smsMarketing,
          followUp: consent.followUp,
        },
      },
      values,
    },
    shouldTriggerNode: (node) =>
      formSubmissionTriggerMatches(node.data, {
        formId: submission.formId,
        emailMarketingConsent: consent.emailMarketing,
        smsMarketingConsent: consent.smsMarketing,
      }),
  });
}

class FormSubmissionNeedsMemberReviewError extends Error {
  constructor() {
    super("Choose the member for this response before its automations run.");
    this.name = "FormSubmissionNeedsMemberReviewError";
  }
}

function jsonObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}
