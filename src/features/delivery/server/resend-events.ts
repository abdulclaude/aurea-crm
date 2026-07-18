import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { deliveryProviderEvent, outboundDelivery } from "@/db/schema";
import type { ResendWebhookEvent } from "@/features/delivery/lib/resend-event-contract";
import { applyResendEventInTransaction } from "@/features/delivery/server/resend-event-application";

export { resendWebhookEventSchema } from "@/features/delivery/lib/resend-event-contract";

type RecordResendEventInput = {
  providerAccountId: string;
  organizationId: string;
  locationId: string | null;
  providerEventId: string;
  payloadHash: string;
  event: ResendWebhookEvent;
};

export async function recordResendProviderEvent(
  input: RecordResendEventInput,
): Promise<{ duplicate: boolean; matched: boolean }> {
  return db.transaction(async (tx) => {
    const [existingEvent] = await tx
      .select({
        id: deliveryProviderEvent.id,
        deliveryId: deliveryProviderEvent.deliveryId,
      })
      .from(deliveryProviderEvent)
      .where(
        and(
          eq(deliveryProviderEvent.provider, "RESEND"),
          eq(deliveryProviderEvent.providerAccountId, input.providerAccountId),
          eq(deliveryProviderEvent.providerEventId, input.providerEventId),
        ),
      )
      .limit(1);
    if (existingEvent) {
      return { duplicate: true, matched: Boolean(existingEvent.deliveryId) };
    }

    const [delivery] = await tx
      .select()
      .from(outboundDelivery)
      .where(
        and(
          eq(outboundDelivery.provider, "RESEND"),
          eq(outboundDelivery.providerAccountId, input.providerAccountId),
          eq(outboundDelivery.providerMessageId, input.event.data.email_id),
        ),
      )
      .limit(1)
      .for("update");
    const now = new Date();
    const [eventRow] = await tx
      .insert(deliveryProviderEvent)
      .values({
        id: createId(),
        organizationId: delivery?.organizationId ?? input.organizationId,
        locationId: delivery?.locationId ?? input.locationId,
        deliveryId: delivery?.id ?? null,
        provider: "RESEND",
        providerAccountId: input.providerAccountId,
        providerAccountRef: input.providerAccountId,
        providerEventId: input.providerEventId,
        providerMessageId: input.event.data.email_id,
        eventType: input.event.type,
        occurredAt: input.event.created_at,
        verifiedAt: now,
        payloadHash: input.payloadHash,
        safeMetadata: {
          bounceType: input.event.data.bounce?.type,
          bounceSubType: input.event.data.bounce?.subType,
        },
        applyError: delivery ? null : "UNMATCHED_PROVIDER_MESSAGE",
      })
      .onConflictDoNothing()
      .returning();
    if (!eventRow) return { duplicate: true, matched: Boolean(delivery) };
    if (!delivery) return { duplicate: false, matched: false };

    await applyResendEventInTransaction(tx, eventRow, delivery);
    return { duplicate: false, matched: true };
  });
}

export async function reconcilePendingResendEvents(
  providerAccountId: string,
  providerMessageId: string,
): Promise<number> {
  const pendingEvents = await db
    .select({ id: deliveryProviderEvent.id })
    .from(deliveryProviderEvent)
    .where(
      and(
        eq(deliveryProviderEvent.provider, "RESEND"),
        eq(deliveryProviderEvent.providerAccountId, providerAccountId),
        eq(deliveryProviderEvent.providerMessageId, providerMessageId),
        isNull(deliveryProviderEvent.deliveryId),
        isNull(deliveryProviderEvent.appliedAt),
      ),
    )
    .limit(50);

  let applied = 0;
  for (const pendingEvent of pendingEvents) {
    const didApply = await db.transaction(async (tx) => {
      const [eventRow] = await tx
        .select()
        .from(deliveryProviderEvent)
        .where(
          and(
            eq(deliveryProviderEvent.id, pendingEvent.id),
            isNull(deliveryProviderEvent.appliedAt),
          ),
        )
        .limit(1)
        .for("update");
      if (!eventRow) return false;

      const [delivery] = await tx
        .select()
        .from(outboundDelivery)
        .where(
          and(
            eq(outboundDelivery.provider, "RESEND"),
            eq(outboundDelivery.providerAccountId, providerAccountId),
            eq(outboundDelivery.providerMessageId, providerMessageId),
          ),
        )
        .limit(1)
        .for("update");
      if (!delivery) return false;

      await applyResendEventInTransaction(tx, eventRow, delivery);
      return true;
    });
    if (didApply) applied += 1;
  }

  return applied;
}
