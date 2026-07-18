import "server-only";

import { and, inArray, lt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { communicationWebhookReceipt } from "@/db/schema";

const daysSchema = z.coerce.number().int().min(1).max(365);

export async function purgeExpiredCommunicationReceipts(): Promise<number> {
  const parsed = daysSchema.safeParse(
    process.env.AUREA_COMMUNICATIONS_WEBHOOK_RETENTION_DAYS ?? "30",
  );
  if (!parsed.success) {
    throw new Error("AUREA_COMMUNICATIONS_WEBHOOK_RETENTION_DAYS is invalid.");
  }
  const cutoff = new Date(Date.now() - parsed.data * 86_400_000);
  const deleted = await db
    .delete(communicationWebhookReceipt)
    .where(
      and(
        inArray(communicationWebhookReceipt.status, [
          "PROCESSED",
          "DEAD_LETTER",
        ]),
        lt(communicationWebhookReceipt.occurredAt, cutoff),
      ),
    )
    .returning({ id: communicationWebhookReceipt.id });
  return deleted.length;
}
