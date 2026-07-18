import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { reportSavedView, user } from "@/db/schema";

import {
  reportViewDefinitionSchema,
  type ReportViewDefinition,
} from "../contracts";
import type { ReportGroupId } from "../types";
import type { ReportLocale, ReportScope } from "./report-scope";

export type SavedReportView = {
  id: string;
  name: string;
  visibility: "PERSONAL" | "LOCATION";
  definition: ReportViewDefinition;
  timezone: string;
  currency: string;
  ownerId: string;
  ownerName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listSavedReportViews(input: {
  scope: ReportScope;
  userId: string;
  groupId: ReportGroupId;
  reportId: string;
}): Promise<SavedReportView[]> {
  const rows = await db
    .select({
      id: reportSavedView.id,
      name: reportSavedView.name,
      visibility: reportSavedView.visibility,
      definition: reportSavedView.definition,
      timezone: reportSavedView.timezone,
      currency: reportSavedView.currency,
      ownerId: reportSavedView.ownerId,
      ownerName: user.name,
      createdAt: reportSavedView.createdAt,
      updatedAt: reportSavedView.updatedAt,
    })
    .from(reportSavedView)
    .leftJoin(user, eq(user.id, reportSavedView.ownerId))
    .where(
      and(
        eq(reportSavedView.organizationId, input.scope.organizationId),
        eq(reportSavedView.locationId, input.scope.locationId),
        eq(reportSavedView.reportGroupId, input.groupId),
        eq(reportSavedView.reportId, input.reportId),
        isNull(reportSavedView.archivedAt),
        or(
          eq(reportSavedView.visibility, "LOCATION"),
          eq(reportSavedView.ownerId, input.userId),
        ),
      ),
    )
    .orderBy(desc(reportSavedView.updatedAt));

  return rows.map((row) => ({
    ...row,
    definition: reportViewDefinitionSchema.parse(row.definition),
  }));
}

export async function createSavedReportView(input: {
  scope: ReportScope;
  locale: ReportLocale;
  userId: string;
  groupId: ReportGroupId;
  reportId: string;
  name: string;
  visibility: "PERSONAL" | "LOCATION";
  definition: ReportViewDefinition;
}): Promise<{ id: string }> {
  const id = createId();
  await db.insert(reportSavedView).values({
    id,
    organizationId: input.scope.organizationId,
    locationId: input.scope.locationId,
    reportGroupId: input.groupId,
    reportId: input.reportId,
    name: input.name,
    visibility: input.visibility,
    definition: input.definition,
    schemaVersion: input.definition.version,
    timezone: input.locale.timezone,
    currency: input.locale.currency,
    ownerId: input.userId,
  });
  return { id };
}

export async function updateSavedReportView(input: {
  id: string;
  scope: ReportScope;
  userId: string;
  locale: ReportLocale;
  groupId: ReportGroupId;
  reportId: string;
  name: string;
  visibility: "PERSONAL" | "LOCATION";
  definition: ReportViewDefinition;
}): Promise<{ id: string }> {
  const existing = await getScopedSavedView(input.id, input.scope);
  assertEditable(existing, input.userId);
  if (
    existing.reportGroupId !== input.groupId ||
    existing.reportId !== input.reportId
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A saved view cannot be moved to a different report.",
    });
  }

  await db
    .update(reportSavedView)
    .set({
      reportGroupId: input.groupId,
      reportId: input.reportId,
      name: input.name,
      visibility: input.visibility,
      definition: input.definition,
      schemaVersion: input.definition.version,
      timezone: input.locale.timezone,
      currency: input.locale.currency,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reportSavedView.id, existing.id),
        eq(reportSavedView.organizationId, input.scope.organizationId),
        eq(reportSavedView.locationId, input.scope.locationId),
      ),
    );
  return { id: existing.id };
}

export async function archiveSavedReportView(input: {
  id: string;
  scope: ReportScope;
  userId: string;
}): Promise<{ id: string }> {
  const existing = await getScopedSavedView(input.id, input.scope);
  assertEditable(existing, input.userId);
  await db
    .update(reportSavedView)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(reportSavedView.id, existing.id),
        eq(reportSavedView.organizationId, input.scope.organizationId),
        eq(reportSavedView.locationId, input.scope.locationId),
      ),
    );
  return { id: existing.id };
}

export async function getAccessibleSavedView(input: {
  id: string;
  scope: ReportScope;
  userId: string;
}): Promise<{
  id: string;
  reportGroupId: string;
  reportId: string;
  definition: ReportViewDefinition;
}> {
  const existing = await getScopedSavedView(input.id, input.scope);
  if (existing.visibility === "PERSONAL" && existing.ownerId !== input.userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Saved view not found" });
  }
  return {
    id: existing.id,
    reportGroupId: existing.reportGroupId,
    reportId: existing.reportId,
    definition: reportViewDefinitionSchema.parse(existing.definition),
  };
}

async function getScopedSavedView(id: string, scope: ReportScope) {
  const [row] = await db
    .select({
      id: reportSavedView.id,
      ownerId: reportSavedView.ownerId,
      visibility: reportSavedView.visibility,
      definition: reportSavedView.definition,
      reportGroupId: reportSavedView.reportGroupId,
      reportId: reportSavedView.reportId,
    })
    .from(reportSavedView)
    .where(
      and(
        eq(reportSavedView.id, id),
        eq(reportSavedView.organizationId, scope.organizationId),
        eq(reportSavedView.locationId, scope.locationId),
        isNull(reportSavedView.archivedAt),
      ),
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Saved view not found" });
  }
  return row;
}

function assertEditable(
  view: { ownerId: string; visibility: "PERSONAL" | "LOCATION" },
  userId: string,
): void {
  if (view.visibility === "PERSONAL" && view.ownerId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Saved view not found" });
  }
}
