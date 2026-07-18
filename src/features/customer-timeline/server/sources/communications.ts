import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { inboxConversation, inboxMessage, outboundDelivery } from "@/db/schema";
import type {
  CustomerTimelineCursor,
  CustomerTimelineEvent,
} from "@/features/customer-timeline/contracts";
import {
  locationScopeCondition,
  timelineCursorCondition,
  type CustomerTimelineScope,
} from "@/features/customer-timeline/server/timeline-query";

function summarizeContent(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 160
    ? `${normalized.slice(0, 157)}...`
    : normalized;
}

export async function listCommunicationTimelineEvents(input: {
  scope: CustomerTimelineScope;
  cursor?: CustomerTimelineCursor;
  limit: number;
}): Promise<CustomerTimelineEvent[]> {
  const [messageRows, deliveryRows] = await Promise.all([
    db
      .select({
        id: inboxMessage.id,
        direction: inboxMessage.direction,
        content: inboxMessage.content,
        channel: inboxConversation.channel,
        createdAt: inboxMessage.createdAt,
      })
      .from(inboxMessage)
      .innerJoin(
        inboxConversation,
        eq(inboxConversation.id, inboxMessage.conversationId),
      )
      .where(
        and(
          eq(inboxConversation.organizationId, input.scope.organizationId),
          locationScopeCondition(
            inboxConversation.locationId,
            input.scope.locationId,
          ),
          eq(inboxConversation.clientId, input.scope.clientId),
          timelineCursorCondition({
            occurredAt: inboxMessage.createdAt,
            id: inboxMessage.id,
            prefix: "message",
            cursor: input.cursor,
          }),
        ),
      )
      .orderBy(desc(inboxMessage.createdAt), desc(inboxMessage.id))
      .limit(input.limit + 1),
    db
      .select({
        id: outboundDelivery.id,
        channel: outboundDelivery.channel,
        purpose: outboundDelivery.purpose,
        status: outboundDelivery.status,
        sourceType: outboundDelivery.sourceType,
        createdAt: outboundDelivery.createdAt,
      })
      .from(outboundDelivery)
      .leftJoin(inboxMessage, eq(inboxMessage.deliveryId, outboundDelivery.id))
      .where(
        and(
          eq(outboundDelivery.organizationId, input.scope.organizationId),
          locationScopeCondition(
            outboundDelivery.locationId,
            input.scope.locationId,
          ),
          eq(outboundDelivery.clientId, input.scope.clientId),
          isNull(inboxMessage.id),
          timelineCursorCondition({
            occurredAt: outboundDelivery.createdAt,
            id: outboundDelivery.id,
            prefix: "delivery",
            cursor: input.cursor,
          }),
        ),
      )
      .orderBy(desc(outboundDelivery.createdAt), desc(outboundDelivery.id))
      .limit(input.limit + 1),
  ]);

  return [
    ...messageRows.map(
      (row): CustomerTimelineEvent => ({
        id: `message:${row.id}`,
        kind: "MESSAGE",
        title: `${row.direction === "INBOUND" ? "Received" : "Sent"} ${row.channel.toLowerCase()} message`,
        description: summarizeContent(row.content),
        status: row.direction,
        occurredAt: row.createdAt,
        secondaryAt: null,
        money: null,
        channel: row.channel,
      }),
    ),
    ...deliveryRows.map(
      (row): CustomerTimelineEvent => ({
        id: `delivery:${row.id}`,
        kind: "MESSAGE",
        title: `${row.channel.toLowerCase()} delivery`,
        description: `${row.purpose.toLowerCase().replaceAll("_", " ")} via ${row.sourceType.toLowerCase().replaceAll("_", " ")}`,
        status: row.status,
        occurredAt: row.createdAt,
        secondaryAt: null,
        money: null,
        channel: row.channel,
      }),
    ),
  ];
}
