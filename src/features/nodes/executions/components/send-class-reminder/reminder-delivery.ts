import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { smsConfig, smsMessage } from "@/db/schema";
import { isSmsDestinationAllowed } from "@/features/communications/lib/sms-destination-policy";
import { requireCommunicationEntitlement } from "@/features/communications/server/profile-service";
import { reserveSmsSpend } from "@/features/communications/server/sms-spend-policy";
import { enqueueDeliveryInTransaction } from "@/features/delivery/server/outbox";
import { requestDeliveryDispatch } from "@/features/delivery/server/request-dispatch";
import { enqueueEmail } from "@/features/delivery/server/transactional-email";
import { resolveSmsSender } from "@/features/sms/server/sms-sender";

import type { ClassReminderPlan } from "./reminder-plan";

export async function enqueueClassReminderEmail(input: {
  organizationId: string;
  locationId: string | null;
  plan: ClassReminderPlan;
}) {
  if (input.plan.channel !== "EMAIL" || !input.plan.subject) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A class reminder email requires an email plan and subject.",
    });
  }
  return enqueueEmail({
    organizationId: input.organizationId,
    locationId: input.locationId,
    clientId: input.plan.clientId,
    sourceType: "CLASS_REMINDER",
    sourceId: input.plan.bookingId,
    idempotencyKey: input.plan.idempotencyKey,
    to: input.plan.destination,
    subject: input.plan.subject,
    html: input.plan.htmlBody ?? undefined,
    text: input.plan.textBody || undefined,
    purpose: input.plan.purpose,
    availableAt: input.plan.availableAt,
    communicationRule: input.plan.communicationRule,
  });
}

export async function enqueueClassReminderSms(input: {
  organizationId: string;
  locationId: string | null;
  plan: ClassReminderPlan;
}) {
  if (input.plan.channel !== "SMS" || !input.plan.textBody) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A class reminder SMS requires an SMS plan and body.",
    });
  }
  const profile = await requireCommunicationEntitlement({
    organizationId: input.organizationId,
    channel: "SMS",
  });
  if (
    !isSmsDestinationAllowed(
      input.plan.destination,
      profile.allowedSmsCountries,
    )
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The reminder destination is outside the workspace SMS policy.",
    });
  }
  const sender = await resolveSmsSender({
    organizationId: input.organizationId,
    locationId: input.locationId,
  });
  if (!sender?.isActive) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "SMS is not configured for this workspace.",
    });
  }

  const result = await db.transaction(async (tx) => {
    const queued = await enqueueDeliveryInTransaction(tx, {
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: input.plan.clientId,
      channel: "SMS",
      purpose: input.plan.purpose,
      provider: sender.provider,
      providerAccountId: sender.providerAccountId,
      providerAccountRef: sender.id,
      sourceType: "CLASS_REMINDER",
      sourceId: input.plan.bookingId,
      destination: input.plan.destination,
      sender: { kind: sender.kind, id: sender.id },
      communicationRule: input.plan.communicationRule,
      payload: { channel: "SMS", body: input.plan.textBody },
      idempotencyKey: input.plan.idempotencyKey,
      availableAt: input.plan.availableAt,
      maxAttempts: 5,
    });
    const [insertedMessage] = await tx
      .insert(smsMessage)
      .values({
        id: createId(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        clientId: input.plan.clientId,
        to: queued.delivery.destinationNormalized,
        from: sender.fromNumber,
        body: input.plan.textBody,
        direction: "OUTBOUND",
        status: queued.delivery.status === "SUPPRESSED" ? "FAILED" : "QUEUED",
        errorCode: queued.delivery.lastErrorCode,
        errorMessage: queued.delivery.lastErrorMessage,
        deliveryId: queued.delivery.id,
      })
      .onConflictDoNothing({ target: smsMessage.deliveryId })
      .returning({ id: smsMessage.id });

    if (insertedMessage && queued.delivery.status === "QUEUED") {
      if (sender.kind === "TWILIO_PHONE_NUMBER") {
        await reserveSmsSpend({
          tx,
          organizationId: input.organizationId,
          locationId: input.locationId,
          providerAccountId: sender.providerAccountId,
          phoneNumberId: sender.id,
          deliveries: [
            { id: queued.delivery.id, clientId: input.plan.clientId },
          ],
          body: input.plan.textBody,
          at: new Date(),
        });
      } else {
        const [reserved] = await tx
          .update(smsConfig)
          .set({
            sentThisMonth: sql`${smsConfig.sentThisMonth} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(smsConfig.id, sender.id),
              eq(smsConfig.isActive, true),
              sql`${smsConfig.sentThisMonth} + 1 <= ${smsConfig.monthlyLimit}`,
            ),
          )
          .returning({ id: smsConfig.id });
        if (!reserved) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "The monthly SMS limit would be exceeded.",
          });
        }
      }
    }
    return queued.delivery;
  });

  if (result.status === "QUEUED") {
    await requestDeliveryDispatch(input.organizationId);
  }
  return result;
}
