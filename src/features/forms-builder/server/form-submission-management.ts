import "server-only";

import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  or,
} from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  form,
  formSubmission,
  publicFormSubmissionReceipt,
} from "@/db/schema";
import { buildFormSubmissionCsv } from "@/features/forms-builder/lib/form-submission-export";
import {
  formScopeWhere,
  formSubmissionScopeWhere,
  type FormAccessScope,
} from "@/features/forms-builder/server/form-access";

export type FormSubmissionCursor = { submittedAt: Date; id: string };
export type FormSubmissionSort = "submitted.desc" | "submitted.asc";

export async function listScopedFormSubmissions(input: {
  formId: string;
  scope: FormAccessScope;
  cursor?: FormSubmissionCursor;
  limit: number;
  search?: string;
  clientResolutionStatuses?: string[];
  triggerDispatchStatuses?: string[];
  sort: FormSubmissionSort;
}) {
  await requireScopedForm(input.formId, input.scope);
  const ascending = input.sort === "submitted.asc";
  const search = input.search?.trim();
  const rows = await db
    .select({
      id: formSubmission.id,
      data: formSubmission.data,
      submittedAt: formSubmission.submittedAt,
      retentionExpiresAt: formSubmission.retentionExpiresAt,
      utmSource: formSubmission.utmSource,
      utmCampaign: formSubmission.utmCampaign,
      clientResolutionStatus: formSubmission.clientResolutionStatus,
      clientResolutionError: formSubmission.clientResolutionError,
      triggerDispatchStatus: formSubmission.triggerDispatchStatus,
      triggerDispatchError: formSubmission.triggerDispatchError,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
      },
    })
    .from(formSubmission)
    .leftJoin(
      client,
      and(
        eq(client.id, formSubmission.clientId),
        eq(client.organizationId, input.scope.organizationId),
        input.scope.locationId
          ? eq(client.locationId, input.scope.locationId)
          : isNull(client.locationId),
      ),
    )
    .where(
      and(
        formSubmissionScopeWhere(input.formId, input.scope),
        input.cursor
          ? ascending
            ? or(
                gt(formSubmission.submittedAt, input.cursor.submittedAt),
                and(
                  eq(formSubmission.submittedAt, input.cursor.submittedAt),
                  gt(formSubmission.id, input.cursor.id),
                ),
              )
            : or(
                lt(formSubmission.submittedAt, input.cursor.submittedAt),
                and(
                  eq(formSubmission.submittedAt, input.cursor.submittedAt),
                  lt(formSubmission.id, input.cursor.id),
                ),
              )
          : undefined,
        search
          ? or(
              ilike(client.name, `%${search}%`),
              ilike(client.email, `%${search}%`),
              ilike(formSubmission.utmSource, `%${search}%`),
            )
          : undefined,
        input.clientResolutionStatuses?.length
          ? inArray(
              formSubmission.clientResolutionStatus,
              input.clientResolutionStatuses,
            )
          : undefined,
        input.triggerDispatchStatuses?.length
          ? inArray(
              formSubmission.triggerDispatchStatus,
              input.triggerDispatchStatuses,
            )
          : undefined,
      ),
    )
    .orderBy(
      ascending
        ? asc(formSubmission.submittedAt)
        : desc(formSubmission.submittedAt),
      ascending ? asc(formSubmission.id) : desc(formSubmission.id),
    )
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  if (hasMore) rows.pop();
  const last = rows.at(-1);
  return {
    submissions: rows,
    nextCursor:
      hasMore && last
        ? { submittedAt: last.submittedAt, id: last.id }
        : undefined,
  };
}

export async function exportScopedFormSubmissions(input: {
  formId: string;
  scope: FormAccessScope;
}) {
  const selectedForm = await db.query.form.findFirst({
    where: formScopeWhere(input.formId, input.scope),
    columns: { id: true },
    with: {
      formSteps: {
        columns: { id: true },
        orderBy: (step, { asc }) => [asc(step.order), asc(step.id)],
        with: {
          formFields: {
            columns: { id: true, label: true },
            orderBy: (field, { asc }) => [asc(field.order), asc(field.id)],
          },
        },
      },
    },
  });
  if (!selectedForm) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
  }

  const rows = await db.query.formSubmission.findMany({
    where: formSubmissionScopeWhere(input.formId, input.scope),
    columns: {
      id: true,
      data: true,
      submittedAt: true,
      retentionExpiresAt: true,
      utmSource: true,
      utmCampaign: true,
    },
    with: {
      client: { columns: { name: true, email: true } },
    },
    orderBy: [desc(formSubmission.submittedAt), desc(formSubmission.id)],
    limit: 1_001,
  });
  const possiblePartial = rows.length > 1_000;
  if (possiblePartial) rows.pop();
  const fields = selectedForm.formSteps.flatMap((step) => step.formFields);
  return {
    fileName: `form-responses-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: buildFormSubmissionCsv({ fields, rows }),
    rowCount: rows.length,
    possiblePartial,
  };
}

export async function deleteScopedFormSubmission(input: {
  formId: string;
  submissionId: string;
  scope: FormAccessScope;
}): Promise<{ id: string }> {
  await requireScopedForm(input.formId, input.scope);
  return db.transaction(async (transaction) => {
    const [record] = await transaction
      .select({
        id: formSubmission.id,
        receiptId: formSubmission.receiptId,
      })
      .from(formSubmission)
      .where(
        formSubmissionScopeWhere(input.formId, input.scope, input.submissionId),
      )
      .limit(1)
      .for("update");
    if (!record) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Form response not found",
      });
    }
    const [receipt] = record.receiptId
      ? await transaction
          .select({
            workflowDispatchStatus:
              publicFormSubmissionReceipt.workflowDispatchStatus,
          })
          .from(publicFormSubmissionReceipt)
          .where(
            and(
              eq(publicFormSubmissionReceipt.id, record.receiptId),
              eq(
                publicFormSubmissionReceipt.organizationId,
                input.scope.organizationId,
              ),
            ),
          )
          .limit(1)
      : [];
    if (receipt?.workflowDispatchStatus === "PENDING") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Wait for the configured workflow to finish before deleting this response.",
      });
    }
    const [deleted] = await transaction
      .delete(formSubmission)
      .where(
        formSubmissionScopeWhere(input.formId, input.scope, input.submissionId),
      )
      .returning({ id: formSubmission.id });
    if (!deleted) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "The form response changed before it could be deleted.",
      });
    }
    return deleted;
  });
}

async function requireScopedForm(
  formId: string,
  scope: FormAccessScope,
): Promise<void> {
  const selectedForm = await db.query.form.findFirst({
    where: formScopeWhere(formId, scope),
    columns: { id: true },
  });
  if (!selectedForm) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
  }
}
