import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, max } from "drizzle-orm";

import {
  bookingWindowPolicy,
  bookingWindowPolicyVersion,
  waitlistPolicy,
  waitlistPolicyVersion,
} from "@/db/schema";

import type { SchedulingPolicyScope } from "./scheduling-policy-access";
import {
  exactSchedulingLocation,
  type SchedulingTransaction,
} from "./scheduling-policy-db";

export async function clearBookingDefaults(
  tx: SchedulingTransaction,
  scope: SchedulingPolicyScope,
) {
  await tx
    .update(bookingWindowPolicy)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(
      and(
        eq(bookingWindowPolicy.organizationId, scope.organizationId),
        exactSchedulingLocation(
          bookingWindowPolicy.locationId,
          scope.locationId,
        ),
        eq(bookingWindowPolicy.isDefault, true),
      ),
    );
}

export async function clearWaitlistDefaults(
  tx: SchedulingTransaction,
  scope: SchedulingPolicyScope,
) {
  await tx
    .update(waitlistPolicy)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(
      and(
        eq(waitlistPolicy.organizationId, scope.organizationId),
        exactSchedulingLocation(waitlistPolicy.locationId, scope.locationId),
        eq(waitlistPolicy.isDefault, true),
      ),
    );
}

export async function assertBookingNameAvailable(
  tx: SchedulingTransaction,
  scope: SchedulingPolicyScope,
  name: string,
) {
  const [existing] = await tx
    .select({ id: bookingWindowPolicy.id })
    .from(bookingWindowPolicy)
    .where(
      and(
        eq(bookingWindowPolicy.organizationId, scope.organizationId),
        exactSchedulingLocation(
          bookingWindowPolicy.locationId,
          scope.locationId,
        ),
        eq(bookingWindowPolicy.name, name),
      ),
    )
    .limit(1);
  if (existing) duplicateName();
}

export async function assertWaitlistNameAvailable(
  tx: SchedulingTransaction,
  scope: SchedulingPolicyScope,
  name: string,
) {
  const [existing] = await tx
    .select({ id: waitlistPolicy.id })
    .from(waitlistPolicy)
    .where(
      and(
        eq(waitlistPolicy.organizationId, scope.organizationId),
        exactSchedulingLocation(waitlistPolicy.locationId, scope.locationId),
        eq(waitlistPolicy.name, name),
      ),
    )
    .limit(1);
  if (existing) duplicateName();
}

export async function findBookingPolicy(
  tx: SchedulingTransaction,
  scope: SchedulingPolicyScope,
  policyId: string,
) {
  const [policy] = await tx
    .select()
    .from(bookingWindowPolicy)
    .where(
      and(
        eq(bookingWindowPolicy.id, policyId),
        eq(bookingWindowPolicy.organizationId, scope.organizationId),
        exactSchedulingLocation(
          bookingWindowPolicy.locationId,
          scope.locationId,
        ),
      ),
    )
    .limit(1);
  return policy;
}

export async function findWaitlistPolicy(
  tx: SchedulingTransaction,
  scope: SchedulingPolicyScope,
  policyId: string,
) {
  const [policy] = await tx
    .select()
    .from(waitlistPolicy)
    .where(
      and(
        eq(waitlistPolicy.id, policyId),
        eq(waitlistPolicy.organizationId, scope.organizationId),
        exactSchedulingLocation(waitlistPolicy.locationId, scope.locationId),
      ),
    )
    .limit(1);
  return policy;
}

export async function nextBookingVersion(
  tx: SchedulingTransaction,
  policyId: string,
  expectedVersion: number,
) {
  const [latest] = await tx
    .select({ version: max(bookingWindowPolicyVersion.version) })
    .from(bookingWindowPolicyVersion)
    .where(eq(bookingWindowPolicyVersion.policyId, policyId));
  return assertExpectedVersion(latest?.version ?? 0, expectedVersion);
}

export async function nextWaitlistVersion(
  tx: SchedulingTransaction,
  policyId: string,
  expectedVersion: number,
) {
  const [latest] = await tx
    .select({ version: max(waitlistPolicyVersion.version) })
    .from(waitlistPolicyVersion)
    .where(eq(waitlistPolicyVersion.policyId, policyId));
  return assertExpectedVersion(latest?.version ?? 0, expectedVersion);
}

function assertExpectedVersion(current: number, expected: number): number {
  if (current !== expected) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This policy changed after you opened it. Reload and review the latest version.",
    });
  }
  return current + 1;
}

function duplicateName(): never {
  throw new TRPCError({
    code: "CONFLICT",
    message: "A policy with this name already exists in this scope.",
  });
}

export function schedulingPolicyWriteFailed(label: string): never {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `${label} policy could not be saved.`,
  });
}
