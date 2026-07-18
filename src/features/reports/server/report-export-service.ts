import "server-only";

import { createHash } from "node:crypto";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { reportExportRequest, user } from "@/db/schema";
import { getReportFields } from "@/features/reports/helpers";
import { buildReportCsv } from "@/features/reports/lib/report-csv";
import { formatReportDateInTimezone } from "@/features/reports/lib/report-time";

import type { ReportViewDefinition } from "../contracts";
import { getReportById } from "../helpers";
import {
  projectReportRows,
  visibleReportFields,
} from "../lib/report-view-projection";
import type { ReportGroupId } from "../types";
import { getReportRowsForScope } from "./router";
import { getReportDataHealth } from "./report-health";
import { getReportLocale, type ReportScope } from "./report-scope";
import { getAccessibleSavedView } from "./saved-view-service";

const REPORT_EXPORT_ROW_LIMIT = 500;

export type ReportExportResult = {
  id: string;
  csv: string;
  filename: string;
  rowCount: number;
  possiblePartial: boolean;
  timezone: string;
  currency: string;
};

export async function createReportExport(input: {
  scope: ReportScope;
  userId: string;
  groupId: ReportGroupId;
  reportId: string;
  savedViewId: string | null;
  definition: ReportViewDefinition;
}): Promise<ReportExportResult> {
  const report = getReportById(input.groupId, input.reportId);
  if (!report) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
  }
  let definition = input.definition;
  if (input.savedViewId) {
    const savedView = await getAccessibleSavedView({
      id: input.savedViewId,
      scope: input.scope,
      userId: input.userId,
    });
    if (
      savedView.reportGroupId !== input.groupId ||
      savedView.reportId !== input.reportId
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The selected saved view belongs to a different report.",
      });
    }
    definition = savedView.definition;
  }

  const [locale, health] = await Promise.all([
    getReportLocale(input.scope),
    getReportDataHealth({
      scope: input.scope,
      groupId: input.groupId,
      reportId: input.reportId,
    }),
  ]);
  const selectedCurrencies = definition.filters.currency ?? [];
  if (health.currencies.length > 1 && selectedCurrencies.length !== 1) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Filter this report to one currency before exporting.",
    });
  }
  if (
    selectedCurrencies.length === 1 &&
    !health.currencies.includes(selectedCurrencies[0] ?? "")
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The selected currency is not present in this report.",
    });
  }
  const exportCurrency = selectedCurrencies[0] ?? health.currency;
  const fields = getReportFields(report);
  const exportFields = visibleReportFields(fields, definition);
  if (exportFields.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select at least one report column before exporting.",
    });
  }

  const id = createId();
  let prepared: Omit<ReportExportResult, "id"> & { contentHash: string };
  try {
    const source = await getReportRowsForScope({
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
      groupId: input.groupId,
      reportId: input.reportId,
    });
    const projectedRows = projectReportRows({
      rows: source.rows,
      fields,
      definition,
    });
    const rows = projectedRows.slice(0, REPORT_EXPORT_ROW_LIMIT);
    const possiblePartial = source.sourceLimitReached;
    const csv = buildReportCsv({
      rows,
      fields: exportFields,
      currency: exportCurrency,
      timezone: locale.timezone,
    });
    const exportDate = formatReportDateInTimezone(new Date(), locale.timezone);
    if (!exportDate) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "The report export date could not be resolved.",
      });
    }
    const filename = `${slug(report.name)}-${exportDate}.csv`;
    const contentHash = createHash("sha256").update(csv).digest("hex");
    prepared = {
      csv,
      filename,
      rowCount: rows.length,
      possiblePartial,
      timezone: locale.timezone,
      currency: exportCurrency,
      contentHash,
    };
  } catch (error) {
    await db.insert(reportExportRequest).values({
      id,
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
      requestedById: input.userId,
      savedViewId: input.savedViewId,
      reportGroupId: input.groupId,
      reportId: input.reportId,
      status: "FAILED",
      definitionSnapshot: definition,
      fieldSnapshot: exportFields,
      timezone: locale.timezone,
      currency: exportCurrency,
      failureMessage: safeFailureMessage(error),
      completedAt: new Date(),
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The report export could not be generated.",
      cause: error,
    });
  }

  await db.insert(reportExportRequest).values({
    id,
    organizationId: input.scope.organizationId,
    locationId: input.scope.locationId,
    requestedById: input.userId,
    savedViewId: input.savedViewId,
    reportGroupId: input.groupId,
    reportId: input.reportId,
    status: "COMPLETED",
    definitionSnapshot: definition,
    fieldSnapshot: exportFields,
    timezone: prepared.timezone,
    currency: prepared.currency,
    rowCount: prepared.rowCount,
    fileName: prepared.filename,
    contentHash: prepared.contentHash,
    possiblePartial: prepared.possiblePartial,
    completedAt: new Date(),
  });

  return {
    id,
    csv: prepared.csv,
    filename: prepared.filename,
    rowCount: prepared.rowCount,
    possiblePartial: prepared.possiblePartial,
    timezone: prepared.timezone,
    currency: prepared.currency,
  };
}

export async function listReportExports(input: {
  scope: ReportScope;
  groupId: ReportGroupId;
  reportId: string;
}): Promise<
  Array<{
    id: string;
    status: "PENDING" | "COMPLETED" | "FAILED";
    rowCount: number | null;
    filename: string | null;
    possiblePartial: boolean;
    requestedByName: string | null;
    requestedAt: Date;
    completedAt: Date | null;
  }>
> {
  return db
    .select({
      id: reportExportRequest.id,
      status: reportExportRequest.status,
      rowCount: reportExportRequest.rowCount,
      filename: reportExportRequest.fileName,
      possiblePartial: reportExportRequest.possiblePartial,
      requestedByName: user.name,
      requestedAt: reportExportRequest.requestedAt,
      completedAt: reportExportRequest.completedAt,
    })
    .from(reportExportRequest)
    .leftJoin(user, eq(user.id, reportExportRequest.requestedById))
    .where(
      and(
        eq(reportExportRequest.organizationId, input.scope.organizationId),
        eq(reportExportRequest.locationId, input.scope.locationId),
        eq(reportExportRequest.reportGroupId, input.groupId),
        eq(reportExportRequest.reportId, input.reportId),
      ),
    )
    .orderBy(desc(reportExportRequest.requestedAt))
    .limit(20);
}

function slug(value: string): string {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function safeFailureMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return "Unknown export failure";
}
