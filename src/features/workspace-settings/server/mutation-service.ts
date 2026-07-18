import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, max, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  location,
  organization,
  workspaceRegionalSettingsVersion,
} from "@/db/schema";
import {
  requiredWorkspaceRegionalValuesSchema,
  type WorkspaceRegionalValues,
} from "@/features/workspace-settings/contracts";
import { SYSTEM_REGIONAL_DEFAULTS } from "@/features/workspace-settings/lib/regional-settings";

import type { WorkspaceSettingsScope } from "./access";
import {
  exactRegionalSettingsLocation,
  regionalSettingsVersionView,
  type RegionalSettingsVersionView,
} from "./model";

async function versionWorkspaceRegionalSettings(input: {
  scope: WorkspaceSettingsScope;
  actorUserId: string;
  values?: WorkspaceRegionalValues;
  rollbackTargetVersion?: number;
  expectedVersion: number | null;
  changeNote: string | null;
}): Promise<RegionalSettingsVersionView> {
  return db.transaction(async (tx) => {
    const organizationLockKey = `${input.scope.organizationId}:regional-settings`;
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${organizationLockKey}, 0))`,
    );
    if (input.scope.locationId) {
      const locationLockKey = `${input.scope.organizationId}:${input.scope.locationId}:regional-settings`;
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${locationLockKey}, 0))`,
      );
    }

    const [active] = await tx
      .select({ version: workspaceRegionalSettingsVersion.version })
      .from(workspaceRegionalSettingsVersion)
      .where(
        and(
          eq(workspaceRegionalSettingsVersion.organizationId, input.scope.organizationId),
          exactRegionalSettingsLocation(input.scope.locationId),
          eq(workspaceRegionalSettingsVersion.isActive, true),
        ),
      )
      .limit(1);
    if ((active?.version ?? null) !== input.expectedVersion) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "These settings changed after you opened them. Reload and review the latest version.",
      });
    }

    let values = input.values;
    if (input.rollbackTargetVersion !== undefined) {
      const [target] = await tx
        .select()
        .from(workspaceRegionalSettingsVersion)
        .where(
          and(
            eq(workspaceRegionalSettingsVersion.organizationId, input.scope.organizationId),
            exactRegionalSettingsLocation(input.scope.locationId),
            eq(workspaceRegionalSettingsVersion.version, input.rollbackTargetVersion),
          ),
        )
        .limit(1);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The selected settings version was not found.",
        });
      }
      values = regionalSettingsVersionView(target).values;
    }
    if (!values) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Regional settings values are required.",
      });
    }
    if (input.scope.locationId === null) {
      const required = requiredWorkspaceRegionalValuesSchema.safeParse(values);
      if (!required.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization regional defaults cannot inherit values.",
        });
      }
      values = required.data;
    }

    const [latest] = await tx
      .select({ version: max(workspaceRegionalSettingsVersion.version) })
      .from(workspaceRegionalSettingsVersion)
      .where(
        and(
          eq(workspaceRegionalSettingsVersion.organizationId, input.scope.organizationId),
          exactRegionalSettingsLocation(input.scope.locationId),
        ),
      );
    await tx
      .update(workspaceRegionalSettingsVersion)
      .set({ isActive: false })
      .where(
        and(
          eq(workspaceRegionalSettingsVersion.organizationId, input.scope.organizationId),
          exactRegionalSettingsLocation(input.scope.locationId),
          eq(workspaceRegionalSettingsVersion.isActive, true),
        ),
      );

    const [created] = await tx
      .insert(workspaceRegionalSettingsVersion)
      .values({
        id: createId(),
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        version: (latest?.version ?? 0) + 1,
        ...values,
        isActive: true,
        isRollback: input.rollbackTargetVersion !== undefined,
        rollbackFromVersion: input.rollbackTargetVersion ?? null,
        changeNote:
          input.changeNote ??
          (input.rollbackTargetVersion
            ? `Restored version ${input.rollbackTargetVersion}`
            : null),
        createdBy: input.actorUserId,
        createdAt: new Date(),
      })
      .returning();
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Workspace regional settings could not be saved.",
      });
    }

    await syncLegacyRegionalColumns(tx, input.scope, values);
    return regionalSettingsVersionView(created);
  });
}

async function syncLegacyRegionalColumns(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  scope: WorkspaceSettingsScope,
  values: WorkspaceRegionalValues,
): Promise<void> {
  if (scope.locationId === null) {
    const required = requiredWorkspaceRegionalValuesSchema.parse(values);
    await tx.update(organization).set({ currency: required.currency }).where(eq(organization.id, scope.organizationId));
    await tx
      .update(location)
      .set({ timezone: required.timezone, updatedAt: new Date() })
      .where(
        and(
          eq(location.organizationId, scope.organizationId),
          sql`NOT EXISTS (
            SELECT 1 FROM ${workspaceRegionalSettingsVersion} AS regional_override
            WHERE regional_override."organizationId" = ${location.organizationId}
              AND regional_override."locationId" = ${location.id}
              AND regional_override."isActive" = true
              AND regional_override."timezone" IS NOT NULL
          )`,
        ),
      );
    return;
  }

  const [organizationDefaults] = await tx
    .select({ timezone: workspaceRegionalSettingsVersion.timezone })
    .from(workspaceRegionalSettingsVersion)
    .where(
      and(
        eq(workspaceRegionalSettingsVersion.organizationId, scope.organizationId),
        isNull(workspaceRegionalSettingsVersion.locationId),
        eq(workspaceRegionalSettingsVersion.isActive, true),
      ),
    )
    .limit(1);
  await tx
    .update(location)
    .set({
      timezone:
        values.timezone ??
        organizationDefaults?.timezone ??
        SYSTEM_REGIONAL_DEFAULTS.timezone,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(location.organizationId, scope.organizationId),
        eq(location.id, scope.locationId),
      ),
    );
}

export async function saveWorkspaceRegionalSettings(input: {
  scope: WorkspaceSettingsScope;
  actorUserId: string;
  values: WorkspaceRegionalValues;
  expectedVersion: number | null;
  changeNote: string | null;
}): Promise<RegionalSettingsVersionView> {
  return versionWorkspaceRegionalSettings(input);
}

export async function rollbackWorkspaceRegionalSettings(input: {
  scope: WorkspaceSettingsScope;
  actorUserId: string;
  targetVersion: number;
  expectedVersion: number | null;
  changeNote: string | null;
}): Promise<RegionalSettingsVersionView> {
  return versionWorkspaceRegionalSettings({
    scope: input.scope,
    actorUserId: input.actorUserId,
    rollbackTargetVersion: input.targetVersion,
    expectedVersion: input.expectedVersion,
    changeNote: input.changeNote,
  });
}
