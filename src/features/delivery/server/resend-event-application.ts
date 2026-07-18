import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  client,
  communicationSuppression,
  deliveryProviderEvent,
  outboundDelivery,
} from "@/db/schema";
import type { OutboundDeliveryStatus } from "@/features/delivery/contracts";
import {
  getResendEventBehavior,
  resendEventTypeSchema,
} from "@/features/delivery/lib/resend-event-contract";
import {
  canTransitionDeliveryStatus,
  projectProviderEventStatus,
} from "@/features/delivery/lib/state-machine";
import { recordCampaignDispatchOutcome } from "@/features/delivery/server/campaign-source";
import { applyCampaignProviderEvent } from "@/features/delivery/server/campaign-provider-events";
import type { DeliveryTransaction } from "@/features/delivery/server/outbox";
import { projectInvoiceReminderDelivery } from "@/features/invoicing/server/invoice-reminder-delivery";

const safeMetadataSchema = z
  .object({ bounceType: z.string().optional() })
  .passthrough();

function getProjectedStatus(
  currentStatus: OutboundDeliveryStatus,
  behavior: ReturnType<typeof getResendEventBehavior>,
): OutboundDeliveryStatus {
  if (
    behavior.sourceOutcome === "FAILED" &&
    canTransitionDeliveryStatus(currentStatus, "DEAD_LETTER")
  ) {
    return "DEAD_LETTER";
  }
  if (
    behavior.sourceOutcome === "SUPPRESSED" &&
    canTransitionDeliveryStatus(currentStatus, "SUPPRESSED")
  ) {
    return "SUPPRESSED";
  }

  const acceptedStatus =
    behavior.provesAcceptance &&
    (currentStatus === "SENDING" || currentStatus === "UNKNOWN")
      ? "ACCEPTED"
      : currentStatus;
  return behavior.kind
    ? projectProviderEventStatus(acceptedStatus, behavior.kind).status
    : acceptedStatus;
}

async function applySuppression(
  tx: DeliveryTransaction,
  eventType: ReturnType<typeof resendEventTypeSchema.parse>,
  bounceType: string | undefined,
  delivery: typeof outboundDelivery.$inferSelect,
  occurredAt: Date,
): Promise<void> {
  const isComplaint = eventType === "email.complained";
  const isPermanentBounce =
    eventType === "email.bounced" && bounceType?.toLowerCase() === "permanent";
  const isProviderSuppressed = eventType === "email.suppressed";
  if (!isComplaint && !isPermanentBounce && !isProviderSuppressed) return;

  await tx
    .insert(communicationSuppression)
    .values({
      id: createId(),
      organizationId: delivery.organizationId,
      locationId: delivery.locationId,
      clientId: delivery.clientId,
      channel: "EMAIL",
      scope: "ALL",
      reason: isComplaint ? "COMPLAINT" : "HARD_BOUNCE",
      destinationNormalized: delivery.destinationNormalized,
      sourceDeliveryId: delivery.id,
      activeAt: occurredAt,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  if (isComplaint && delivery.clientId) {
    await tx
      .update(client)
      .set({
        emailUnsubscribed: true,
        emailUnsubscribedAt: occurredAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(client.id, delivery.clientId),
          eq(client.organizationId, delivery.organizationId),
        ),
      );
  }
}

export async function applyResendEventInTransaction(
  tx: DeliveryTransaction,
  eventRow: typeof deliveryProviderEvent.$inferSelect,
  delivery: typeof outboundDelivery.$inferSelect,
): Promise<void> {
  if (eventRow.appliedAt) return;

  const eventType = resendEventTypeSchema.parse(eventRow.eventType);
  const behavior = getResendEventBehavior(eventType);
  const projectedStatus = getProjectedStatus(delivery.status, behavior);
  const acceptedFromProviderEvent =
    behavior.provesAcceptance &&
    (delivery.status === "SENDING" || delivery.status === "UNKNOWN");

  const [updatedDelivery] = await tx
    .update(outboundDelivery)
    .set({
      status: projectedStatus,
      providerMessageId: eventRow.providerMessageId,
      acceptedAt:
        acceptedFromProviderEvent && !delivery.acceptedAt
          ? eventRow.occurredAt
          : undefined,
      deliveredAt:
        behavior.kind === "DELIVERED" && !delivery.deliveredAt
          ? eventRow.occurredAt
          : undefined,
      bouncedAt:
        behavior.kind === "BOUNCED" && !delivery.bouncedAt
          ? eventRow.occurredAt
          : undefined,
      delayedAt:
        behavior.kind === "DELAYED" && !delivery.delayedAt
          ? eventRow.occurredAt
          : undefined,
      openedAt:
        behavior.kind === "OPENED" && !delivery.openedAt
          ? eventRow.occurredAt
          : undefined,
      clickedAt:
        behavior.kind === "CLICKED" && !delivery.clickedAt
          ? eventRow.occurredAt
          : undefined,
      lastFailureClass: behavior.sourceOutcome
        ? "TERMINAL"
        : behavior.provesAcceptance
          ? null
          : undefined,
      lastErrorCode:
        behavior.sourceOutcome === "FAILED"
          ? "RESEND_EMAIL_FAILED"
          : behavior.sourceOutcome === "SUPPRESSED"
            ? "RESEND_EMAIL_SUPPRESSED"
            : behavior.provesAcceptance
              ? null
              : undefined,
      lastErrorMessage:
        behavior.sourceOutcome === "FAILED"
          ? "Resend reported that the email failed"
          : behavior.sourceOutcome === "SUPPRESSED"
            ? "Resend suppressed the email"
            : behavior.provesAcceptance
              ? null
              : undefined,
      claimToken:
        projectedStatus === "SENDING" || projectedStatus === "UNKNOWN"
          ? undefined
          : null,
      leaseExpiresAt:
        projectedStatus === "SENDING" || projectedStatus === "UNKNOWN"
          ? undefined
          : null,
      updatedAt: new Date(),
    })
    .where(eq(outboundDelivery.id, delivery.id))
    .returning();

  if (updatedDelivery) {
    await projectInvoiceReminderDelivery(tx, updatedDelivery);
  }

  if (behavior.sourceOutcome) {
    await recordCampaignDispatchOutcome(
      tx,
      delivery.id,
      behavior.sourceOutcome,
      behavior.sourceOutcome === "FAILED"
        ? "RESEND_EMAIL_FAILED"
        : "RESEND_EMAIL_SUPPRESSED",
    );
  } else if (behavior.provesAcceptance) {
    await recordCampaignDispatchOutcome(tx, delivery.id, "ACCEPTED");
  }

  await applyCampaignProviderEvent(
    tx,
    delivery.id,
    behavior.kind,
    eventRow.occurredAt,
  );
  const safeMetadata = safeMetadataSchema.parse(eventRow.safeMetadata);
  await applySuppression(
    tx,
    eventType,
    safeMetadata.bounceType,
    delivery,
    eventRow.occurredAt,
  );

  await tx
    .update(deliveryProviderEvent)
    .set({
      organizationId: delivery.organizationId,
      locationId: delivery.locationId,
      deliveryId: delivery.id,
      appliedAt: new Date(),
      applyError: null,
    })
    .where(eq(deliveryProviderEvent.id, eventRow.id));
}
