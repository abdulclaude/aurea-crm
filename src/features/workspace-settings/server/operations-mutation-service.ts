import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, max, sql } from "drizzle-orm";

import { db } from "@/db";
import { workspaceOperationsSettingsVersion } from "@/db/schema";
import {
  requiredWorkspaceOperationsValuesSchema,
  type WorkspaceOperationsValues,
} from "@/features/workspace-settings/operations-contracts";
import {
  resolveWorkspaceOperationsSettings,
  resolvedOperationsValues,
} from "@/features/workspace-settings/lib/operations-settings";

import type { WorkspaceSettingsScope } from "./access";
import {
  exactOperationsSettingsLocation,
  operationsSettingsVersionView,
  type OperationsSettingsVersionView,
} from "./operations-model";

async function versionWorkspaceOperationsSettings(input: {
  scope: WorkspaceSettingsScope;
  actorUserId: string;
  values?: WorkspaceOperationsValues;
  rollbackTargetVersion?: number;
  expectedVersion: number | null;
  changeNote: string | null;
}): Promise<OperationsSettingsVersionView> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.scope.organizationId}:operations-settings`}, 0))`,
    );
    if (input.scope.locationId) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.scope.organizationId}:${input.scope.locationId}:operations-settings`}, 0))`,
      );
    }

    const [active] = await tx
      .select({ version: workspaceOperationsSettingsVersion.version })
      .from(workspaceOperationsSettingsVersion)
      .where(
        and(
          eq(
            workspaceOperationsSettingsVersion.organizationId,
            input.scope.organizationId,
          ),
          exactOperationsSettingsLocation(input.scope.locationId),
          eq(workspaceOperationsSettingsVersion.isActive, true),
        ),
      )
      .limit(1);
    if ((active?.version ?? null) !== input.expectedVersion) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "These operations settings changed after you opened them. Reload and review the latest version.",
      });
    }

    let values = input.values;
    if (input.rollbackTargetVersion !== undefined) {
      const [target] = await tx
        .select()
        .from(workspaceOperationsSettingsVersion)
        .where(
          and(
            eq(
              workspaceOperationsSettingsVersion.organizationId,
              input.scope.organizationId,
            ),
            exactOperationsSettingsLocation(input.scope.locationId),
            eq(
              workspaceOperationsSettingsVersion.version,
              input.rollbackTargetVersion,
            ),
          ),
        )
        .limit(1);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The selected operations settings version was not found.",
        });
      }
      values = operationsSettingsVersionView(target).values;
    }
    if (!values) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Operations settings values are required.",
      });
    }

    if (input.scope.locationId === null) {
      const parsed = requiredWorkspaceOperationsValuesSchema.safeParse(values);
      if (!parsed.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization operations defaults cannot inherit values.",
        });
      }
      values = parsed.data;
    } else {
      const [organizationRow] = await tx
        .select()
        .from(workspaceOperationsSettingsVersion)
        .where(
          and(
            eq(
              workspaceOperationsSettingsVersion.organizationId,
              input.scope.organizationId,
            ),
            isNull(workspaceOperationsSettingsVersion.locationId),
            eq(workspaceOperationsSettingsVersion.isActive, true),
          ),
        )
        .limit(1);
      const organizationValues = organizationRow
        ? operationsSettingsVersionView(organizationRow).values
        : null;
      const parsed = requiredWorkspaceOperationsValuesSchema.safeParse(
        resolvedOperationsValues(
          resolveWorkspaceOperationsSettings({
            organizationValues,
            locationValues: values,
            hasLocationScope: true,
          }),
        ),
      );
      if (!parsed.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Location operations overrides are invalid.",
        });
      }
    }

    const [latest] = await tx
      .select({ version: max(workspaceOperationsSettingsVersion.version) })
      .from(workspaceOperationsSettingsVersion)
      .where(
        and(
          eq(
            workspaceOperationsSettingsVersion.organizationId,
            input.scope.organizationId,
          ),
          exactOperationsSettingsLocation(input.scope.locationId),
        ),
      );
    await tx
      .update(workspaceOperationsSettingsVersion)
      .set({ isActive: false })
      .where(
        and(
          eq(
            workspaceOperationsSettingsVersion.organizationId,
            input.scope.organizationId,
          ),
          exactOperationsSettingsLocation(input.scope.locationId),
          eq(workspaceOperationsSettingsVersion.isActive, true),
        ),
      );
    const [created] = await tx
      .insert(workspaceOperationsSettingsVersion)
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
        message: "Workspace operations settings could not be saved.",
      });
    }
    return operationsSettingsVersionView(created);
  });
}

export function saveWorkspaceOperationsSettings(input: {
  scope: WorkspaceSettingsScope;
  actorUserId: string;
  values: WorkspaceOperationsValues;
  expectedVersion: number | null;
  changeNote: string | null;
}) {
  return versionWorkspaceOperationsSettings(input);
}

export function rollbackWorkspaceOperationsSettings(input: {
  scope: WorkspaceSettingsScope;
  actorUserId: string;
  targetVersion: number;
  expectedVersion: number | null;
  changeNote: string | null;
}) {
  return versionWorkspaceOperationsSettings({
    scope: input.scope,
    actorUserId: input.actorUserId,
    rollbackTargetVersion: input.targetVersion,
    expectedVersion: input.expectedVersion,
    changeNote: input.changeNote,
  });
}
