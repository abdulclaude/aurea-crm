import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  location,
  organization,
  user as userTable,
  workspaceRegionalSettingsVersion,
} from "@/db/schema";
import {
  resolveWorkspaceRegionalSettings,
  resolvedRegionalValues,
} from "@/features/workspace-settings/lib/regional-settings";

import type { WorkspaceSettingsScope } from "./access";
import {
  exactRegionalSettingsLocation,
  regionalSettingsVersionView,
  type RegionalSettingsHistoryItem,
  type WorkspaceRegionalSettingsView,
} from "./model";

export async function getWorkspaceRegionalSettings(
  scope: WorkspaceSettingsScope,
): Promise<WorkspaceRegionalSettingsView> {
  const [[organizationRow], locationRows, versions] = await Promise.all([
    db
      .select({ currency: organization.currency })
      .from(organization)
      .where(eq(organization.id, scope.organizationId))
      .limit(1),
    scope.locationId
      ? db
          .select({ timezone: location.timezone })
          .from(location)
          .where(
            and(
              eq(location.organizationId, scope.organizationId),
              eq(location.id, scope.locationId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(workspaceRegionalSettingsVersion)
      .where(
        and(
          eq(
            workspaceRegionalSettingsVersion.organizationId,
            scope.organizationId,
          ),
          eq(workspaceRegionalSettingsVersion.isActive, true),
          scope.locationId
            ? or(
                isNull(workspaceRegionalSettingsVersion.locationId),
                eq(
                  workspaceRegionalSettingsVersion.locationId,
                  scope.locationId,
                ),
              )
            : isNull(workspaceRegionalSettingsVersion.locationId),
        ),
      ),
  ]);

  if (!organizationRow) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The active organization was not found.",
    });
  }
  if (scope.locationId && !locationRows[0]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The active location is not available in this organization.",
    });
  }
  const organizationVersion = versions.find((row) => row.locationId === null);
  const locationVersion = scope.locationId
    ? versions.find((row) => row.locationId === scope.locationId)
    : undefined;
  const organizationView = organizationVersion
    ? regionalSettingsVersionView(organizationVersion)
    : null;
  const locationView = locationVersion
    ? regionalSettingsVersionView(locationVersion)
    : null;
  const organizationEffective = resolveWorkspaceRegionalSettings({
    organizationValues: organizationView?.values ?? null,
    locationValues: null,
    hasLocationScope: false,
    legacyOrganizationCurrency: organizationRow.currency,
    legacyLocationTimezone: null,
  });
  const effective = resolveWorkspaceRegionalSettings({
    organizationValues: organizationView?.values ?? null,
    locationValues: locationView?.values ?? null,
    hasLocationScope: scope.locationId !== null,
    legacyOrganizationCurrency: organizationRow.currency,
    legacyLocationTimezone: locationRows[0]?.timezone ?? null,
  });

  return {
    scope,
    organizationVersion: organizationView,
    currentVersion: scope.locationId ? locationView : organizationView,
    organizationEffective,
    effective,
  };
}

export async function listWorkspaceRegionalSettingsHistory(
  scope: WorkspaceSettingsScope,
): Promise<RegionalSettingsHistoryItem[]> {
  const rows = await db
    .select({
      version: workspaceRegionalSettingsVersion,
      actorName: userTable.name,
      actorEmail: userTable.email,
    })
    .from(workspaceRegionalSettingsVersion)
    .leftJoin(userTable, eq(userTable.id, workspaceRegionalSettingsVersion.createdBy))
    .where(
      and(
        eq(workspaceRegionalSettingsVersion.organizationId, scope.organizationId),
        exactRegionalSettingsLocation(scope.locationId),
      ),
    )
    .orderBy(desc(workspaceRegionalSettingsVersion.version))
    .limit(25);

  return rows.map((row) => ({
    ...regionalSettingsVersionView(row.version),
    actor:
      row.actorName && row.actorEmail
        ? { name: row.actorName, email: row.actorEmail }
        : null,
  }));
}

export async function getEffectiveWorkspaceRegionalValues(
  scope: WorkspaceSettingsScope,
): Promise<ReturnType<typeof resolvedRegionalValues>> {
  const settings = await getWorkspaceRegionalSettings(scope);
  return resolvedRegionalValues(settings.effective);
}
