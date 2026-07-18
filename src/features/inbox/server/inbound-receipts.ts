import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { inboundMessageReceipt, inboxRoute, providerAccount } from "@/db/schema";
import type { ResendWebhookEvent } from "@/features/delivery/lib/resend-event-contract";
import { inngest } from "@/inngest/client";
import { parseConversationReplyAddress } from "@/features/inbox/lib/reply-routing";

type RecordResendInboundReceiptInput = {
  providerAccountId: string;
  organizationId: string;
  locationId: string | null;
  providerEventId: string;
  payloadHash: string;
  event: ResendWebhookEvent;
};

export async function recordResendInboundReceipt(
  input: RecordResendInboundReceiptInput,
): Promise<{ receiptId: string; duplicate: boolean }> {
  if (input.event.type !== "email.received") {
    throw new Error("Only verified email.received events can create receipts.");
  }
  return db.transaction(async (tx) => {
    const now = new Date();
    const [created] = await tx
      .insert(inboundMessageReceipt)
      .values({
        id: createId(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        providerAccountId: input.providerAccountId,
        provider: "RESEND",
        providerEventId: input.providerEventId,
        providerMessageId: input.event.data.email_id,
        eventType: input.event.type,
        payloadHash: input.payloadHash,
        occurredAt: input.event.created_at,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: inboundMessageReceipt.id });
    if (created) return { receiptId: created.id, duplicate: false };

    const [existing] = await tx
      .select({ id: inboundMessageReceipt.id })
      .from(inboundMessageReceipt)
      .where(
        and(
          eq(inboundMessageReceipt.provider, "RESEND"),
          eq(
            inboundMessageReceipt.providerAccountId,
            input.providerAccountId,
          ),
          eq(
            inboundMessageReceipt.providerMessageId,
            input.event.data.email_id,
          ),
        ),
      )
      .limit(1);
    if (!existing) {
      throw new Error("Verified inbound email receipt could not be persisted.");
    }
    return { receiptId: existing.id, duplicate: true };
  });
}

export async function requestInboundReceiptProcessing(
  receiptId: string,
): Promise<void> {
  await inngest.send({
    name: "inbox/inbound.receipt",
    id: `inbox-inbound-receipt:${receiptId}`,
    data: { receiptId },
  });
}

export async function resolveManagedResendInboundScope(
  recipients: readonly string[],
): Promise<{
  organizationId: string;
  locationId: string | null;
  providerAccountId: string;
} | null> {
  const routes = await db
    .select({
      organizationId: inboxRoute.organizationId,
      locationId: inboxRoute.locationId,
      providerAccountId: inboxRoute.providerAccountId,
      inboundAddress: inboxRoute.inboundAddressNormalized,
    })
    .from(inboxRoute)
    .innerJoin(
      providerAccount,
      and(
        eq(providerAccount.id, inboxRoute.providerAccountId),
        eq(providerAccount.organizationId, inboxRoute.organizationId),
      ),
    )
    .where(
      and(
        eq(inboxRoute.channel, "EMAIL"),
        eq(inboxRoute.isActive, true),
        eq(providerAccount.provider, "RESEND"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
        eq(providerAccount.status, "ACTIVE"),
      ),
    );
  const matches = routes.filter((route) =>
    recipients.some((recipient) => {
      try {
        return (
          parseConversationReplyAddress({
            recipient,
            inboundAddress: route.inboundAddress,
          }).kind !== "NO_MATCH"
        );
      } catch {
        return false;
      }
    }),
  );
  if (matches.length !== 1 || !matches[0]) return null;
  return matches[0];
}
