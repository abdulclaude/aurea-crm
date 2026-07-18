import "server-only";

import { and, asc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  form,
  formSubmission,
  publicationTarget,
  publicationVersion,
  publicFormSubmissionReceipt,
  workflows,
} from "@/db/schema";
import {
  publishedFormSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";
import { sendWorkflowExecution } from "@/inngest/utils";

const MAX_DISPATCH_ATTEMPTS = 10;

export class PublicFormWorkflowDispatchTerminalError extends Error {}

export async function dispatchPublicFormWorkflow(
  receiptId: string,
): Promise<{ status: "DISPATCHED" | "IGNORED" }> {
  const [record] = await db
    .select({
      receiptId: publicFormSubmissionReceipt.id,
      organizationId: publicFormSubmissionReceipt.organizationId,
      locationId: publicFormSubmissionReceipt.locationId,
      targetId: publicFormSubmissionReceipt.targetId,
      versionId: publicFormSubmissionReceipt.versionId,
      formId: publicFormSubmissionReceipt.formId,
      workflowId: publicFormSubmissionReceipt.workflowId,
      dispatchStatus: publicFormSubmissionReceipt.workflowDispatchStatus,
      dispatchAttempts: publicFormSubmissionReceipt.workflowDispatchAttempts,
      submissionId: formSubmission.id,
      submissionData: formSubmission.data,
      snapshot: publicationVersion.snapshot,
      workflowArchived: workflows.archived,
      workflowIsTemplate: workflows.isTemplate,
      workflowOrganizationId: workflows.organizationId,
      workflowLocationId: workflows.locationId,
    })
    .from(publicFormSubmissionReceipt)
    .innerJoin(
      formSubmission,
      eq(formSubmission.receiptId, publicFormSubmissionReceipt.id),
    )
    .innerJoin(
      publicationTarget,
      and(
        eq(publicationTarget.id, publicFormSubmissionReceipt.targetId),
        eq(
          publicationTarget.organizationId,
          publicFormSubmissionReceipt.organizationId,
        ),
        or(
          eq(
            publicationTarget.locationId,
            publicFormSubmissionReceipt.locationId,
          ),
          and(
            isNull(publicationTarget.locationId),
            isNull(publicFormSubmissionReceipt.locationId),
          ),
        ),
        eq(publicationTarget.sourceId, publicFormSubmissionReceipt.formId),
      ),
    )
    .innerJoin(
      publicationVersion,
      and(
        eq(publicationVersion.id, publicFormSubmissionReceipt.versionId),
        eq(publicationVersion.targetId, publicFormSubmissionReceipt.targetId),
      ),
    )
    .innerJoin(
      form,
      and(
        eq(form.id, publicFormSubmissionReceipt.formId),
        eq(form.organizationId, publicFormSubmissionReceipt.organizationId),
        or(
          eq(form.locationId, publicFormSubmissionReceipt.locationId),
          and(
            isNull(form.locationId),
            isNull(publicFormSubmissionReceipt.locationId),
          ),
        ),
      ),
    )
    .innerJoin(
      workflows,
      and(
        eq(workflows.id, publicFormSubmissionReceipt.workflowId),
        eq(
          workflows.organizationId,
          publicFormSubmissionReceipt.organizationId,
        ),
        or(
          eq(workflows.locationId, publicFormSubmissionReceipt.locationId),
          and(
            isNull(workflows.locationId),
            isNull(publicFormSubmissionReceipt.locationId),
          ),
        ),
      ),
    )
    .where(eq(publicFormSubmissionReceipt.id, receiptId))
    .limit(1);

  if (!record) return failDispatch(receiptId, "FORM_WORKFLOW_SCOPE_INVALID");
  if (record.dispatchStatus === "DISPATCHED") return { status: "IGNORED" };
  if (record.dispatchStatus !== "PENDING" || !record.workflowId) {
    return { status: "IGNORED" };
  }
  if (
    record.workflowArchived ||
    record.workflowIsTemplate ||
    record.workflowOrganizationId !== record.organizationId ||
    record.workflowLocationId !== record.locationId
  ) {
    return failDispatch(receiptId, "FORM_WORKFLOW_UNAVAILABLE");
  }
  if (record.dispatchAttempts >= MAX_DISPATCH_ATTEMPTS) {
    return failDispatch(receiptId, "FORM_WORKFLOW_ATTEMPTS_EXHAUSTED");
  }
  const envelope = storedPublicationSnapshotSchema.safeParse(record.snapshot);
  const source = envelope.success
    ? publishedFormSourceSchema.safeParse(envelope.data.source)
    : null;
  if (
    !envelope.success ||
    envelope.data.channelConfig.kind !== "FORM" ||
    !source?.success ||
    source.data.form?.id !== record.formId ||
    source.data.form.workflowId !== record.workflowId ||
    source.data.form.locationId !== record.locationId
  ) {
    return failDispatch(receiptId, "FORM_WORKFLOW_SNAPSHOT_INVALID");
  }

  await db
    .update(publicFormSubmissionReceipt)
    .set({
      workflowDispatchAttempts: sql`${publicFormSubmissionReceipt.workflowDispatchAttempts} + 1`,
      lastWorkflowAttemptAt: new Date(),
      workflowDispatchError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publicFormSubmissionReceipt.id, receiptId),
        eq(publicFormSubmissionReceipt.workflowDispatchStatus, "PENDING"),
      ),
    );
  await sendWorkflowExecution({
    workflowId: record.workflowId,
    idempotencyKey: `form-submitted:${record.submissionId}:${record.workflowId}`,
    expectedOrganizationId: record.organizationId,
    expectedLocationId: record.locationId,
    initialData: {
      publicFormSubmission: {
        id: record.submissionId,
        formId: record.formId,
        targetId: record.targetId,
        versionId: record.versionId,
      },
      formValues: record.submissionData,
    },
  });
  await db
    .update(publicFormSubmissionReceipt)
    .set({
      workflowDispatchStatus: "DISPATCHED",
      workflowDispatchError: null,
      workflowDispatchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publicFormSubmissionReceipt.id, receiptId),
        eq(publicFormSubmissionReceipt.workflowDispatchStatus, "PENDING"),
      ),
    );
  return { status: "DISPATCHED" };
}

export async function findPendingPublicFormWorkflowReceipts(): Promise<
  string[]
> {
  const cutoff = new Date(Date.now() - 60_000);
  const exhausted = await db
    .select({ id: publicFormSubmissionReceipt.id })
    .from(publicFormSubmissionReceipt)
    .where(
      and(
        eq(publicFormSubmissionReceipt.workflowDispatchStatus, "PENDING"),
        gte(
          publicFormSubmissionReceipt.workflowDispatchAttempts,
          MAX_DISPATCH_ATTEMPTS,
        ),
      ),
    )
    .orderBy(asc(publicFormSubmissionReceipt.createdAt))
    .limit(100);
  if (exhausted.length > 0) {
    await db
      .update(publicFormSubmissionReceipt)
      .set({
        workflowDispatchStatus: "FAILED",
        workflowDispatchError: "FORM_WORKFLOW_ATTEMPTS_EXHAUSTED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(publicFormSubmissionReceipt.workflowDispatchStatus, "PENDING"),
          inArray(
            publicFormSubmissionReceipt.id,
            exhausted.map((receipt) => receipt.id),
          ),
        ),
      );
  }
  const rows = await db
    .select({ id: publicFormSubmissionReceipt.id })
    .from(publicFormSubmissionReceipt)
    .where(
      and(
        eq(publicFormSubmissionReceipt.workflowDispatchStatus, "PENDING"),
        lt(publicFormSubmissionReceipt.createdAt, cutoff),
        lt(
          publicFormSubmissionReceipt.workflowDispatchAttempts,
          MAX_DISPATCH_ATTEMPTS,
        ),
      ),
    )
    .orderBy(asc(publicFormSubmissionReceipt.createdAt))
    .limit(100);
  return rows.map((row) => row.id);
}

async function failDispatch(
  receiptId: string,
  errorCode: string,
): Promise<never> {
  await db
    .update(publicFormSubmissionReceipt)
    .set({
      workflowDispatchStatus: "FAILED",
      workflowDispatchError: errorCode.slice(0, 200),
      updatedAt: new Date(),
    })
    .where(eq(publicFormSubmissionReceipt.id, receiptId));
  throw new PublicFormWorkflowDispatchTerminalError(errorCode);
}
