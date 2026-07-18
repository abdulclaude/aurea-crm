import { createId } from "@paralleldrive/cuid2";
import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { booking, calComCredential, calComWebhookReceipt } from "@/db/schema";
import { matchesAppointmentCreatedTrigger } from "@/features/nodes/triggers/components/appointment-created-trigger/config";
import { getEffectiveWorkspaceOperationsValues } from "@/features/workspace-settings/server/operations-query-service";
import { getEffectiveWorkspaceRegionalValues } from "@/features/workspace-settings/server/query-service";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

import type { CalComWebhookEvent } from "./calcom-webhook-contract";
import {
  applyCalComBookingEvent,
  calComBookingUid,
  calComProviderEventTime,
  type CalComBookingApplicationResult,
  type CalComWebhookScope,
} from "./calcom-webhook-booking-application";

type WebhookResult = CalComBookingApplicationResult & {
  duplicate: boolean;
  receiptId: string;
};

export async function applyCalComWebhook(input: {
  scope: CalComWebhookScope;
  event: CalComWebhookEvent;
  eventKey: string;
}): Promise<WebhookResult> {
  const now = new Date();
  const receiptId = createId();
  const policyContext =
    input.event.triggerEvent === "BOOKING_CANCELLED"
      ? null
      : await loadBookingPolicyContext(input.scope);
  const result = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(calComWebhookReceipt)
      .values({
        id: receiptId,
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        credentialId: input.scope.credentialId,
        eventKey: input.eventKey,
        triggerEvent: input.event.triggerEvent,
        bookingUid: calComBookingUid(input.event.payload),
        providerCreatedAt: calComProviderEventTime(input.event),
        status: "IGNORED",
        outcome: "CLAIMED",
        processedAt: now,
      })
      .onConflictDoNothing({
        target: [
          calComWebhookReceipt.credentialId,
          calComWebhookReceipt.eventKey,
        ],
      })
      .returning({ id: calComWebhookReceipt.id });

    if (!claimed) {
      const existing = await tx.query.calComWebhookReceipt.findFirst({
        where: and(
          eq(calComWebhookReceipt.credentialId, input.scope.credentialId),
          eq(calComWebhookReceipt.eventKey, input.eventKey),
          eq(calComWebhookReceipt.organizationId, input.scope.organizationId),
          eq(calComWebhookReceipt.locationId, input.scope.locationId),
        ),
        columns: {
          id: true,
          bookingId: true,
          outcome: true,
          status: true,
        },
      });
      if (!existing) {
        throw new Error("Cal.com webhook claim could not be resolved");
      }
      return {
        bookingId: existing.bookingId,
        duplicate: true,
        outcome: existing.outcome,
        receiptId: existing.id,
        status: existing.status,
      };
    }

    const bookingResult = await applyCalComBookingEvent(
      tx,
      input.scope,
      input.event,
      now,
      policyContext,
    );
    await tx
      .update(calComWebhookReceipt)
      .set({
        bookingId: bookingResult.bookingId,
        outcome: bookingResult.outcome,
        status: bookingResult.status,
        processedAt: now,
      })
      .where(eq(calComWebhookReceipt.id, claimed.id));
    await tx
      .update(calComCredential)
      .set({
        lastWebhookAt: now,
        lastWebhookError: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(calComCredential.id, input.scope.credentialId),
          eq(calComCredential.organizationId, input.scope.organizationId),
          eq(calComCredential.locationId, input.scope.locationId),
        ),
      );

    return { ...bookingResult, duplicate: false, receiptId: claimed.id };
  });

  if (result.status === "PROCESSED" && result.bookingId) {
    if (input.event.triggerEvent === "BOOKING_RESCHEDULED") return result;
    await dispatchAppointmentWorkflow({
      ...input,
      receiptId: result.receiptId,
      bookingId: result.bookingId,
    });
  }
  return result;
}

async function loadBookingPolicyContext(scope: CalComWebhookScope) {
  const settingsScope = {
    organizationId: scope.organizationId,
    locationId: scope.locationId,
  };
  const [operations, regional] = await Promise.all([
    getEffectiveWorkspaceOperationsValues(settingsScope),
    getEffectiveWorkspaceRegionalValues(settingsScope),
  ]);
  return { operations, timezone: regional.timezone };
}

async function dispatchAppointmentWorkflow(input: {
  scope: CalComWebhookScope;
  event: CalComWebhookEvent;
  receiptId: string;
  bookingId: string;
}): Promise<void> {
  const nodeType =
    input.event.triggerEvent === "BOOKING_CANCELLED"
      ? NodeType.APPOINTMENT_CANCELLED_TRIGGER
      : NodeType.APPOINTMENT_CREATED_TRIGGER;
  const appointment = await db.query.booking.findFirst({
    where: and(
      eq(booking.id, input.bookingId),
      eq(booking.organizationId, input.scope.organizationId),
      eq(booking.locationId, input.scope.locationId),
    ),
    columns: { clientId: true },
  });
  const appointmentCount = appointment?.clientId
    ? await countClientAppointments({
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        clientId: appointment.clientId,
      })
    : 0;
  try {
    await triggerWorkflowsForNodeType({
      nodeType,
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
      idempotencyKey: `calcom:${input.receiptId}`,
      triggerData: {
        source: "CAL_COM",
        event: input.event.triggerEvent,
        bookingId: input.bookingId,
        clientId: input.event.payload.metadata?.clientId ?? null,
        appointmentCount,
      },
      shouldTriggerNode:
        nodeType === NodeType.APPOINTMENT_CREATED_TRIGGER
          ? (node) =>
              matchesAppointmentCreatedTrigger(node.data, appointmentCount)
          : undefined,
    });
    await db
      .update(calComWebhookReceipt)
      .set({ workflowDispatchedAt: new Date(), workflowDispatchError: null })
      .where(eq(calComWebhookReceipt.id, input.receiptId));
  } catch (error) {
    await db
      .update(calComWebhookReceipt)
      .set({
        workflowDispatchError:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Dispatch failed",
      })
      .where(eq(calComWebhookReceipt.id, input.receiptId));
    throw error;
  }
}

async function countClientAppointments(input: {
  organizationId: string;
  locationId: string;
  clientId: string;
}): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(booking)
    .where(
      and(
        eq(booking.organizationId, input.organizationId),
        eq(booking.locationId, input.locationId),
        eq(booking.clientId, input.clientId),
      ),
    );
  return row?.value ?? 0;
}
