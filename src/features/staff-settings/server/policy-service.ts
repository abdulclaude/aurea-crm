import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  staffOperationsPolicy,
  staffOperationsPolicyVersion,
} from "@/db/schema";
import {
  staffOperationsPolicyVersionSchema,
  type StaffOperationsPolicyValues,
  type StaffOperationsPolicyVersion,
} from "@/features/staff-settings/contracts";

import type { StaffSettingsScope } from "./access";

function exactLocation(locationId: string | null) {
  return locationId === null
    ? isNull(staffOperationsPolicy.locationId)
    : eq(staffOperationsPolicy.locationId, locationId);
}

function toPolicyVersion(row: {
  id: string;
  version: number;
  publicInstructorProfilesByDefault: boolean;
  availabilityMode: string;
  staffCanEditAvailability: boolean;
  shiftSwapRequiresApproval: boolean;
  timeOffRequiresApproval: boolean;
  timeClockRoundingMinutes: number;
  breakRequiredAfterMinutes: number | null;
  minimumBreakMinutes: number;
  timeEntryApprovalMode: string;
  effectiveFrom: Date;
  changeNote: string | null;
  createdAt: Date;
}): StaffOperationsPolicyVersion {
  return staffOperationsPolicyVersionSchema.parse({
    id: row.id,
    version: row.version,
    values: {
      publicInstructorProfilesByDefault: row.publicInstructorProfilesByDefault,
      availabilityMode: row.availabilityMode,
      staffCanEditAvailability: row.staffCanEditAvailability,
      shiftSwapRequiresApproval: row.shiftSwapRequiresApproval,
      timeOffRequiresApproval: row.timeOffRequiresApproval,
      timeClockRoundingMinutes: row.timeClockRoundingMinutes,
      breakRequiredAfterMinutes: row.breakRequiredAfterMinutes,
      minimumBreakMinutes: row.minimumBreakMinutes,
      timeEntryApprovalMode: row.timeEntryApprovalMode,
    },
    effectiveFrom: row.effectiveFrom,
    changeNote: row.changeNote,
    createdAt: row.createdAt,
  });
}

export async function getStaffOperationsPolicy(input: {
  scope: StaffSettingsScope;
}): Promise<StaffOperationsPolicyVersion | null> {
  const [row] = await db
    .select({
      id: staffOperationsPolicyVersion.id,
      version: staffOperationsPolicyVersion.version,
      publicInstructorProfilesByDefault:
        staffOperationsPolicyVersion.publicInstructorProfilesByDefault,
      availabilityMode: staffOperationsPolicyVersion.availabilityMode,
      staffCanEditAvailability:
        staffOperationsPolicyVersion.staffCanEditAvailability,
      shiftSwapRequiresApproval:
        staffOperationsPolicyVersion.shiftSwapRequiresApproval,
      timeOffRequiresApproval:
        staffOperationsPolicyVersion.timeOffRequiresApproval,
      timeClockRoundingMinutes:
        staffOperationsPolicyVersion.timeClockRoundingMinutes,
      breakRequiredAfterMinutes:
        staffOperationsPolicyVersion.breakRequiredAfterMinutes,
      minimumBreakMinutes: staffOperationsPolicyVersion.minimumBreakMinutes,
      timeEntryApprovalMode: staffOperationsPolicyVersion.timeEntryApprovalMode,
      effectiveFrom: staffOperationsPolicyVersion.effectiveFrom,
      changeNote: staffOperationsPolicyVersion.changeNote,
      createdAt: staffOperationsPolicyVersion.createdAt,
    })
    .from(staffOperationsPolicy)
    .innerJoin(
      staffOperationsPolicyVersion,
      and(
        eq(staffOperationsPolicyVersion.policyId, staffOperationsPolicy.id),
        eq(
          staffOperationsPolicyVersion.organizationId,
          staffOperationsPolicy.organizationId,
        ),
        sql`${staffOperationsPolicyVersion.locationId} IS NOT DISTINCT FROM ${staffOperationsPolicy.locationId}`,
        eq(
          staffOperationsPolicyVersion.version,
          staffOperationsPolicy.currentVersion,
        ),
      ),
    )
    .where(
      and(
        eq(staffOperationsPolicy.organizationId, input.scope.organizationId),
        exactLocation(input.scope.locationId),
      ),
    )
    .limit(1);
  return row ? toPolicyVersion(row) : null;
}

export async function listStaffOperationsPolicyHistory(input: {
  scope: StaffSettingsScope;
}): Promise<StaffOperationsPolicyVersion[]> {
  const rows = await db
    .select({
      id: staffOperationsPolicyVersion.id,
      version: staffOperationsPolicyVersion.version,
      publicInstructorProfilesByDefault:
        staffOperationsPolicyVersion.publicInstructorProfilesByDefault,
      availabilityMode: staffOperationsPolicyVersion.availabilityMode,
      staffCanEditAvailability:
        staffOperationsPolicyVersion.staffCanEditAvailability,
      shiftSwapRequiresApproval:
        staffOperationsPolicyVersion.shiftSwapRequiresApproval,
      timeOffRequiresApproval:
        staffOperationsPolicyVersion.timeOffRequiresApproval,
      timeClockRoundingMinutes:
        staffOperationsPolicyVersion.timeClockRoundingMinutes,
      breakRequiredAfterMinutes:
        staffOperationsPolicyVersion.breakRequiredAfterMinutes,
      minimumBreakMinutes: staffOperationsPolicyVersion.minimumBreakMinutes,
      timeEntryApprovalMode: staffOperationsPolicyVersion.timeEntryApprovalMode,
      effectiveFrom: staffOperationsPolicyVersion.effectiveFrom,
      changeNote: staffOperationsPolicyVersion.changeNote,
      createdAt: staffOperationsPolicyVersion.createdAt,
    })
    .from(staffOperationsPolicy)
    .innerJoin(
      staffOperationsPolicyVersion,
      and(
        eq(staffOperationsPolicyVersion.policyId, staffOperationsPolicy.id),
        eq(
          staffOperationsPolicyVersion.organizationId,
          staffOperationsPolicy.organizationId,
        ),
        sql`${staffOperationsPolicyVersion.locationId} IS NOT DISTINCT FROM ${staffOperationsPolicy.locationId}`,
      ),
    )
    .where(
      and(
        eq(staffOperationsPolicy.organizationId, input.scope.organizationId),
        exactLocation(input.scope.locationId),
      ),
    )
    .orderBy(desc(staffOperationsPolicyVersion.version))
    .limit(50);
  return rows.map(toPolicyVersion);
}

export async function saveStaffOperationsPolicy(input: {
  scope: StaffSettingsScope;
  actorUserId: string;
  values: StaffOperationsPolicyValues;
  expectedVersion: number | null;
  effectiveFrom?: Date;
  changeNote: string | null;
}): Promise<StaffOperationsPolicyVersion> {
  if (input.effectiveFrom && input.effectiveFrom.getTime() > Date.now()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Future-dated staff operations policies are not supported yet.",
    });
  }
  return db.transaction(async (tx) => {
    const lockKey = `${input.scope.organizationId}:${input.scope.locationId ?? "organization"}:staff-operations`;
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    );

    const [current] = await tx
      .select({
        id: staffOperationsPolicy.id,
        currentVersion: staffOperationsPolicy.currentVersion,
      })
      .from(staffOperationsPolicy)
      .where(
        and(
          eq(staffOperationsPolicy.organizationId, input.scope.organizationId),
          exactLocation(input.scope.locationId),
        ),
      )
      .limit(1);
    if ((current?.currentVersion ?? null) !== input.expectedVersion) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "These staff operations settings changed after you opened them. Reload and review the latest version.",
      });
    }

    const policyId = current?.id ?? createId();
    const nextVersion = (current?.currentVersion ?? 0) + 1;
    if (!current) {
      await tx.insert(staffOperationsPolicy).values({
        id: policyId,
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        currentVersion: 0,
        createdById: input.actorUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    const [created] = await tx
      .insert(staffOperationsPolicyVersion)
      .values({
        id: createId(),
        policyId,
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        version: nextVersion,
        ...input.values,
        effectiveFrom: input.effectiveFrom ?? new Date(),
        changeNote: input.changeNote,
        createdById: input.actorUserId,
        createdAt: new Date(),
      })
      .returning();
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Staff operations settings could not be saved.",
      });
    }
    const [updated] = await tx
      .update(staffOperationsPolicy)
      .set({ currentVersion: nextVersion, updatedAt: new Date() })
      .where(
        and(
          eq(staffOperationsPolicy.id, policyId),
          eq(staffOperationsPolicy.currentVersion, nextVersion - 1),
        ),
      )
      .returning({ id: staffOperationsPolicy.id });
    if (!updated) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Staff operations settings changed. Reload and try again.",
      });
    }
    return toPolicyVersion(created);
  });
}
