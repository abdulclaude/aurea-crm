import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import {
  checkIn,
  client,
  node,
  studioBooking,
  studioPayment,
  workflows,
} from "@/db/schema";
import {
  clientInactivityTriggerConfigSchema,
  inactivityOccurrenceKey,
} from "@/features/workflows/lib/studio-trigger-config";
import { sendWorkflowExecution } from "@/inngest/utils";

export async function evaluateClientInactivityTriggers(
  now = new Date(),
): Promise<number> {
  const triggerNodes = await db
    .select({
      nodeId: node.id,
      nodeData: node.data,
      workflowId: workflows.id,
      organizationId: workflows.organizationId,
      locationId: workflows.locationId,
    })
    .from(node)
    .innerJoin(workflows, eq(workflows.id, node.workflowId))
    .where(
      and(
        eq(node.type, NodeType.CLIENT_INACTIVITY_TRIGGER),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
      ),
    );

  let triggered = 0;
  const clientsByScope = new Map<
    string,
    Awaited<ReturnType<typeof loadScopedClientActivity>>
  >();
  for (const triggerNode of triggerNodes) {
    if (!triggerNode.organizationId) continue;
    const parsed = clientInactivityTriggerConfigSchema.safeParse(
      triggerNode.nodeData,
    );
    if (!parsed.success) continue;
    const config = parsed.data;
    const scopeKey = `${triggerNode.organizationId}:${triggerNode.locationId ?? "organization"}`;
    let clients = clientsByScope.get(scopeKey);
    if (!clients) {
      clients = await loadScopedClientActivity({
        organizationId: triggerNode.organizationId,
        locationId: triggerNode.locationId,
      });
      clientsByScope.set(scopeKey, clients);
    }
    const cutoff = now.getTime() - config.days * 86_400_000;

    for (const candidate of clients) {
      const activityDates = [candidate.createdAt];
      if (
        config.activityDimensions.includes("CRM_INTERACTION") &&
        candidate.lastInteractionAt
      )
        activityDates.push(candidate.lastInteractionAt);
      if (
        config.activityDimensions.includes("CLASS_BOOKING") &&
        candidate.lastBookingAt
      )
        activityDates.push(candidate.lastBookingAt);
      if (
        config.activityDimensions.includes("CLASS_ATTENDANCE") &&
        candidate.lastCheckInAt
      )
        activityDates.push(candidate.lastCheckInAt);
      if (
        config.activityDimensions.includes("SUCCESSFUL_PAYMENT") &&
        candidate.lastPaymentAt
      )
        activityDates.push(candidate.lastPaymentAt);
      const lastActivityAt = new Date(
        Math.max(...activityDates.map((date) => date.getTime())),
      );
      if (lastActivityAt.getTime() > cutoff) continue;

      await sendWorkflowExecution({
        workflowId: triggerNode.workflowId,
        expectedOrganizationId: triggerNode.organizationId,
        expectedLocationId: triggerNode.locationId,
        idempotencyKey: inactivityOccurrenceKey({
          nodeId: triggerNode.nodeId,
          clientId: candidate.id,
          days: config.days,
          activityDimensions: config.activityDimensions,
          lastActivityAt,
        }),
        initialData: {
          triggerData: {
            client: {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email,
            },
            daysInactive: Math.floor(
              (now.getTime() - lastActivityAt.getTime()) / 86_400_000,
            ),
            lastActivityAt: lastActivityAt.toISOString(),
            activityDimensions: config.activityDimensions,
          },
        },
      });
      triggered += 1;
    }
  }
  return triggered;
}

async function loadScopedClientActivity(input: {
  organizationId: string;
  locationId: string | null;
}) {
  return db
    .select({
      id: client.id,
      name: client.name,
      email: client.email,
      createdAt: client.createdAt,
      lastInteractionAt: client.lastInteractionAt,
      lastBookingAt: sql<Date | null>`(select max(${studioBooking.bookedAt}) from ${studioBooking} where ${studioBooking.clientId} = ${client.id})`,
      lastCheckInAt: sql<Date | null>`(select max(${checkIn.checkedInAt}) from ${checkIn} where ${checkIn.clientId} = ${client.id} and ${checkIn.organizationId} = ${client.organizationId})`,
      lastPaymentAt: sql<Date | null>`(select max(${studioPayment.createdAt}) from ${studioPayment} where ${studioPayment.clientId} = ${client.id} and ${studioPayment.organizationId} = ${client.organizationId} and ${studioPayment.status} = 'SUCCEEDED')`,
    })
    .from(client)
    .where(
      and(
        eq(client.organizationId, input.organizationId),
        input.locationId
          ? eq(client.locationId, input.locationId)
          : isNull(client.locationId),
      ),
    );
}
