import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { booking, bookingEventType, client, deal } from "@/db/schema";
import {
  bookingFitsBusinessHours,
  guestBookingPolicyError,
} from "@/features/workspace-settings/lib/booking-operations-policy";
import type { RequiredWorkspaceOperationsValues } from "@/features/workspace-settings/operations-contracts";

import type {
  CalComBookingPayload,
  CalComWebhookEvent,
} from "./calcom-webhook-contract";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type CalComWebhookScope = {
  credentialId: string;
  organizationId: string;
  locationId: string;
};

export type CalComBookingApplicationResult = {
  bookingId: string | null;
  outcome: string;
  status: "PROCESSED" | "IGNORED";
};

export type CalComBookingPolicyContext = {
  operations: RequiredWorkspaceOperationsValues;
  timezone: string;
};

export async function applyCalComBookingEvent(
  tx: Transaction,
  scope: CalComWebhookScope,
  event: CalComWebhookEvent,
  now: Date,
  policyContext: CalComBookingPolicyContext | null,
): Promise<CalComBookingApplicationResult> {
  const providerTime = calComProviderEventTime(event) ?? now;
  if (event.triggerEvent === "BOOKING_CREATED") {
    return applyBookingCreated(
      tx,
      scope,
      event.payload,
      now,
      providerTime,
      policyContext,
    );
  }
  if (event.triggerEvent === "BOOKING_RESCHEDULED") {
    return applyBookingRescheduled(
      tx,
      scope,
      event.payload,
      now,
      providerTime,
      policyContext,
    );
  }
  return applyBookingCancelled(tx, scope, event.payload, now, providerTime);
}

async function applyBookingCreated(
  tx: Transaction,
  scope: CalComWebhookScope,
  payload: CalComBookingPayload,
  now: Date,
  providerTime: Date,
  policyContext: CalComBookingPolicyContext | null,
): Promise<CalComBookingApplicationResult> {
  const times = parseBookingTimes(payload);
  const uid = calComBookingUid(payload);
  const remoteEventTypeId = payload.eventTypeId ?? payload.eventType?.id;
  if (!uid || !remoteEventTypeId || !times) {
    return ignored("INVALID_BOOKING_CREATED_PAYLOAD");
  }
  const eventType = await tx.query.bookingEventType.findFirst({
    where: and(
      eq(bookingEventType.calEventTypeId, remoteEventTypeId),
      eq(bookingEventType.calComCredentialId, scope.credentialId),
      eq(bookingEventType.organizationId, scope.organizationId),
      eq(bookingEventType.locationId, scope.locationId),
    ),
  });
  if (!eventType) return ignored("EVENT_TYPE_NOT_MAPPED");

  const [clientId, dealId] = await resolveScopedReferences(
    tx,
    scope,
    payload.metadata,
  );
  const attendee = payload.attendees?.[0];
  const values = {
    calBookingId: payload.bookingId ?? payload.id,
    calComCredentialId: scope.credentialId,
    calLastEventAt: providerTime,
    eventTypeId: eventType.id,
    clientId,
    dealId,
    title: payload.title || eventType.title,
    description: payload.description || eventType.description,
    status: "CONFIRMED" as const,
    attendeeName: attendee?.name || "",
    attendeeEmail: attendee?.email || "",
    attendeeTimezone: attendee?.timeZone || "UTC",
    startTime: times.startTime,
    endTime: times.endTime,
    duration: times.duration,
    locationType: eventType.locationType,
    metadata: calComBookingMetadata(payload, times, policyContext, now),
    lastSyncedAt: now,
    updatedAt: now,
  };
  const existing = await findBookingByUid(tx, scope, uid);
  if (existing) {
    if (isStaleEvent(existing.calLastEventAt, providerTime)) {
      return ignored("STALE_BOOKING_EVENT");
    }
    await tx.update(booking).set(values).where(eq(booking.id, existing.id));
    return processed(existing.id, "BOOKING_UPDATED");
  }

  const bookingId = createId();
  await tx.insert(booking).values({
    id: bookingId,
    organizationId: scope.organizationId,
    locationId: scope.locationId,
    calBookingUid: uid,
    ...values,
    createdAt: now,
  });
  return processed(bookingId, "BOOKING_CREATED");
}

async function applyBookingRescheduled(
  tx: Transaction,
  scope: CalComWebhookScope,
  payload: CalComBookingPayload,
  now: Date,
  providerTime: Date,
  policyContext: CalComBookingPolicyContext | null,
): Promise<CalComBookingApplicationResult> {
  const times = parseBookingTimes(payload);
  const uid = calComBookingUid(payload);
  if (!uid || !times) return ignored("INVALID_RESCHEDULE_PAYLOAD");

  const previousUid =
    payload.rescheduledFromUid ?? payload.rescheduleUid ?? uid;
  const existing = await findBookingByUid(tx, scope, previousUid);
  if (!existing) return ignored("BOOKING_NOT_FOUND");
  if (isStaleEvent(existing.calLastEventAt, providerTime)) {
    return ignored("STALE_BOOKING_EVENT");
  }
  await tx
    .update(booking)
    .set({
      calBookingUid: uid,
      calComCredentialId: scope.credentialId,
      calLastEventAt: providerTime,
      startTime: times.startTime,
      endTime: times.endTime,
      duration: times.duration,
      status: "RESCHEDULED",
      rescheduledFrom:
        payload.rescheduledFromUid ??
        payload.rescheduleUid ??
        existing.calBookingUid,
      metadata: calComBookingMetadata(payload, times, policyContext, now),
      lastSyncedAt: now,
      updatedAt: now,
    })
    .where(eq(booking.id, existing.id));
  return processed(existing.id, "BOOKING_RESCHEDULED");
}

function calComBookingMetadata(
  payload: CalComBookingPayload,
  times: { startTime: Date; endTime: Date; duration: number },
  policyContext: CalComBookingPolicyContext | null,
  evaluatedAt: Date,
) {
  const violations: Array<{ code: string; message: string }> = [];
  if (policyContext) {
    if (
      !bookingFitsBusinessHours({
        start: times.startTime,
        end: times.endTime,
        timezone: policyContext.timezone,
        businessHours: policyContext.operations.businessHours,
      })
    ) {
      violations.push({
        code: "OUTSIDE_BUSINESS_HOURS",
        message: "The provider booking is outside Aurea business hours.",
      });
    }
    const guestError = guestBookingPolicyError({
      guestCount: Math.max(0, (payload.attendees?.length ?? 1) - 1),
      settings: policyContext.operations,
    });
    if (guestError) {
      violations.push({ code: "GUEST_POLICY", message: guestError });
    }
  }

  return {
    source: "CAL_COM",
    providerMetadata: payload.metadata ?? {},
    policyEvaluation: {
      evaluatedAt: evaluatedAt.toISOString(),
      status:
        policyContext === null
          ? "NOT_EVALUATED"
          : violations.length > 0
            ? "EXCEPTION"
            : "COMPLIANT",
      timezone: policyContext?.timezone ?? null,
      violations,
    },
  };
}

async function applyBookingCancelled(
  tx: Transaction,
  scope: CalComWebhookScope,
  payload: CalComBookingPayload,
  now: Date,
  providerTime: Date,
): Promise<CalComBookingApplicationResult> {
  const uid = calComBookingUid(payload);
  if (!uid) return ignored("INVALID_CANCELLATION_PAYLOAD");
  const existing = await findBookingByUid(tx, scope, uid);
  if (!existing) return ignored("BOOKING_NOT_FOUND");
  if (isStaleEvent(existing.calLastEventAt, providerTime)) {
    return ignored("STALE_BOOKING_EVENT");
  }
  await tx
    .update(booking)
    .set({
      status: "CANCELLED",
      cancelledAt: now,
      cancellationReason: payload.cancellationReason,
      calLastEventAt: providerTime,
      lastSyncedAt: now,
      updatedAt: now,
    })
    .where(eq(booking.id, existing.id));
  return processed(existing.id, "BOOKING_CANCELLED");
}

async function findBookingByUid(
  tx: Transaction,
  scope: CalComWebhookScope,
  uid: string,
) {
  return tx.query.booking.findFirst({
    where: and(
      eq(booking.calBookingUid, uid),
      eq(booking.calComCredentialId, scope.credentialId),
      eq(booking.organizationId, scope.organizationId),
      eq(booking.locationId, scope.locationId),
    ),
    columns: { id: true, calBookingUid: true, calLastEventAt: true },
  });
}

async function resolveScopedReferences(
  tx: Transaction,
  scope: CalComWebhookScope,
  metadata: CalComBookingPayload["metadata"],
): Promise<[string | null, string | null]> {
  const scopedClient = metadata?.clientId
    ? await tx.query.client.findFirst({
        where: and(
          eq(client.id, metadata.clientId),
          eq(client.organizationId, scope.organizationId),
          eq(client.locationId, scope.locationId),
        ),
        columns: { id: true },
      })
    : null;
  const scopedDeal = metadata?.dealId
    ? await tx.query.deal.findFirst({
        where: and(
          eq(deal.id, metadata.dealId),
          eq(deal.organizationId, scope.organizationId),
          eq(deal.locationId, scope.locationId),
        ),
        columns: { id: true },
      })
    : null;
  return [scopedClient?.id ?? null, scopedDeal?.id ?? null];
}

function parseBookingTimes(payload: CalComBookingPayload) {
  if (!payload.startTime || !payload.endTime) return null;
  const startTime = new Date(payload.startTime);
  const endTime = new Date(payload.endTime);
  const duration = Math.floor(
    (endTime.getTime() - startTime.getTime()) / 60_000,
  );
  if (
    Number.isNaN(startTime.getTime()) ||
    Number.isNaN(endTime.getTime()) ||
    duration <= 0
  ) {
    return null;
  }
  return { startTime, endTime, duration };
}

export function calComBookingUid(payload: CalComBookingPayload): string | null {
  return payload.uid ?? payload.bookingUid ?? null;
}

export function calComProviderEventTime(
  event: CalComWebhookEvent,
): Date | null {
  if (!event.createdAt) return null;
  const value = new Date(event.createdAt);
  return Number.isNaN(value.getTime()) ? null : value;
}

function isStaleEvent(previous: Date | null, incoming: Date): boolean {
  return Boolean(previous && incoming < previous);
}

function ignored(outcome: string): CalComBookingApplicationResult {
  return { bookingId: null, outcome, status: "IGNORED" };
}

function processed(
  bookingId: string,
  outcome: string,
): CalComBookingApplicationResult {
  return { bookingId, outcome, status: "PROCESSED" };
}
