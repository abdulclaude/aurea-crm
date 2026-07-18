import "server-only";

import { TRPCError } from "@trpc/server";
import { eq, isNull, type SQL } from "drizzle-orm";

import { workspaceOperationsSettingsVersion } from "@/db/schema";
import {
  workspaceOperationsValuesSchema,
  type WorkspaceOperationsValues,
} from "@/features/workspace-settings/operations-contracts";
import type { ResolvedWorkspaceOperationsSettings } from "@/features/workspace-settings/lib/operations-settings";

import type { WorkspaceSettingsScope } from "./access";

type OperationsVersionRow =
  typeof workspaceOperationsSettingsVersion.$inferSelect;

export type OperationsSettingsVersionView = {
  id: string;
  version: number;
  values: WorkspaceOperationsValues;
  isActive: boolean;
  isRollback: boolean;
  rollbackFromVersion: number | null;
  changeNote: string | null;
  createdAt: Date;
  createdBy: string | null;
};

export type WorkspaceOperationsSettingsView = {
  scope: WorkspaceSettingsScope;
  organizationVersion: OperationsSettingsVersionView | null;
  currentVersion: OperationsSettingsVersionView | null;
  organizationEffective: ResolvedWorkspaceOperationsSettings;
  effective: ResolvedWorkspaceOperationsSettings;
};

export type OperationsSettingsHistoryItem =
  OperationsSettingsVersionView & {
    actor: { name: string; email: string } | null;
  };

export function exactOperationsSettingsLocation(
  locationId: string | null,
): SQL {
  return locationId === null
    ? isNull(workspaceOperationsSettingsVersion.locationId)
    : eq(workspaceOperationsSettingsVersion.locationId, locationId);
}

export function operationsSettingsVersionView(
  row: OperationsVersionRow,
): OperationsSettingsVersionView {
  const values = workspaceOperationsValuesSchema.safeParse({
    businessHours: row.businessHours,
    scheduleStartMinutes: row.scheduleStartMinutes,
    scheduleEndMinutes: row.scheduleEndMinutes,
    scheduleSlotMinutes: row.scheduleSlotMinutes,
    guestBookingEnabled: row.guestBookingEnabled,
    maxGuestsPerBooking: row.maxGuestsPerBooking,
    guestRequiredFields: row.guestRequiredFields,
    showPublicEmail: row.showPublicEmail,
    showPublicPhone: row.showPublicPhone,
    showPublicWebsite: row.showPublicWebsite,
    showPublicAddress: row.showPublicAddress,
  });
  if (!values.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Workspace operations settings version ${row.version} is invalid.`,
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
