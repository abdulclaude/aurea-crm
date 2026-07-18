import { NonRetriableError } from "inngest";

import { db } from "@/db";
import { credential } from "@/db/schema";
import { processTelegramUpdate } from "@/features/telegram/server/updates";
import { inngest } from "@/inngest/client";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

const eventSchema = z.object({
  credentialId: z.string().min(1),
  organizationId: z.string().min(1),
  locationId: z.string().nullable(),
  update: z.object({ update_id: z.number() }).passthrough(),
});

export const processTelegramUpdateEvent = inngest.createFunction(
  { id: "process-telegram-update", retries: 3 },
  { event: "telegram/update" },
  async ({ event }) => {
    const input = eventSchema.parse(event.data);
    const row = await db.query.credential.findFirst({
      where: and(
        eq(credential.id, input.credentialId),
        eq(credential.organizationId, input.organizationId),
        input.locationId
          ? eq(credential.locationId, input.locationId)
          : isNull(credential.locationId),
        eq(credential.type, "TELEGRAM_BOT"),
        eq(credential.isActive, true),
      ),
      columns: { id: true },
    });
    if (!row) {
      throw new NonRetriableError("Telegram credential is no longer active.");
    }
    await processTelegramUpdate(input);
    return { processed: true };
  },
);
