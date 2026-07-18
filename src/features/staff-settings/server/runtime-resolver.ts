import "server-only";

import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  staffCompensationAssignment,
  staffCompensationTemplate,
  staffCompensationTemplateVersion,
  staffOperationsPolicy,
  staffOperationsPolicyVersion,
} from "@/db/schema";
import { staffOperationsPolicyValuesSchema } from "@/features/staff-settings/contracts";

import {
  LEGACY_STAFF_OPERATIONS_VALUES,
  type CompensationRuntimeSnapshot,
  type OperationsPolicyRuntimeSnapshot,
  type StaffRuntimeSnapshot,
} from "./runtime-snapshot";

function exactLocation(
  column: AnyPgColumn,
  locationId: string | null,
) {
  return locationId === null ? isNull(column) : eq(column, locationId);
}

export async function resolveCompensationRuntimeSnapshot(input: {
  organizationId: string;
  locationId: string | null;
  instructorId: string;
  effectiveAt: Date;
  legacyHourlyRate: string | null;
  legacyCurrency: string | null;
}): Promise<CompensationRuntimeSnapshot> {
  const [row] = await db
    .select({
      assignmentId: staffCompensationAssignment.id,
      templateId: staffCompensationTemplateVersion.templateId,
      templateVersionId: staffCompensationTemplateVersion.id,
      templateVersion: staffCompensationTemplateVersion.version,
      hourlyRate: staffCompensationTemplateVersion.hourlyRate,
      currency: staffCompensationTemplateVersion.currency,
      effectiveFrom: staffCompensationAssignment.effectiveFrom,
      effectiveTo: staffCompensationAssignment.effectiveTo,
    })
    .from(staffCompensationAssignment)
    .innerJoin(
      staffCompensationTemplateVersion,
      and(
        eq(
          staffCompensationTemplateVersion.id,
          staffCompensationAssignment.templateVersionId,
        ),
        eq(
          staffCompensationTemplateVersion.organizationId,
          staffCompensationAssignment.organizationId,
        ),
        sql`${staffCompensationTemplateVersion.locationId} IS NOT DISTINCT FROM ${staffCompensationAssignment.locationId}`,
      ),
    )
    .innerJoin(
      staffCompensationTemplate,
      and(
        eq(
          staffCompensationTemplate.id,
          staffCompensationTemplateVersion.templateId,
        ),
        eq(
          staffCompensationTemplate.organizationId,
          staffCompensationTemplateVersion.organizationId,
        ),
        sql`${staffCompensationTemplate.locationId} IS NOT DISTINCT FROM ${staffCompensationTemplateVersion.locationId}`,
      ),
    )
    .where(
      and(
        eq(staffCompensationAssignment.organizationId, input.organizationId),
        exactLocation(staffCompensationAssignment.locationId, input.locationId),
        eq(staffCompensationAssignment.instructorId, input.instructorId),
        lte(staffCompensationAssignment.effectiveFrom, input.effectiveAt),
        or(
          isNull(staffCompensationAssignment.effectiveTo),
          gt(staffCompensationAssignment.effectiveTo, input.effectiveAt),
        ),
        lte(staffCompensationTemplateVersion.effectiveFrom, input.effectiveAt),
      ),
    )
    .orderBy(desc(staffCompensationAssignment.effectiveFrom))
    .limit(1);

  return row
    ? { source: "ASSIGNMENT", ...row }
    : {
        source: "LEGACY_INSTRUCTOR",
        hourlyRate: input.legacyHourlyRate,
        currency: input.legacyCurrency ?? "GBP",
      };
}

export async function resolveOperationsPolicyRuntimeSnapshot(input: {
  organizationId: string;
  locationId: string | null;
  effectiveAt: Date;
}): Promise<OperationsPolicyRuntimeSnapshot> {
  const [row] = await db
    .select({
      policyId: staffOperationsPolicy.id,
      policyVersionId: staffOperationsPolicyVersion.id,
      policyVersion: staffOperationsPolicyVersion.version,
      effectiveFrom: staffOperationsPolicyVersion.effectiveFrom,
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
    })
    .from(staffOperationsPolicyVersion)
    .innerJoin(
      staffOperationsPolicy,
      and(
        eq(staffOperationsPolicy.id, staffOperationsPolicyVersion.policyId),
        eq(
          staffOperationsPolicy.organizationId,
          staffOperationsPolicyVersion.organizationId,
        ),
        sql`${staffOperationsPolicy.locationId} IS NOT DISTINCT FROM ${staffOperationsPolicyVersion.locationId}`,
      ),
    )
    .where(
      and(
        eq(staffOperationsPolicyVersion.organizationId, input.organizationId),
        exactLocation(
          staffOperationsPolicyVersion.locationId,
          input.locationId,
        ),
        lte(staffOperationsPolicyVersion.effectiveFrom, input.effectiveAt),
      ),
    )
    .orderBy(
      desc(staffOperationsPolicyVersion.effectiveFrom),
      desc(staffOperationsPolicyVersion.version),
    )
    .limit(1);

  if (row) {
    const values = staffOperationsPolicyValuesSchema.parse({
      publicInstructorProfilesByDefault:
        row.publicInstructorProfilesByDefault,
      availabilityMode: row.availabilityMode,
      staffCanEditAvailability: row.staffCanEditAvailability,
      shiftSwapRequiresApproval: row.shiftSwapRequiresApproval,
      timeOffRequiresApproval: row.timeOffRequiresApproval,
      timeClockRoundingMinutes: row.timeClockRoundingMinutes,
      breakRequiredAfterMinutes: row.breakRequiredAfterMinutes,
      minimumBreakMinutes: row.minimumBreakMinutes,
      timeEntryApprovalMode: row.timeEntryApprovalMode,
    });

    return {
        source: "POLICY_VERSION",
        policyId: row.policyId,
        policyVersionId: row.policyVersionId,
        policyVersion: row.policyVersion,
        effectiveFrom: row.effectiveFrom,
        values,
      };
  }

  return { source: "LEGACY_DEFAULTS", values: LEGACY_STAFF_OPERATIONS_VALUES };
}

export async function resolveStaffRuntimeSnapshot(input: {
  organizationId: string;
  locationId: string | null;
  instructorId: string;
  effectiveAt: Date;
  legacyHourlyRate: string | null;
  legacyCurrency: string | null;
}): Promise<StaffRuntimeSnapshot> {
  const [compensation, operationsPolicy] = await Promise.all([
    resolveCompensationRuntimeSnapshot(input),
    resolveOperationsPolicyRuntimeSnapshot(input),
  ]);
  return {
    schemaVersion: 1,
    capturedAt: new Date(),
    compensation,
    operationsPolicy,
  };
}
