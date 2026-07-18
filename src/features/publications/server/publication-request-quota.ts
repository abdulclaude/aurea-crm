import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { asc, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { publicationRequestQuota } from "@/db/schema";
import {
  assertPublicationQuotaPolicy,
  consumePublicationQuotaCounters,
  createPublicationQuotaCounters,
  normalizePublicationQuotaPurgeBatchSize,
  PUBLICATION_QUOTA_PURGE_BATCH_SIZE,
  PublicationQuotaExceededError,
  type PublicationQuotaPolicy,
  PublicationQuotaUnavailableError,
  publicationQuotaWindowStart,
} from "@/features/publications/lib/publication-quota-contract";

export {
  PUBLIC_FORM_SUBMISSION_QUOTA,
  PUBLIC_TRACKING_QUOTA,
  PublicationQuotaExceededError,
  type PublicationQuotaPolicy,
  PublicationQuotaUnavailableError,
} from "@/features/publications/lib/publication-quota-contract";

export async function enforcePublicationRequestQuota(input: {
  request: Request;
  organizationId: string;
  targetId: string;
  policy: PublicationQuotaPolicy;
  now?: Date;
}): Promise<void> {
  assertPublicationQuotaPolicy(input.policy);
  const subject = readRequestSubject(input.request);
  const secret = readQuotaSecret();
  if (!subject || !secret) throw new PublicationQuotaUnavailableError();

  const now = input.now ?? new Date();
  const windowStartedAt = publicationQuotaWindowStart(
    now,
    input.policy.windowSeconds,
  );
  const expiresAt = new Date(
    windowStartedAt.getTime() + input.policy.windowSeconds * 1_000,
  );
  const counters = createPublicationQuotaCounters({
    organizationId: input.organizationId,
    targetId: input.targetId,
    action: input.policy.action,
    subject,
    secret,
    subjectLimit: input.policy.subjectLimit,
    globalLimit: input.policy.globalLimit,
  });

  try {
    await db.transaction(async (transaction) => {
      await consumePublicationQuotaCounters(
        counters,
        input.policy.windowSeconds,
        async (counter) => {
          const [consumed] = await transaction
            .insert(publicationRequestQuota)
            .values({
              id: createId(),
              organizationId: input.organizationId,
              targetId: input.targetId,
              action: input.policy.action,
              dimension: counter.dimension,
              subjectKeyHash: counter.subjectKeyHash,
              windowStartedAt,
              windowSeconds: input.policy.windowSeconds,
              requestCount: 1,
              expiresAt,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                publicationRequestQuota.targetId,
                publicationRequestQuota.action,
                publicationRequestQuota.dimension,
                publicationRequestQuota.subjectKeyHash,
                publicationRequestQuota.windowStartedAt,
              ],
              set: {
                requestCount: sql`${publicationRequestQuota.requestCount} + 1`,
                windowSeconds: input.policy.windowSeconds,
                expiresAt,
                updatedAt: now,
              },
              setWhere: lt(publicationRequestQuota.requestCount, counter.limit),
            })
            .returning({ requestCount: publicationRequestQuota.requestCount });
          return consumed !== undefined;
        },
      );
    });
  } catch (error) {
    if (error instanceof PublicationQuotaExceededError) throw error;
    throw new PublicationQuotaUnavailableError();
  }
}

export async function deleteExpiredPublicationRequestQuotas(
  requestedBatchSize = PUBLICATION_QUOTA_PURGE_BATCH_SIZE,
  now = new Date(),
): Promise<number> {
  const batchSize = normalizePublicationQuotaPurgeBatchSize(requestedBatchSize);
  const expired = await db
    .select({ id: publicationRequestQuota.id })
    .from(publicationRequestQuota)
    .where(lt(publicationRequestQuota.expiresAt, now))
    .orderBy(asc(publicationRequestQuota.expiresAt))
    .limit(batchSize);
  if (expired.length === 0) return 0;

  const deleted = await db
    .delete(publicationRequestQuota)
    .where(
      inArray(
        publicationRequestQuota.id,
        expired.map((row) => row.id),
      ),
    )
    .returning({ id: publicationRequestQuota.id });
  return deleted.length;
}

function readRequestSubject(request: Request): string | null {
  const candidateHeaders = [
    "x-vercel-forwarded-for",
    "cf-connecting-ip",
    "fly-client-ip",
    "x-real-ip",
    "x-forwarded-for",
  ];
  for (const headerName of candidateHeaders) {
    const value = request.headers.get(headerName)?.split(",", 1)[0]?.trim();
    if (value && value.length <= 256) return value.toLowerCase();
  }
  return null;
}

function readQuotaSecret(): string | null {
  const value = process.env.PUBLICATION_ABUSE_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}
