import "server-only";

import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  communicationSuppression,
  communicationServiceProfile,
  communicationUsageLedger,
  deliveryProviderEvent,
  inboxConversation,
  inboxConversationEvent,
  inboxMessage,
  inboxRoute,
  outboundDelivery,
  smsMessage,
  twilioPhoneNumber,
} from "@/db/schema";
import { normalizePhoneDestination } from "@/features/delivery/lib/normalization";
import { projectProviderEventStatus } from "@/features/delivery/lib/state-machine";
import { applyCampaignProviderEvent } from "@/features/delivery/server/campaign-provider-events";
import type { z } from "zod";
import {
  twilioInboundSmsSchema,
  twilioSmsStatusSchema,
} from "./twilio-webhook-receipts";
import { smsSegmentReservationAmount } from "./sms-spend-policy";
import { reserveSmsSpend } from "./sms-spend-policy";
import { enqueueDeliveryInTransaction } from "@/features/delivery/server/outbox";
import { requestDeliveryDispatch } from "@/features/delivery/server/request-dispatch";
import { applyTestingPlanAccess } from "./profile-service";

type StatusEvent = z.infer<typeof twilioSmsStatusSchema>;
type InboundEvent = z.infer<typeof twilioInboundSmsSchema>;

const STOP_WORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
]);
const START_WORDS = new Set(["START", "UNSTOP"]);
const HELP_RESPONSE =
  "Reply STOP to opt out of messages. Reply START to opt back in.";

function billingPeriod(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export async function applyTwilioSmsStatus(input: {
  receiptId: string;
  providerEventId: string;
  providerAccountId: string;
  organizationId: string;
  payloadHash: string;
  occurredAt: Date;
  event: StatusEvent;
}) {
  const [delivery] = await db
    .select()
    .from(outboundDelivery)
    .where(
      and(
        eq(outboundDelivery.provider, "TWILIO"),
        eq(outboundDelivery.providerAccountId, input.providerAccountId),
        eq(outboundDelivery.providerMessageId, input.event.MessageSid),
      ),
    )
    .limit(1);
  if (!delivery)
    throw new Error("The Twilio delivery has not been correlated yet.");
  const status = input.event.MessageStatus.toLowerCase();
  const kind =
    status === "delivered"
      ? ("DELIVERED" as const)
      : ["failed", "undelivered", "canceled"].includes(status)
        ? ("BOUNCED" as const)
        : ("SENT" as const);
  await db.transaction(async (tx) => {
    const [lockedDelivery] = await tx
      .select()
      .from(outboundDelivery)
      .where(eq(outboundDelivery.id, delivery.id))
      .limit(1)
      .for("update");
    if (!lockedDelivery) {
      throw new Error("The correlated Twilio delivery no longer exists.");
    }
    const projection = projectProviderEventStatus(lockedDelivery.status, kind);
    const [createdEvent] = await tx
      .insert(deliveryProviderEvent)
      .values({
        id: createId(),
        organizationId: delivery.organizationId,
        locationId: delivery.locationId,
        deliveryId: delivery.id,
        provider: "TWILIO",
        providerAccountId: input.providerAccountId,
        providerAccountRef: input.providerAccountId,
        providerEventId: input.providerEventId,
        providerMessageId: input.event.MessageSid,
        eventType: `message.${status}`,
        occurredAt: input.occurredAt,
        verifiedAt: new Date(),
        payloadHash: input.payloadHash,
        safeMetadata: { errorCode: input.event.ErrorCode },
        appliedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: deliveryProviderEvent.id });
    if (!createdEvent) return;
    await tx
      .update(outboundDelivery)
      .set({
        status: projection.status,
        deliveredAt:
          kind === "DELIVERED" && !lockedDelivery.deliveredAt
            ? input.occurredAt
            : undefined,
        bouncedAt:
          kind === "BOUNCED" && !lockedDelivery.bouncedAt
            ? input.occurredAt
            : undefined,
        lastFailureClass: kind === "BOUNCED" ? "TERMINAL" : undefined,
        lastErrorCode:
          kind === "BOUNCED"
            ? (input.event.ErrorCode ?? "TWILIO_UNDELIVERED")
            : undefined,
        lastErrorMessage:
          kind === "BOUNCED" ? `Twilio reported ${status}` : undefined,
        updatedAt: new Date(),
      })
      .where(eq(outboundDelivery.id, delivery.id));
    await tx
      .update(smsMessage)
      .set({
        status:
          kind === "DELIVERED"
            ? "DELIVERED"
            : kind === "BOUNCED"
              ? status === "undelivered"
                ? "UNDELIVERED"
                : "FAILED"
              : "SENT",
        deliveredAt: kind === "DELIVERED" ? input.occurredAt : undefined,
        errorCode: kind === "BOUNCED" ? input.event.ErrorCode : undefined,
      })
      .where(eq(smsMessage.deliveryId, delivery.id));
    await applyCampaignProviderEvent(tx, delivery.id, kind, input.occurredAt);
    if (kind === "DELIVERED" || kind === "BOUNCED") {
      const [reservation] = await tx
        .select()
        .from(communicationUsageLedger)
        .where(
          and(
            eq(
              communicationUsageLedger.organizationId,
              delivery.organizationId,
            ),
            eq(communicationUsageLedger.deliveryId, delivery.id),
            eq(communicationUsageLedger.entryKind, "RESERVATION"),
          ),
        )
        .limit(1);
      if (reservation) {
        await tx
          .insert(communicationUsageLedger)
          .values({
            id: createId(),
            organizationId: delivery.organizationId,
            locationId: delivery.locationId,
            clientId: delivery.clientId,
            provider: "TWILIO",
            providerAccountId: input.providerAccountId,
            phoneNumberId: reservation.phoneNumberId,
            deliveryId: delivery.id,
            entryKind: "RELEASE",
            resourceType: "SMS_SEGMENT",
            idempotencyKey: `twilio:sms:${delivery.id}:reservation-release`,
            providerEventId: input.providerEventId,
            providerResourceId: input.event.MessageSid,
            quantity: reservation.quantity,
            unit: "segment",
            providerCost: "0",
            customerCharge: reservation.customerCharge,
            currency: reservation.currency,
            occurredAt: input.occurredAt,
            billingPeriod: reservation.billingPeriod,
            metadata: { finalStatus: status },
          })
          .onConflictDoNothing();
      }
      const providerCost = input.event.Price
        ? input.event.Price.replace(/^-/, "")
        : "0";
      const providerUsageInsert = tx.insert(communicationUsageLedger).values({
        id: createId(),
        organizationId: delivery.organizationId,
        locationId: delivery.locationId,
        clientId: delivery.clientId,
        provider: "TWILIO",
        providerAccountId: input.providerAccountId,
        deliveryId: delivery.id,
        entryKind: "USAGE",
        resourceType: "SMS_SEGMENT",
        idempotencyKey: `twilio:sms:${input.event.MessageSid}:segments`,
        providerEventId: input.providerEventId,
        providerResourceId: input.event.MessageSid,
        quantity: input.event.NumSegments ?? "1",
        unit: "segment",
        providerCost,
        customerCharge: "0",
        currency: input.event.PriceUnit ?? "USD",
        occurredAt: input.occurredAt,
        billingPeriod: billingPeriod(input.occurredAt),
        metadata: {
          status,
          costPendingReconciliation: !input.event.Price,
        },
      });
      if (input.event.Price) {
        await providerUsageInsert.onConflictDoUpdate({
          target: [
            communicationUsageLedger.organizationId,
            communicationUsageLedger.idempotencyKey,
          ],
          set: {
            providerEventId: input.providerEventId,
            providerCost,
            currency: input.event.PriceUnit ?? "USD",
            metadata: { status, costPendingReconciliation: false },
          },
        });
      } else {
        await providerUsageInsert.onConflictDoNothing();
      }
      if (reservation) {
        await tx
          .insert(communicationUsageLedger)
          .values({
            id: createId(),
            organizationId: delivery.organizationId,
            locationId: delivery.locationId,
            clientId: delivery.clientId,
            provider: "TWILIO",
            providerAccountId: input.providerAccountId,
            phoneNumberId: reservation.phoneNumberId,
            deliveryId: delivery.id,
            entryKind: "USAGE",
            resourceType: "SMS_SEGMENT",
            idempotencyKey: `twilio:sms:${input.event.MessageSid}:customer-charge`,
            providerEventId: input.providerEventId,
            providerResourceId: input.event.MessageSid,
            quantity: input.event.NumSegments ?? "1",
            unit: "segment",
            providerCost: "0",
            customerCharge: sql`${reservation.customerCharge}::numeric / nullif(${reservation.quantity}::numeric, 0) * ${input.event.NumSegments ?? "1"}::numeric`,
            currency: reservation.currency,
            occurredAt: input.occurredAt,
            billingPeriod: reservation.billingPeriod,
            metadata: { status, basis: "configured-segment-rate" },
          })
          .onConflictDoNothing();
      }
    }
  });
}

async function applyOptOut(input: {
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  sender: string;
  body: string;
  occurredAt: Date;
}) {
  const keyword = input.body.trim().toUpperCase();
  if (STOP_WORDS.has(keyword)) {
    await db
      .insert(communicationSuppression)
      .values({
        id: createId(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        clientId: input.clientId,
        channel: "SMS",
        scope: "ALL",
        reason: "SMS_STOP",
        destinationNormalized: input.sender,
        activeAt: input.occurredAt,
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  } else if (START_WORDS.has(keyword)) {
    await db
      .update(communicationSuppression)
      .set({ revokedAt: input.occurredAt, updatedAt: new Date() })
      .where(
        and(
          eq(communicationSuppression.organizationId, input.organizationId),
          input.locationId
            ? eq(communicationSuppression.locationId, input.locationId)
            : isNull(communicationSuppression.locationId),
          eq(communicationSuppression.channel, "SMS"),
          eq(communicationSuppression.destinationNormalized, input.sender),
          eq(communicationSuppression.reason, "SMS_STOP"),
          isNull(communicationSuppression.revokedAt),
        ),
      );
  }
}

async function queueControlledHelpResponse(input: {
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  providerAccountId: string;
  phoneNumberId: string;
  destination: string;
  profile: typeof communicationServiceProfile.$inferSelect | undefined;
  occurredAt: Date;
}): Promise<void> {
  const profile = input.profile
    ? applyTestingPlanAccess(input.profile)
    : undefined;
  if (
    !profile?.smsEntitledAt ||
    ["SUSPENDED", "RELEASED", "CANCELLATION_GRACE_PERIOD"].includes(
      profile.smsState,
    )
  ) {
    return;
  }
  const destinationHash = createHash("sha256")
    .update(input.destination)
    .digest("hex");
  const day = input.occurredAt.toISOString().slice(0, 10);
  const markerKey = `twilio:sms:help:${input.phoneNumberId}:${destinationHash}:${day}`;
  const queued = await db.transaction(async (tx) => {
    const [marker] = await tx
      .insert(communicationUsageLedger)
      .values({
        id: createId(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        clientId: input.clientId,
        provider: "TWILIO",
        providerAccountId: input.providerAccountId,
        phoneNumberId: input.phoneNumberId,
        entryKind: "ADJUSTMENT",
        resourceType: "SMS_SEGMENT",
        idempotencyKey: markerKey,
        quantity: "0",
        unit: "help-response-request",
        providerCost: "0",
        customerCharge: "0",
        currency: input.profile?.spendCurrency ?? "USD",
        occurredAt: input.occurredAt,
        billingPeriod: billingPeriod(input.occurredAt),
        metadata: { kind: "SMS_HELP_RESPONSE", rateLimit: "daily" },
      })
      .onConflictDoNothing()
      .returning({ id: communicationUsageLedger.id });
    if (!marker) return false;
    const { delivery, suppression } = await enqueueDeliveryInTransaction(tx, {
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: input.clientId,
      channel: "SMS",
      purpose: "TRANSACTIONAL",
      provider: "TWILIO",
      providerAccountId: input.providerAccountId,
      providerAccountRef: input.providerAccountId,
      sourceType: "SYSTEM",
      sourceId: marker.id,
      destination: input.destination,
      sender: { kind: "TWILIO_PHONE_NUMBER", id: input.phoneNumberId },
      payload: { channel: "SMS", body: HELP_RESPONSE },
      idempotencyKey: markerKey,
      maxAttempts: 3,
    });
    if (suppression) return false;
    await reserveSmsSpend({
      tx,
      organizationId: input.organizationId,
      locationId: input.locationId,
      providerAccountId: input.providerAccountId,
      phoneNumberId: input.phoneNumberId,
      deliveries: [{ id: delivery.id, clientId: input.clientId }],
      body: HELP_RESPONSE,
      at: input.occurredAt,
    });
    return true;
  });
  if (queued) await requestDeliveryDispatch(input.organizationId);
}

export async function applyTwilioInboundSms(input: {
  receiptId: string;
  providerAccountId: string;
  organizationId: string;
  occurredAt: Date;
  event: InboundEvent;
}) {
  const from = normalizePhoneDestination(input.event.From);
  const to = normalizePhoneDestination(input.event.To);
  const [phone] = await db
    .select()
    .from(twilioPhoneNumber)
    .where(
      and(
        eq(twilioPhoneNumber.organizationId, input.organizationId),
        eq(twilioPhoneNumber.providerAccountId, input.providerAccountId),
        eq(twilioPhoneNumber.phoneNumber, to),
        eq(twilioPhoneNumber.status, "ACTIVE"),
        eq(twilioPhoneNumber.smsEnabled, true),
      ),
    )
    .limit(1);
  if (!phone)
    throw new Error("Inbound SMS did not match an active phone number.");
  const clientMatches = await db
    .select({ id: client.id })
    .from(client)
    .where(
      and(
        eq(client.organizationId, input.organizationId),
        phone.locationId
          ? eq(client.locationId, phone.locationId)
          : isNull(client.locationId),
        eq(client.phone, from),
      ),
    )
    .limit(2);
  const clientId = clientMatches.length === 1 ? clientMatches[0]!.id : null;
  const profile = await db.query.communicationServiceProfile.findFirst({
    where: eq(communicationServiceProfile.organizationId, input.organizationId),
  });
  await applyOptOut({
    organizationId: input.organizationId,
    locationId: phone.locationId,
    clientId,
    sender: from,
    body: input.event.Body,
    occurredAt: input.occurredAt,
  });
  const [route] = await db
    .select()
    .from(inboxRoute)
    .where(
      and(
        eq(inboxRoute.organizationId, input.organizationId),
        eq(inboxRoute.providerAccountId, input.providerAccountId),
        eq(inboxRoute.channel, "SMS"),
        eq(inboxRoute.inboundAddressNormalized, to),
        eq(inboxRoute.isActive, true),
      ),
    )
    .limit(1);
  if (!route) throw new Error("Inbound SMS route is not configured.");
  const existingConversation = clientId
    ? await db.query.inboxConversation.findFirst({
        where: and(
          eq(inboxConversation.organizationId, input.organizationId),
          eq(inboxConversation.routeId, route.id),
          eq(inboxConversation.clientId, clientId),
          eq(inboxConversation.channel, "SMS"),
          eq(inboxConversation.status, "OPEN"),
        ),
        orderBy: [desc(inboxConversation.lastMessageAt)],
      })
    : null;
  await db.transaction(async (tx) => {
    const [duplicate] = await tx
      .select({ id: smsMessage.id })
      .from(smsMessage)
      .where(eq(smsMessage.providerSid, input.event.MessageSid))
      .limit(1);
    if (duplicate) return;
    const conversationId = existingConversation?.id ?? createId();
    if (!existingConversation) {
      await tx.insert(inboxConversation).values({
        id: conversationId,
        organizationId: input.organizationId,
        locationId: phone.locationId,
        clientId,
        routeId: route.id,
        assigneeStaffIdentityId: route.defaultAssigneeStaffIdentityId,
        assignedAt: route.defaultAssigneeStaffIdentityId ? new Date() : null,
        channel: "SMS",
        status: "OPEN",
        isRead: false,
        lastMessageAt: input.occurredAt,
        updatedAt: new Date(),
      });
    }
    await tx.insert(smsMessage).values({
      id: createId(),
      organizationId: input.organizationId,
      locationId: phone.locationId,
      clientId,
      to,
      from,
      body: input.event.Body,
      direction: "INBOUND",
      status: "DELIVERED",
      providerSid: input.event.MessageSid,
      deliveredAt: input.occurredAt,
    });
    await tx.insert(inboxMessage).values({
      id: createId(),
      conversationId,
      direction: "INBOUND",
      content: input.event.Body || "[Empty SMS]",
      isRead: false,
      providerAccountId: input.providerAccountId,
      externalMessageId: input.event.MessageSid,
      fromAddress: from,
      toAddress: to,
      createdAt: input.occurredAt,
    });
    await tx
      .update(inboxConversation)
      .set({
        clientId,
        status: "OPEN",
        isRead: false,
        lastMessageAt: input.occurredAt,
        updatedAt: new Date(),
      })
      .where(eq(inboxConversation.id, conversationId));
    await tx.insert(inboxConversationEvent).values({
      id: createId(),
      organizationId: input.organizationId,
      locationId: phone.locationId,
      conversationId,
      eventType: "INBOUND_RECEIVED",
      targetStaffIdentityId:
        existingConversation?.assigneeStaffIdentityId ??
        route.defaultAssigneeStaffIdentityId,
      metadata: { provider: "TWILIO", receiptId: input.receiptId },
    });
    await tx
      .insert(communicationUsageLedger)
      .values({
        id: createId(),
        organizationId: input.organizationId,
        locationId: phone.locationId,
        clientId,
        provider: "TWILIO",
        providerAccountId: input.providerAccountId,
        phoneNumberId: phone.id,
        entryKind: "USAGE",
        resourceType: "SMS_SEGMENT",
        idempotencyKey: `twilio:sms:${input.event.MessageSid}:inbound`,
        providerResourceId: input.event.MessageSid,
        quantity: input.event.NumSegments,
        unit: "segment",
        providerCost: "0",
        customerCharge: "0",
        currency: "USD",
        occurredAt: input.occurredAt,
        billingPeriod: billingPeriod(input.occurredAt),
        metadata: { direction: "INBOUND", costPendingReconciliation: true },
      })
      .onConflictDoNothing();
    const customerRate = smsSegmentReservationAmount();
    let customerChargePermitted = false;
    if (customerRate && profile?.smsMonthlySpendLimit) {
      const period = billingPeriod(input.occurredAt);
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`${input.organizationId}:SMS:${period}`}))`,
      );
      const [budget] = await tx
        .select({
          permitted: sql<boolean>`(
            coalesce(sum(CASE
              WHEN ${communicationUsageLedger.entryKind} = 'RELEASE'
                THEN -${communicationUsageLedger.customerCharge}
              ELSE ${communicationUsageLedger.customerCharge}
            END), 0)
            + (${customerRate}::numeric * ${input.event.NumSegments}::numeric)
          ) <= ${profile.smsMonthlySpendLimit}::numeric`,
        })
        .from(communicationUsageLedger)
        .where(
          and(
            eq(
              communicationUsageLedger.organizationId,
              input.organizationId,
            ),
            eq(communicationUsageLedger.billingPeriod, period),
            eq(communicationUsageLedger.currency, profile.spendCurrency),
            eq(communicationUsageLedger.resourceType, "SMS_SEGMENT"),
          ),
        );
      customerChargePermitted = budget?.permitted === true;
      if (!customerChargePermitted) {
        await tx
          .update(communicationServiceProfile)
          .set({ smsState: "SUSPENDED", updatedAt: new Date() })
          .where(
            eq(
              communicationServiceProfile.organizationId,
              input.organizationId,
            ),
          );
      }
    }
    if (customerRate && profile && customerChargePermitted) {
      await tx
        .insert(communicationUsageLedger)
        .values({
          id: createId(),
          organizationId: input.organizationId,
          locationId: phone.locationId,
          clientId,
          provider: "TWILIO",
          providerAccountId: input.providerAccountId,
          phoneNumberId: phone.id,
          entryKind: "USAGE",
          resourceType: "SMS_SEGMENT",
          idempotencyKey: `twilio:sms:${input.event.MessageSid}:inbound-customer-charge`,
          providerResourceId: input.event.MessageSid,
          quantity: input.event.NumSegments,
          unit: "segment",
          providerCost: "0",
          customerCharge: sql`${customerRate}::numeric * ${input.event.NumSegments}::numeric`,
          currency: profile.spendCurrency,
          occurredAt: input.occurredAt,
          billingPeriod: billingPeriod(input.occurredAt),
          metadata: { direction: "INBOUND", basis: "configured-segment-rate" },
        })
        .onConflictDoNothing();
    }
  });
  if (input.event.Body.trim().toUpperCase() === "HELP") {
    try {
      await queueControlledHelpResponse({
        organizationId: input.organizationId,
        locationId: phone.locationId,
        clientId,
        providerAccountId: input.providerAccountId,
        phoneNumberId: phone.id,
        destination: from,
        profile,
        occurredAt: input.occurredAt,
      });
    } catch (error) {
      console.error("Controlled SMS HELP response was not queued", {
        organizationId: input.organizationId,
        receiptId: input.receiptId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
