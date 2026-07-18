import "server-only";

import { and, desc, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { user, workspaceOperationsSettingsVersion } from "@/db/schema";
import {
  resolveWorkspaceOperationsSettings,
  resolvedOperationsValues,
} from "@/features/workspace-settings/lib/operations-settings";

import type { WorkspaceSettingsScope } from "./access";
import {
  exactOperationsSettingsLocation,
  operationsSettingsVersionView,
  type OperationsSettingsHistoryItem,
  type WorkspaceOperationsSettingsView,
} from "./operations-model";

export async function getWorkspaceOperationsSettings(
  scope: WorkspaceSettingsScope,
): Promise<WorkspaceOperationsSettingsView> {
  const rows = await db
    .select()
    .from(workspaceOperationsSettingsVersion)
    .where(
      and(
        eq(
          workspaceOperationsSettingsVersion.organizationId,
          scope.organizationId,
        ),
        eq(workspaceOperationsSettingsVersion.isActive, true),
        scope.locationId
          ? or(
              isNull(workspaceOperationsSettingsVersion.locationId),
              eq(
                workspaceOperationsSettingsVersion.locationId,
                scope.locationId,
              ),
            )
          : isNull(workspaceOperationsSettingsVersion.locationId),
      ),
    );
  const organizationRow = rows.find((row) => row.locationId === null) ?? null;
  const locationRow = scope.locationId
    ? (rows.find((row) => row.locationId === scope.locationId) ?? null)
    : null;
  const organizationVersion = organizationRow
    ? operationsSettingsVersionView(organizationRow)
    : null;
  const currentVersion = scope.locationId
    ? locationRow
      ? operationsSettingsVersionView(locationRow)
      : null
    : organizationVersion;
  const organizationEffective = resolveWorkspaceOperationsSettings({
    organizationValues: organizationVersion?.values ?? null,
    locationValues: null,
    hasLocationScope: false,
  });
  const effective = resolveWorkspaceOperationsSettings({
    organizationValues: organizationVersion?.values ?? null,
    locationValues: locationRow
      ? operationsSettingsVersionView(locationRow).values
      : null,
    hasLocationScope: scope.locationId !== null,
  });
  return {
    scope,
    organizationVersion,
    currentVersion,
    organizationEffective,
    effective,
  };
}

export async function listWorkspaceOperationsSettingsHistory(
  scope: WorkspaceSettingsScope,
): Promise<OperationsSettingsHistoryItem[]> {
  const rows = await db
    .select({
      version: workspaceOperationsSettingsVersion,
      actorName: user.name,
      actorEmail: user.email,
    })
    .from(workspaceOperationsSettingsVersion)
    .leftJoin(user, eq(user.id, workspaceOperationsSettingsVersion.createdBy))
    .where(
      and(
        eq(
          workspaceOperationsSettingsVersion.organizationId,
          scope.organizationId,
        ),
        exactOperationsSettingsLocation(scope.locationId),
      ),
    )
    .orderBy(desc(workspaceOperationsSettingsVersion.version))
    .limit(50);
  return rows.map((row) => ({
    ...operationsSettingsVersionView(row.version),
    actor:
      row.actorName && row.actorEmail
        ? { name: row.actorName, email: row.actorEmail }
        : null,
  }));
}

export async function getEffectiveWorkspaceOperationsValues(
  scope: WorkspaceSettingsScope,
) {
  return resolvedOperationsValues(
    (await getWorkspaceOperationsSettings(scope)).effective,
  );
}
