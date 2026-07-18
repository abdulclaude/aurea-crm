import { and, eq, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { CustomerTimelineCursor } from "@/features/customer-timeline/contracts";

export type CustomerTimelineScope = {
  organizationId: string;
  locationId: string | null;
  clientId: string;
};

export function locationScopeCondition(
  column: AnyPgColumn,
  locationId: string | null,
): SQL {
  return locationId ? eq(column, locationId) : isNull(column);
}

export function timelineCursorCondition(input: {
  occurredAt: AnyPgColumn;
  id: AnyPgColumn;
  prefix: string;
  cursor?: CustomerTimelineCursor;
}): SQL | undefined {
  if (!input.cursor) return undefined;
  const compositeId = sql<string>`${`${input.prefix}:`} || ${input.id}`;
  return or(
    lt(input.occurredAt, input.cursor.at),
    and(
      eq(input.occurredAt, input.cursor.at),
      lt(compositeId, input.cursor.id),
    ),
  );
}
