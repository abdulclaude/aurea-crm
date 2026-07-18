import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, lte, or } from "drizzle-orm";

import { db } from "@/db";
import {
  bookingWindowPolicy,
  bookingWindowPolicyVersion,
  serviceType,
  waitlistPolicy,
  waitlistPolicyVersion,
} from "@/db/schema";
import {
  supportsWaitlistRuntime,
  type SchedulingPolicyKind,
} from "@/features/studio/scheduling/contracts";

import type { SchedulingPolicyScope } from "./scheduling-policy-access";
import {
  exactSchedulingLocation,
  lockSchedulingScope,
  type SchedulingTransaction,
} from "./scheduling-policy-db";
import { countSchedulingPolicyDependencies } from "./scheduling-policy-dependencies";
import { schedulingPolicyNotFound } from "./scheduling-policy-model";

export async function setSchedulingPolicyDefault(input: {
  scope: SchedulingPolicyScope;
  kind: SchedulingPolicyKind;
  policyId: string;
  isDefault: boolean;
}) {
  return db.transaction(async (tx) => {
    await lockSchedulingScope(tx, input.scope);
    const now = new Date();
    if (input.kind === "BOOKING_WINDOW") {
      const target = await findExactBookingPolicy(
        tx,
        input.scope,
        input.policyId,
      );
      if (!target?.isActive) schedulingPolicyNotFound(input.kind);
      if (input.isDefault) {
        await tx
          .update(bookingWindowPolicy)
          .set({ isDefault: false, updatedAt: now })
          .where(
            and(
              eq(
                bookingWindowPolicy.organizationId,
                input.scope.organizationId,
              ),
              exactSchedulingLocation(
                bookingWindowPolicy.locationId,
                input.scope.locationId,
              ),
              eq(bookingWindowPolicy.isDefault, true),
            ),
          );
      }
      const [updated] = await tx
        .update(bookingWindowPolicy)
        .set({ isDefault: input.isDefault, updatedAt: now })
        .where(eq(bookingWindowPolicy.id, input.policyId))
        .returning();
      return updated;
    }

    const target = await findExactWaitlistPolicy(
      tx,
      input.scope,
      input.policyId,
    );
    if (!target?.isActive) schedulingPolicyNotFound(input.kind);
    if (input.isDefault) {
      await tx
        .update(waitlistPolicy)
        .set({ isDefault: false, updatedAt: now })
        .where(
          and(
            eq(waitlistPolicy.organizationId, input.scope.organizationId),
            exactSchedulingLocation(
              waitlistPolicy.locationId,
              input.scope.locationId,
            ),
            eq(waitlistPolicy.isDefault, true),
          ),
        );
    }
    const [updated] = await tx
      .update(waitlistPolicy)
      .set({ isDefault: input.isDefault, updatedAt: now })
      .where(eq(waitlistPolicy.id, input.policyId))
      .returning();
    return updated;
  });
}

export async function archiveSchedulingPolicy(input: {
  scope: SchedulingPolicyScope;
  kind: SchedulingPolicyKind;
  policyId: string;
}) {
  return db.transaction(async (tx) => {
    await lockSchedulingScope(tx, input.scope);
    const dependencies = await countSchedulingPolicyDependencies(
      tx,
      input.kind,
      input.policyId,
    );
    if (dependencies > 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Reassign services and future class overrides before archiving this policy.",
      });
    }
    const now = new Date();
    if (input.kind === "BOOKING_WINDOW") {
      const target = await findExactBookingPolicy(
        tx,
        input.scope,
        input.policyId,
      );
      if (!target) schedulingPolicyNotFound(input.kind);
      const [archived] = await tx
        .update(bookingWindowPolicy)
        .set({ isActive: false, isDefault: false, updatedAt: now })
        .where(eq(bookingWindowPolicy.id, input.policyId))
        .returning();
      return archived;
    }
    const target = await findExactWaitlistPolicy(
      tx,
      input.scope,
      input.policyId,
    );
    if (!target) schedulingPolicyNotFound(input.kind);
    const [archived] = await tx
      .update(waitlistPolicy)
      .set({ isActive: false, isDefault: false, updatedAt: now })
      .where(eq(waitlistPolicy.id, input.policyId))
      .returning();
    return archived;
  });
}

export async function assignSchedulingPolicies(input: {
  scope: SchedulingPolicyScope;
  serviceTypeId: string;
  bookingWindowPolicyId: string | null;
  waitlistPolicyId: string | null;
}) {
  return db.transaction(async (tx) => {
    await lockSchedulingScope(tx, input.scope);
    const [service] = await tx
      .select({ id: serviceType.id })
      .from(serviceType)
      .where(
        and(
          eq(serviceType.id, input.serviceTypeId),
          eq(serviceType.organizationId, input.scope.organizationId),
          exactSchedulingLocation(
            serviceType.locationId,
            input.scope.locationId,
          ),
        ),
      )
      .limit(1);
    if (!service) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Service type not found in the active settings scope.",
      });
    }
    if (input.bookingWindowPolicyId) {
      await requireAssignableBookingPolicy(
        tx,
        input.scope,
        input.bookingWindowPolicyId,
      );
    }
    if (input.waitlistPolicyId) {
      await requireAssignableWaitlistPolicy(
        tx,
        input.scope,
        input.waitlistPolicyId,
      );
    }
    const [updated] = await tx
      .update(serviceType)
      .set({
        bookingWindowPolicyId: input.bookingWindowPolicyId,
        waitlistPolicyId: input.waitlistPolicyId,
        updatedAt: new Date(),
      })
      .where(eq(serviceType.id, service.id))
      .returning();
    return updated;
  });
}

async function findExactBookingPolicy(
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

async function findExactWaitlistPolicy(
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

async function requireAssignableBookingPolicy(
  tx: SchedulingTransaction,
  scope: SchedulingPolicyScope,
  policyId: string,
) {
  const [policy] = await tx
    .select({ id: bookingWindowPolicy.id })
    .from(bookingWindowPolicy)
    .innerJoin(
      bookingWindowPolicyVersion,
      eq(bookingWindowPolicyVersion.policyId, bookingWindowPolicy.id),
    )
    .where(
      and(
        eq(bookingWindowPolicy.id, policyId),
        eq(bookingWindowPolicy.organizationId, scope.organizationId),
        scope.locationId
          ? or(
              isNull(bookingWindowPolicy.locationId),
              eq(bookingWindowPolicy.locationId, scope.locationId),
            )
          : exactSchedulingLocation(bookingWindowPolicy.locationId, null),
        eq(bookingWindowPolicy.isActive, true),
        lte(bookingWindowPolicyVersion.effectiveFrom, new Date()),
      ),
    )
    .limit(1);
  if (!policy) schedulingPolicyNotFound("BOOKING_WINDOW");
}

async function requireAssignableWaitlistPolicy(
  tx: SchedulingTransaction,
  scope: SchedulingPolicyScope,
  policyId: string,
) {
  const [policy] = await tx
    .select({
      id: waitlistPolicy.id,
      mode: waitlistPolicyVersion.mode,
      creditHoldPolicy: waitlistPolicyVersion.creditHoldPolicy,
      failureFallback: waitlistPolicyVersion.failureFallback,
      automationClosesMinutesBeforeStart:
        waitlistPolicyVersion.automationClosesMinutesBeforeStart,
      maxEntries: waitlistPolicyVersion.maxEntries,
      allowOverlappingReservations:
        waitlistPolicyVersion.allowOverlappingReservations,
      offerExpiryMinutes: waitlistPolicyVersion.offerExpiryMinutes,
    })
    .from(waitlistPolicy)
    .innerJoin(
      waitlistPolicyVersion,
      eq(waitlistPolicyVersion.policyId, waitlistPolicy.id),
    )
    .where(
      and(
        eq(waitlistPolicy.id, policyId),
        eq(waitlistPolicy.organizationId, scope.organizationId),
        scope.locationId
          ? or(
              isNull(waitlistPolicy.locationId),
              eq(waitlistPolicy.locationId, scope.locationId),
            )
          : exactSchedulingLocation(waitlistPolicy.locationId, null),
        eq(waitlistPolicy.isActive, true),
        lte(waitlistPolicyVersion.effectiveFrom, new Date()),
      ),
    )
    .orderBy(
      desc(waitlistPolicyVersion.effectiveFrom),
      desc(waitlistPolicyVersion.version),
    )
    .limit(1);
  if (!policy || !supportsWaitlistRuntime(policy)) {
    schedulingPolicyNotFound("WAITLIST");
  }
}
