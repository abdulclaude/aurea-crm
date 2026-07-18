import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { asc, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { funnelRequestQuota } from "@/db/schema";
import {
  consumePublicationQuotaCounters,
  createPublicationQuotaCounters,
  PublicationQuotaExceededError,
  PublicationQuotaUnavailableError,
  publicationQuotaWindowStart,
} from "@/features/publications/lib/publication-quota-contract";

const TELEMETRY_WINDOW_SECONDS = 10 * 60;
const TELEMETRY_SUBJECT_LIMIT = 120;
const TELEMETRY_GLOBAL_LIMIT = 5_000;
const PURGE_BATCH_SIZE = 1_000;

export {
  PublicationQuotaExceededError as FunnelTelemetryQuotaExceededError,
  PublicationQuotaUnavailableError as FunnelTelemetryQuotaUnavailableError,
};

export async function enforceFunnelTelemetryQuota(input: {
  request: Request;
  organizationId: string;
  funnelId: string;
  now?: Date;
}): Promise<void> {
  return enforceFunnelRequestQuota({
    ...input,
    action: "EXTERNAL_FUNNEL_TELEMETRY",
    globalLimit: TELEMETRY_GLOBAL_LIMIT,
    subjectLimit: TELEMETRY_SUBJECT_LIMIT,
  });
}

export async function enforceFunnelRequestQuota(input: {
  action: "EXTERNAL_FORM_SUBMISSION" | "EXTERNAL_FUNNEL_TELEMETRY";
  globalLimit: number;
  request: Request;
  organizationId: string;
  funnelId: string;
  subjectLimit: number;
  now?: Date;
}): Promise<void> {
  const subject = readRequestSubject(input.request);
  const secret = process.env.PUBLICATION_ABUSE_SECRET?.trim();
  if (!subject || !secret || secret.length < 32) {
    throw new PublicationQuotaUnavailableError();
  }
  const now = input.now ?? new Date();
  const windowStartedAt = publicationQuotaWindowStart(
    now,
    TELEMETRY_WINDOW_SECONDS,
  );
  const expiresAt = new Date(
    windowStartedAt.getTime() + TELEMETRY_WINDOW_SECONDS * 1_000,
  );
  const counters = createPublicationQuotaCounters({
    organizationId: input.organizationId,
    targetId: input.funnelId,
    action: input.action,
    subject,
    secret,
    subjectLimit: input.subjectLimit,
    globalLimit: input.globalLimit,
  });

  try {
    await db.transaction(async (transaction) => {
      await consumePublicationQuotaCounters(
        counters,
        TELEMETRY_WINDOW_SECONDS,
        async (counter) => {
          const [consumed] = await transaction
            .insert(funnelRequestQuota)
            .values({
              id: createId(),
              organizationId: input.organizationId,
              funnelId: input.funnelId,
              action: input.action,
              dimension: counter.dimension,
              subjectKeyHash: counter.subjectKeyHash,
              windowStartedAt,
              windowSeconds: TELEMETRY_WINDOW_SECONDS,
              requestCount: 1,
              expiresAt,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                funnelRequestQuota.funnelId,
                funnelRequestQuota.action,
                funnelRequestQuota.dimension,
                funnelRequestQuota.subjectKeyHash,
                funnelRequestQuota.windowStartedAt,
              ],
              set: {
                requestCount: sql`${funnelRequestQuota.requestCount} + 1`,
                expiresAt,
                updatedAt: now,
              },
              setWhere: lt(funnelRequestQuota.requestCount, counter.limit),
            })
            .returning({ id: funnelRequestQuota.id });
          return consumed !== undefined;
        },
      );
    });
  } catch (error) {
    if (error instanceof PublicationQuotaExceededError) throw error;
    throw new PublicationQuotaUnavailableError();
  }
}

export async function deleteExpiredFunnelTelemetryQuotas(
  now = new Date(),
): Promise<number> {
  const expired = await db
    .select({ id: funnelRequestQuota.id })
    .from(funnelRequestQuota)
    .where(lt(funnelRequestQuota.expiresAt, now))
    .orderBy(asc(funnelRequestQuota.expiresAt))
    .limit(PURGE_BATCH_SIZE);
  if (expired.length === 0) return 0;
  const deleted = await db
    .delete(funnelRequestQuota)
    .where(
      inArray(
        funnelRequestQuota.id,
        expired.map((row) => row.id),
      ),
    )
    .returning({ id: funnelRequestQuota.id });
  return deleted.length;
}

function readRequestSubject(request: Request): string | null {
  for (const headerName of [
    "x-vercel-forwarded-for",
    "cf-connecting-ip",
    "fly-client-ip",
    "x-real-ip",
    "x-forwarded-for",
  ]) {
    const value = request.headers.get(headerName)?.split(",", 1)[0]?.trim();
    if (value && value.length <= 256) return value.toLowerCase();
  }
  return null;
}
