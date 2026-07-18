import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  bookingWindowPolicy,
  bookingWindowPolicyVersion,
  waitlistPolicy,
  waitlistPolicyVersion,
} from "@/db/schema";
import type {
  BookingWindowValues,
  WaitlistValues,
} from "@/features/studio/scheduling/contracts";

import type { SchedulingPolicyScope } from "./scheduling-policy-access";
import {
  lockSchedulingPolicy,
  lockSchedulingScope,
} from "./scheduling-policy-db";
import {
  bookingVersionView,
  schedulingPolicyNotFound,
  waitlistVersionView,
} from "./scheduling-policy-model";
import {
  assertBookingNameAvailable,
  assertWaitlistNameAvailable,
  clearBookingDefaults,
  clearWaitlistDefaults,
  findBookingPolicy,
  findWaitlistPolicy,
  nextBookingVersion,
  nextWaitlistVersion,
  schedulingPolicyWriteFailed,
} from "./scheduling-policy-write-queries";

type CreateDefinitionInput<TValues> = {
  scope: SchedulingPolicyScope;
  actorUserId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  effectiveFrom: Date;
  values: TValues;
  changeNote: string | null;
};

type VersionInput<TValues> = {
  scope: SchedulingPolicyScope;
  actorUserId: string;
  policyId: string;
  expectedVersion: number;
  effectiveFrom: Date;
  values: TValues;
  changeNote: string | null;
  rollbackFromVersion?: number;
};

export async function createBookingWindowPolicy(
  input: CreateDefinitionInput<BookingWindowValues>,
) {
  return db.transaction(async (tx) => {
    await lockSchedulingScope(tx, input.scope);
    await assertBookingNameAvailable(tx, input.scope, input.name);
    if (input.isDefault) await clearBookingDefaults(tx, input.scope);
    const policyId = createId();
    const now = new Date();
    const [policy] = await tx
      .insert(bookingWindowPolicy)
      .values({
        id: policyId,
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        name: input.name,
        description: input.description,
        isDefault: input.isDefault,
        isActive: true,
        createdBy: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const [version] = await tx
      .insert(bookingWindowPolicyVersion)
      .values({
        id: createId(),
        organizationId: input.scope.organizationId,
        policyId,
        version: 1,
        schemaVersion: 1,
        ...input.values,
        effectiveFrom: input.effectiveFrom,
        changeNote: input.changeNote,
        createdBy: input.actorUserId,
        createdAt: now,
      })
      .returning();
    if (!policy || !version) schedulingPolicyWriteFailed("booking window");
    return { policy, version: bookingVersionView(version) };
  });
}

export async function createWaitlistPolicy(
  input: CreateDefinitionInput<WaitlistValues>,
) {
  return db.transaction(async (tx) => {
    await lockSchedulingScope(tx, input.scope);
    await assertWaitlistNameAvailable(tx, input.scope, input.name);
    if (input.isDefault) await clearWaitlistDefaults(tx, input.scope);
    const policyId = createId();
    const now = new Date();
    const [policy] = await tx
      .insert(waitlistPolicy)
      .values({
        id: policyId,
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        name: input.name,
        description: input.description,
        isDefault: input.isDefault,
        isActive: true,
        createdBy: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const [version] = await tx
      .insert(waitlistPolicyVersion)
      .values({
        id: createId(),
        organizationId: input.scope.organizationId,
        policyId,
        version: 1,
        schemaVersion: 1,
        mode: input.values.mode,
        automationClosesMinutesBeforeStart:
          input.values.automationClosesMinutesBeforeStart,
        maxEntries: input.values.maxEntries,
        allowOverlappingReservations: input.values.allowOverlappingReservations,
        creditHoldPolicy: input.values.creditHoldPolicy,
        offerExpiryMinutes: input.values.offerExpiryMinutes,
        failureFallback: input.values.failureFallback,
        effectiveFrom: input.effectiveFrom,
        changeNote: input.changeNote,
        createdBy: input.actorUserId,
        createdAt: now,
      })
      .returning();
    if (!policy || !version) schedulingPolicyWriteFailed("waitlist");
    return { policy, version: waitlistVersionView(version) };
  });
}

export async function versionBookingWindowPolicy(
  input: VersionInput<BookingWindowValues>,
) {
  return db.transaction(async (tx) => {
    await lockSchedulingScope(tx, input.scope);
    await lockSchedulingPolicy(tx, "booking-window", input.policyId);
    const policy = await findBookingPolicy(tx, input.scope, input.policyId);
    if (!policy?.isActive) schedulingPolicyNotFound("BOOKING_WINDOW");
    const nextVersion = await nextBookingVersion(
      tx,
      input.policyId,
      input.expectedVersion,
    );
    const [created] = await tx
      .insert(bookingWindowPolicyVersion)
      .values({
        id: createId(),
        organizationId: input.scope.organizationId,
        policyId: input.policyId,
        version: nextVersion,
        schemaVersion: 1,
        ...input.values,
        effectiveFrom: input.effectiveFrom,
        rollbackFromVersion: input.rollbackFromVersion ?? null,
        changeNote: input.changeNote,
        createdBy: input.actorUserId,
        createdAt: new Date(),
      })
      .returning();
    if (!created) schedulingPolicyWriteFailed("booking window version");
    return bookingVersionView(created);
  });
}

export async function versionWaitlistPolicy(
  input: VersionInput<WaitlistValues>,
) {
  return db.transaction(async (tx) => {
    await lockSchedulingScope(tx, input.scope);
    await lockSchedulingPolicy(tx, "waitlist", input.policyId);
    const policy = await findWaitlistPolicy(tx, input.scope, input.policyId);
    if (!policy?.isActive) schedulingPolicyNotFound("WAITLIST");
    const nextVersion = await nextWaitlistVersion(
      tx,
      input.policyId,
      input.expectedVersion,
    );
    const [created] = await tx
      .insert(waitlistPolicyVersion)
      .values({
        id: createId(),
        organizationId: input.scope.organizationId,
        policyId: input.policyId,
        version: nextVersion,
        schemaVersion: 1,
        mode: input.values.mode,
        automationClosesMinutesBeforeStart:
          input.values.automationClosesMinutesBeforeStart,
        maxEntries: input.values.maxEntries,
        allowOverlappingReservations: input.values.allowOverlappingReservations,
        creditHoldPolicy: input.values.creditHoldPolicy,
        offerExpiryMinutes: input.values.offerExpiryMinutes,
        failureFallback: input.values.failureFallback,
        effectiveFrom: input.effectiveFrom,
        rollbackFromVersion: input.rollbackFromVersion ?? null,
        changeNote: input.changeNote,
        createdBy: input.actorUserId,
        createdAt: new Date(),
      })
      .returning();
    if (!created) schedulingPolicyWriteFailed("waitlist version");
    return waitlistVersionView(created);
  });
}

export async function rollbackBookingWindowPolicy(input: {
  scope: SchedulingPolicyScope;
  actorUserId: string;
  policyId: string;
  targetVersion: number;
  expectedVersion: number;
  effectiveFrom: Date;
  changeNote: string | null;
}) {
  const [target] = await db
    .select()
    .from(bookingWindowPolicyVersion)
    .where(
      and(
        eq(
          bookingWindowPolicyVersion.organizationId,
          input.scope.organizationId,
        ),
        eq(bookingWindowPolicyVersion.policyId, input.policyId),
        eq(bookingWindowPolicyVersion.version, input.targetVersion),
      ),
    )
    .limit(1);
  if (!target) schedulingPolicyNotFound("BOOKING_WINDOW");
  return versionBookingWindowPolicy({
    ...input,
    values: bookingVersionView(target).values,
    rollbackFromVersion: input.targetVersion,
    changeNote: input.changeNote ?? `Restored version ${input.targetVersion}`,
  });
}

export async function rollbackWaitlistPolicy(input: {
  scope: SchedulingPolicyScope;
  actorUserId: string;
  policyId: string;
  targetVersion: number;
  expectedVersion: number;
  effectiveFrom: Date;
  changeNote: string | null;
}) {
  const [target] = await db
    .select()
    .from(waitlistPolicyVersion)
    .where(
      and(
        eq(waitlistPolicyVersion.organizationId, input.scope.organizationId),
        eq(waitlistPolicyVersion.policyId, input.policyId),
        eq(waitlistPolicyVersion.version, input.targetVersion),
      ),
    )
    .limit(1);
  if (!target) schedulingPolicyNotFound("WAITLIST");
  return versionWaitlistPolicy({
    ...input,
    values: waitlistVersionView(target).values,
    rollbackFromVersion: input.targetVersion,
    changeNote: input.changeNote ?? `Restored version ${input.targetVersion}`,
  });
}
