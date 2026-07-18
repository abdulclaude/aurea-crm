import "server-only";

import { and, count, eq, gte, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { aiLog } from "@/db/schema";

const AI_REQUEST_WINDOW_MS = 60_000;
const AI_REQUEST_LIMIT = 20;

export class AiRateLimitError extends Error {
  constructor() {
    super("AI request limit reached. Please wait a minute and try again.");
    this.name = "AiRateLimitError";
  }
}

type AiUsageScope = {
  userId: string;
  organizationId: string;
  locationId: string | null;
};

export async function startAiUsageLog(input: AiUsageScope & {
  credentialId: string;
  model: string;
  title: string;
  intent: string;
}): Promise<string> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - AI_REQUEST_WINDOW_MS);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`ai:${input.organizationId}:${input.userId}`}))`,
    );
    const [usage] = await tx
      .select({ total: count() })
      .from(aiLog)
      .where(
        and(
          eq(aiLog.userId, input.userId),
          eq(aiLog.organizationId, input.organizationId),
          input.locationId
            ? eq(aiLog.locationId, input.locationId)
            : isNull(aiLog.locationId),
          gte(aiLog.createdAt, windowStart),
        ),
      );
    if ((usage?.total ?? 0) >= AI_REQUEST_LIMIT) {
      throw new AiRateLimitError();
    }

    const [created] = await tx
      .insert(aiLog)
      .values({
        id: crypto.randomUUID(),
        title: input.title,
        intent: input.intent,
        userMessage: "Assistant request",
        status: "RUNNING",
        userId: input.userId,
        organizationId: input.organizationId,
        locationId: input.locationId,
        credentialId: input.credentialId,
        model: input.model,
        createdAt: now,
      })
      .returning({ id: aiLog.id });
    return created.id;
  });
}

export async function finishAiUsageLog(input: AiUsageScope & {
  id: string;
  status: "COMPLETED" | "FAILED";
  title?: string;
  intent?: string;
  errorCode?: string | null;
  result?: Record<string, boolean> | null;
}): Promise<void> {
  await db
    .update(aiLog)
    .set({
      title: input.title,
      intent: input.intent,
      status: input.status,
      error: input.errorCode?.slice(0, 128) ?? null,
      result: input.result ?? null,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(aiLog.id, input.id),
        eq(aiLog.userId, input.userId),
        eq(aiLog.organizationId, input.organizationId),
        input.locationId
          ? eq(aiLog.locationId, input.locationId)
          : isNull(aiLog.locationId),
      ),
    );
}
