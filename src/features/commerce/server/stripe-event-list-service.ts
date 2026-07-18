import "server-only";

import { and, desc, eq, ilike, lt, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { location, stripeEvent } from "@/db/schema";
import type { ListStripeEventsInput } from "@/features/commerce/reconciliation-contracts";
import type { StripeEventListItem } from "@/features/commerce/reconciliation-output-contracts";
import {
  type CommerceScope,
  containsPattern,
  locationCondition,
  type Page,
  pageResult,
} from "@/features/commerce/server/reconciliation-list-helpers";

export async function listStripeEvents(
  scope: CommerceScope,
  input: ListStripeEventsInput,
): Promise<Page<StripeEventListItem>> {
  const conditions: SQL[] = [eq(stripeEvent.organizationId, scope.organizationId)];
  const activeLocation = locationCondition(stripeEvent.locationId, scope.locationId);
  if (activeLocation) conditions.push(activeLocation);
  if (input.status) conditions.push(eq(stripeEvent.status, input.status));
  if (input.eventType) {
    conditions.push(ilike(stripeEvent.type, containsPattern(input.eventType)));
  }
  if (input.cursor) {
    const cursorCondition = or(
      lt(stripeEvent.receivedAt, input.cursor.at),
      and(
        eq(stripeEvent.receivedAt, input.cursor.at),
        lt(stripeEvent.id, input.cursor.id),
      ),
    );
    if (cursorCondition) conditions.push(cursorCondition);
  }

  const rows = await db
    .select({
      id: stripeEvent.id,
      stripeEventId: stripeEvent.stripeEventId,
      type: stripeEvent.type,
      source: stripeEvent.source,
      status: stripeEvent.status,
      stripeAccountId: stripeEvent.stripeAccountId,
      stripeConnectionId: stripeEvent.stripeConnectionId,
      instructorId: stripeEvent.instructorId,
      locationId: stripeEvent.locationId,
      locationName: location.companyName,
      livemode: stripeEvent.livemode,
      objectId: stripeEvent.objectId,
      objectType: stripeEvent.objectType,
      attempts: stripeEvent.attempts,
      maxAttempts: stripeEvent.maxAttempts,
      errorCode: stripeEvent.errorCode,
      errorMessage: stripeEvent.errorMessage,
      receivedAt: stripeEvent.receivedAt,
      lastAttemptAt: stripeEvent.lastAttemptAt,
      nextAttemptAt: stripeEvent.nextAttemptAt,
      processedAt: stripeEvent.processedAt,
    })
    .from(stripeEvent)
    .leftJoin(location, eq(location.id, stripeEvent.locationId))
    .where(and(...conditions))
    .orderBy(desc(stripeEvent.receivedAt), desc(stripeEvent.id))
    .limit(input.limit + 1);

  return pageResult({ rows, limit: input.limit, cursorDate: (row) => row.receivedAt });
}
