import "server-only";

import { TRPCError } from "@trpc/server";
import { eq, isNull, type SQL } from "drizzle-orm";

import { workspaceRegionalSettingsVersion } from "@/db/schema";
import {
  workspaceRegionalValuesSchema,
  type WorkspaceRegionalValues,
} from "@/features/workspace-settings/contracts";
import type { ResolvedWorkspaceRegionalSettings } from "@/features/workspace-settings/lib/regional-settings";

import type { WorkspaceSettingsScope } from "./access";

type RegionalVersionRow = typeof workspaceRegionalSettingsVersion.$inferSelect;

export type RegionalSettingsVersionView = {
  id: string;
  version: number;
  values: WorkspaceRegionalValues;
  isActive: boolean;
  isRollback: boolean;
  rollbackFromVersion: number | null;
  changeNote: string | null;
  createdAt: Date;
  createdBy: string | null;
};

export type WorkspaceRegionalSettingsView = {
  scope: WorkspaceSettingsScope;
  organizationVersion: RegionalSettingsVersionView | null;
  currentVersion: RegionalSettingsVersionView | null;
  organizationEffective: ResolvedWorkspaceRegionalSettings;
  effective: ResolvedWorkspaceRegionalSettings;
};

export type RegionalSettingsHistoryItem = RegionalSettingsVersionView & {
  actor: { name: string; email: string } | null;
};

export function exactRegionalSettingsLocation(locationId: string | null): SQL {
  return locationId === null
    ? isNull(workspaceRegionalSettingsVersion.locationId)
    : eq(workspaceRegionalSettingsVersion.locationId, locationId);
}

export function regionalSettingsVersionView(
  row: RegionalVersionRow,
): RegionalSettingsVersionView {
  const values = workspaceRegionalValuesSchema.safeParse({
    timezone: row.timezone,
    locale: row.locale,
    currency: row.currency,
    weekStart: row.weekStart,
    dateFormat: row.dateFormat,
    timeFormat: row.timeFormat,
  });
  if (!values.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Workspace regional settings version ${row.version} is invalid.`,
    });
  }
  return {
    id: row.id,
    version: row.version,
    values: values.data,
    isActive: row.isActive,
    isRollback: row.isRollback,
    rollbackFromVersion: row.rollbackFromVersion,
    changeNote: row.changeNote,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}
