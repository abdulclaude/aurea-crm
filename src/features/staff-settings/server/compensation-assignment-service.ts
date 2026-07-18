import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  instructor,
  staffCompensationAssignment,
  staffCompensationTemplate,
  staffCompensationTemplateVersion,
} from "@/db/schema";
import {
  staffCompensationAssignmentSchema,
  type StaffCompensationAssignment,
} from "@/features/staff-settings/contracts";

import type { StaffSettingsScope } from "./access";
import { scopeLocation } from "./scope-location";

export async function assignStaffCompensationTemplate(input: {
  scope: StaffSettingsScope;
  actorUserId: string;
  instructorId: string;
  templateVersionId: string;
  effectiveFrom: Date;
}): Promise<StaffCompensationAssignment> {
  if (input.effectiveFrom.getTime() > Date.now()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Future-dated compensation assignments are not supported yet.",
    });
  }
  return db.transaction(async (tx) => {
    const [version] = await tx
      .select({
        id: staffCompensationTemplateVersion.id,
        templateId: staffCompensationTemplateVersion.templateId,
        version: staffCompensationTemplateVersion.version,
        hourlyRate: staffCompensationTemplateVersion.hourlyRate,
        currency: staffCompensationTemplateVersion.currency,
        templateName: staffCompensationTemplate.name,
      })
      .from(staffCompensationTemplateVersion)
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
          eq(staffCompensationTemplateVersion.id, input.templateVersionId),
          eq(
            staffCompensationTemplateVersion.organizationId,
            input.scope.organizationId,
          ),
          scopeLocation(
            staffCompensationTemplateVersion.locationId,
            input.scope.locationId,
          ),
          isNull(staffCompensationTemplate.archivedAt),
        ),
      )
      .limit(1);
    if (!version) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Compensation template version not found.",
      });
    }
    const [staff] = await tx
      .select({ id: instructor.id, name: instructor.name })
      .from(instructor)
      .where(
        and(
          eq(instructor.id, input.instructorId),
          eq(instructor.organizationId, input.scope.organizationId),
          input.scope.locationId === null
            ? sql`true`
            : eq(instructor.locationId, input.scope.locationId),
        ),
      )
      .limit(1)
      .for("share");
    if (!staff) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Instructor not found in this staff scope.",
      });
    }
    const [existing] = await tx
      .select({
        id: staffCompensationAssignment.id,
        effectiveFrom: staffCompensationAssignment.effectiveFrom,
      })
      .from(staffCompensationAssignment)
      .where(
        and(
          eq(
            staffCompensationAssignment.organizationId,
            input.scope.organizationId,
          ),
          scopeLocation(
            staffCompensationAssignment.locationId,
            input.scope.locationId,
          ),
          eq(staffCompensationAssignment.instructorId, staff.id),
          isNull(staffCompensationAssignment.effectiveTo),
        ),
      )
      .limit(1);
    if (existing && input.effectiveFrom <= existing.effectiveFrom) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "The replacement assignment must start after the active assignment.",
      });
    }
    if (existing) {
      await tx
        .update(staffCompensationAssignment)
        .set({ effectiveTo: input.effectiveFrom })
        .where(eq(staffCompensationAssignment.id, existing.id));
    }
    const [assignment] = await tx
      .insert(staffCompensationAssignment)
      .values({
        id: createId(),
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        instructorId: staff.id,
        templateVersionId: version.id,
        effectiveFrom: input.effectiveFrom,
        assignedById: input.actorUserId,
        createdAt: new Date(),
      })
      .returning();
    if (!assignment) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Compensation assignment could not be created.",
      });
    }
    return staffCompensationAssignmentSchema.parse({
      ...assignment,
      instructorName: staff.name,
      templateName: version.templateName,
      version: version.version,
      hourlyRate: version.hourlyRate,
      currency: version.currency,
    });
  });
}

export async function listStaffCompensationAssignments(input: {
  scope: StaffSettingsScope;
}): Promise<StaffCompensationAssignment[]> {
  const rows = await db
    .select({
      id: staffCompensationAssignment.id,
      instructorId: staffCompensationAssignment.instructorId,
      instructorName: instructor.name,
      templateVersionId: staffCompensationAssignment.templateVersionId,
      effectiveFrom: staffCompensationAssignment.effectiveFrom,
      effectiveTo: staffCompensationAssignment.effectiveTo,
      templateName: staffCompensationTemplate.name,
      version: staffCompensationTemplateVersion.version,
      hourlyRate: staffCompensationTemplateVersion.hourlyRate,
      currency: staffCompensationTemplateVersion.currency,
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
    .innerJoin(
      instructor,
      and(
        eq(instructor.id, staffCompensationAssignment.instructorId),
        eq(
          instructor.organizationId,
          staffCompensationAssignment.organizationId,
        ),
        sql`(${staffCompensationAssignment.locationId} IS NULL OR ${instructor.locationId} = ${staffCompensationAssignment.locationId})`,
      ),
    )
    .where(
      and(
        eq(
          staffCompensationAssignment.organizationId,
          input.scope.organizationId,
        ),
        scopeLocation(
          staffCompensationAssignment.locationId,
          input.scope.locationId,
        ),
      ),
    )
    .orderBy(desc(staffCompensationAssignment.effectiveFrom))
    .limit(100);
  return rows.map((row) => staffCompensationAssignmentSchema.parse(row));
}

export async function listAssignableInstructors(input: {
  scope: StaffSettingsScope;
}): Promise<Array<{ id: string; name: string }>> {
  return db
    .select({ id: instructor.id, name: instructor.name })
    .from(instructor)
    .where(
      and(
        eq(instructor.organizationId, input.scope.organizationId),
        eq(instructor.isActive, true),
        input.scope.locationId === null
          ? sql`true`
          : eq(instructor.locationId, input.scope.locationId),
      ),
    )
    .orderBy(instructor.name)
    .limit(100);
}
