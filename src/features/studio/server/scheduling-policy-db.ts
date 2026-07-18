import "server-only";

import { eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookingWindowPolicy } from "@/db/schema";

import type { SchedulingPolicyScope } from "./scheduling-policy-access";

export type SchedulingTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function lockSchedulingScope(
  tx: SchedulingTransaction,
  scope: SchedulingPolicyScope,
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${scope.organizationId}:scheduling-policies`}, 0))`,
  );
  if (scope.locationId) {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${scope.organizationId}:${scope.locationId}:scheduling-policies`}, 0))`,
    );
  }
}
export async function lockSchedulingPolicy(
  tx: SchedulingTransaction,
  kind: "booking-window" | "waitlist",
  policyId: string,
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${kind}:${policyId}`}, 0))`,
  );
}

export function exactSchedulingLocation<TColumn>(
  column: TColumn,
  locationId: string | null,
) {
  const typed = column as typeof bookingWindowPolicy.locationId;
  return locationId ? eq(typed, locationId) : isNull(typed);
}
