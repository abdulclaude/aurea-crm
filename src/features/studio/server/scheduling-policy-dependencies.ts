import "server-only";

import { count, eq } from "drizzle-orm";

import { serviceType, studioClass } from "@/db/schema";
import type { SchedulingPolicyKind } from "@/features/studio/scheduling/contracts";

import type { SchedulingTransaction } from "./scheduling-policy-db";

export async function countSchedulingPolicyDependencies(
  tx: SchedulingTransaction,
  kind: SchedulingPolicyKind,
  policyId: string,
): Promise<number> {
  const [services, classes] = await Promise.all([
    tx
      .select({ total: count() })
      .from(serviceType)
      .where(
        kind === "BOOKING_WINDOW"
          ? eq(serviceType.bookingWindowPolicyId, policyId)
          : eq(serviceType.waitlistPolicyId, policyId),
      ),
    tx
      .select({ total: count() })
      .from(studioClass)
      .where(
        kind === "BOOKING_WINDOW"
          ? eq(studioClass.bookingWindowPolicyOverrideId, policyId)
          : eq(studioClass.waitlistPolicyOverrideId, policyId),
      ),
  ]);
  return (services[0]?.total ?? 0) + (classes[0]?.total ?? 0);
}
