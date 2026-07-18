import "server-only";

import { and, asc, eq, inArray, isNotNull, lte, ne } from "drizzle-orm";

import { db } from "@/db";
import { formSubmission, publicFormSubmissionReceipt } from "@/db/schema";
import { normalizeFormRetentionPurgeBatchSize } from "@/features/forms-builder/lib/form-retention";

export async function deleteExpiredPublicFormSubmissions(
  now = new Date(),
  batchSize = 500,
): Promise<number> {
  const expired = await db
    .select({ id: formSubmission.id })
    .from(formSubmission)
    .innerJoin(
      publicFormSubmissionReceipt,
      and(
        eq(publicFormSubmissionReceipt.id, formSubmission.receiptId),
        eq(
          publicFormSubmissionReceipt.organizationId,
          formSubmission.organizationId,
        ),
        ne(publicFormSubmissionReceipt.workflowDispatchStatus, "PENDING"),
      ),
    )
    .where(
      and(
        isNotNull(formSubmission.retentionExpiresAt),
        lte(formSubmission.retentionExpiresAt, now),
      ),
    )
    .orderBy(asc(formSubmission.retentionExpiresAt))
    .limit(normalizeFormRetentionPurgeBatchSize(batchSize));
  if (expired.length === 0) return 0;

  const deleted = await db
    .delete(formSubmission)
    .where(
      and(
        inArray(
          formSubmission.id,
          expired.map((row) => row.id),
        ),
        isNotNull(formSubmission.receiptId),
        isNotNull(formSubmission.retentionExpiresAt),
        lte(formSubmission.retentionExpiresAt, now),
      ),
    )
    .returning({ id: formSubmission.id });
  return deleted.length;
}
