import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  staffCompensationTemplate,
  staffCompensationTemplateVersion,
} from "@/db/schema";
import {
  staffCompensationTemplateSchema,
  type StaffCompensationTemplate,
} from "@/features/staff-settings/contracts";

import type { StaffSettingsScope } from "./access";
import { scopeLocation } from "./scope-location";

function templateView(row: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  versionId: string;
  version: number;
  hourlyRate: string;
  currency: string;
  effectiveFrom: Date;
  changeNote: string | null;
}): StaffCompensationTemplate {
  return staffCompensationTemplateSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    currentVersion: {
      id: row.versionId,
      version: row.version,
      hourlyRate: row.hourlyRate,
      currency: row.currency,
      effectiveFrom: row.effectiveFrom,
      changeNote: row.changeNote,
    },
  });
}

export async function listStaffCompensationTemplates(input: {
  scope: StaffSettingsScope;
}): Promise<StaffCompensationTemplate[]> {
  const rows = await db
    .select({
      id: staffCompensationTemplate.id,
      name: staffCompensationTemplate.name,
      description: staffCompensationTemplate.description,
      createdAt: staffCompensationTemplate.createdAt,
      versionId: staffCompensationTemplateVersion.id,
      version: staffCompensationTemplateVersion.version,
      hourlyRate: staffCompensationTemplateVersion.hourlyRate,
      currency: staffCompensationTemplateVersion.currency,
      effectiveFrom: staffCompensationTemplateVersion.effectiveFrom,
      changeNote: staffCompensationTemplateVersion.changeNote,
    })
    .from(staffCompensationTemplate)
    .innerJoin(
      staffCompensationTemplateVersion,
      and(
        eq(
          staffCompensationTemplateVersion.templateId,
          staffCompensationTemplate.id,
        ),
        eq(
          staffCompensationTemplateVersion.organizationId,
          staffCompensationTemplate.organizationId,
        ),
        sql`${staffCompensationTemplateVersion.locationId} IS NOT DISTINCT FROM ${staffCompensationTemplate.locationId}`,
        eq(
          staffCompensationTemplateVersion.version,
          staffCompensationTemplate.currentVersion,
        ),
      ),
    )
    .where(
      and(
        eq(
          staffCompensationTemplate.organizationId,
          input.scope.organizationId,
        ),
        scopeLocation(
          staffCompensationTemplate.locationId,
          input.scope.locationId,
        ),
        isNull(staffCompensationTemplate.archivedAt),
      ),
    )
    .orderBy(staffCompensationTemplate.name)
    .limit(100);
  return rows.map(templateView);
}

export async function createStaffCompensationTemplate(input: {
  scope: StaffSettingsScope;
  actorUserId: string;
  name: string;
  description: string | null;
  hourlyRate: string;
  currency: string;
  effectiveFrom?: Date;
  changeNote: string | null;
}): Promise<StaffCompensationTemplate> {
  if (input.effectiveFrom && input.effectiveFrom.getTime() > Date.now()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Future-dated compensation versions are not supported yet.",
    });
  }
  return db.transaction(async (tx) => {
    const templateId = createId();
    const versionId = createId();
    const now = new Date();
    try {
      await tx.insert(staffCompensationTemplate).values({
        id: templateId,
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        name: input.name,
        description: input.description,
        currentVersion: 1,
        createdById: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "A compensation template with this name already exists.",
          cause: error,
        });
      }
      throw error;
    }
    const [version] = await tx
      .insert(staffCompensationTemplateVersion)
      .values({
        id: versionId,
        templateId,
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        version: 1,
        compensationBasis: "HOURLY_RATE",
        hourlyRate: input.hourlyRate,
        currency: input.currency,
        effectiveFrom: input.effectiveFrom ?? now,
        changeNote: input.changeNote,
        createdById: input.actorUserId,
        createdAt: now,
      })
      .returning();
    if (!version) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Compensation template could not be created.",
      });
    }
    return templateView({
      id: templateId,
      name: input.name,
      description: input.description,
      createdAt: now,
      versionId: version.id,
      version: version.version,
      hourlyRate: version.hourlyRate,
      currency: version.currency,
      effectiveFrom: version.effectiveFrom,
      changeNote: version.changeNote,
    });
  });
}

export async function versionStaffCompensationTemplate(input: {
  scope: StaffSettingsScope;
  actorUserId: string;
  templateId: string;
  expectedVersion: number;
  hourlyRate: string;
  currency: string;
  effectiveFrom?: Date;
  changeNote: string | null;
}): Promise<StaffCompensationTemplate> {
  if (input.effectiveFrom && input.effectiveFrom.getTime() > Date.now()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Future-dated compensation versions are not supported yet.",
    });
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.scope.organizationId}:${input.templateId}:compensation-template`}, 0))`,
    );
    const [template] = await tx
      .select({
        id: staffCompensationTemplate.id,
        name: staffCompensationTemplate.name,
        description: staffCompensationTemplate.description,
        currentVersion: staffCompensationTemplate.currentVersion,
        createdAt: staffCompensationTemplate.createdAt,
      })
      .from(staffCompensationTemplate)
      .where(
        and(
          eq(staffCompensationTemplate.id, input.templateId),
          eq(
            staffCompensationTemplate.organizationId,
            input.scope.organizationId,
          ),
          scopeLocation(
            staffCompensationTemplate.locationId,
            input.scope.locationId,
          ),
          isNull(staffCompensationTemplate.archivedAt),
        ),
      )
      .limit(1);
    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Compensation template not found.",
      });
    }
    if (template.currentVersion !== input.expectedVersion) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This compensation template changed. Reload and review its latest version.",
      });
    }
    const nextVersion = template.currentVersion + 1;
    const [version] = await tx
      .insert(staffCompensationTemplateVersion)
      .values({
        id: createId(),
        templateId: template.id,
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        version: nextVersion,
        compensationBasis: "HOURLY_RATE",
        hourlyRate: input.hourlyRate,
        currency: input.currency,
        effectiveFrom: input.effectiveFrom ?? new Date(),
        changeNote: input.changeNote,
        createdById: input.actorUserId,
        createdAt: new Date(),
      })
      .returning();
    if (!version) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Compensation template version could not be created.",
      });
    }
    const [updated] = await tx
      .update(staffCompensationTemplate)
      .set({ currentVersion: nextVersion, updatedAt: new Date() })
      .where(
        and(
          eq(staffCompensationTemplate.id, template.id),
          eq(staffCompensationTemplate.currentVersion, input.expectedVersion),
        ),
      )
      .returning({ id: staffCompensationTemplate.id });
    if (!updated) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Compensation template changed. Reload and try again.",
      });
    }
    return templateView({
      id: template.id,
      name: template.name,
      description: template.description,
      createdAt: template.createdAt,
      versionId: version.id,
      version: version.version,
      hourlyRate: version.hourlyRate,
      currency: version.currency,
      effectiveFrom: version.effectiveFrom,
      changeNote: version.changeNote,
    });
  });
}
