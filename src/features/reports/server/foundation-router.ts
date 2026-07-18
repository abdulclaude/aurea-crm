import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createReportExportInputSchema,
  metricContractSchema,
  reportDataHealthSchema,
  reportIdentitySchema,
  reportViewDefinitionSchema,
  reportViewVisibilitySchema,
  savedReportViewIdSchema,
  savedReportViewInputSchema,
  updateSavedReportViewInputSchema,
} from "@/features/reports/contracts";
import { getReportById } from "@/features/reports/helpers";
import { getMetricContractsForReport } from "@/features/reports/metric-contracts";
import { createTRPCRouter } from "@/trpc/init";

import { createReportExport, listReportExports } from "./report-export-service";
import { getReportDataHealth } from "./report-health";
import {
  reportExportProcedure,
  reportManageProcedure,
  reportViewProcedure,
} from "./report-procedures";
import { getReportLocale, requireReportScope } from "./report-scope";
import {
  archiveSavedReportView,
  createSavedReportView,
  listSavedReportViews,
  updateSavedReportView,
} from "./saved-view-service";

const savedViewOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  visibility: reportViewVisibilitySchema,
  definition: reportViewDefinitionSchema,
  timezone: z.string(),
  currency: z.string(),
  ownerId: z.string(),
  ownerName: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const exportHistoryOutputSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED"]),
  rowCount: z.number().int().nullable(),
  filename: z.string().nullable(),
  possiblePartial: z.boolean(),
  requestedByName: z.string().nullable(),
  requestedAt: z.date(),
  completedAt: z.date().nullable(),
});

export const reportFoundationRouter = createTRPCRouter({
  metricContracts: reportViewProcedure
    .input(reportIdentitySchema)
    .output(z.array(metricContractSchema))
    .query(({ input }) => {
      assertReportExists(input);
      return [...getMetricContractsForReport(input.reportId)];
    }),

  dataHealth: reportViewProcedure
    .input(reportIdentitySchema)
    .output(reportDataHealthSchema)
    .query(async ({ ctx, input }) => {
      assertReportExists(input);
      const scope = requireReportScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      return getReportDataHealth({
        scope,
        groupId: input.groupId,
        reportId: input.reportId,
      });
    }),

  listViews: reportViewProcedure
    .input(reportIdentitySchema)
    .output(z.array(savedViewOutputSchema))
    .query(async ({ ctx, input }) => {
      assertReportExists(input);
      const scope = requireReportScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      return listSavedReportViews({
        scope,
        userId: ctx.auth.user.id,
        groupId: input.groupId,
        reportId: input.reportId,
      });
    }),

  createView: reportManageProcedure
    .input(savedReportViewInputSchema)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertReportExists(input);
      const scope = requireReportScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      const locale = await getReportLocale(scope);
      return createSavedReportView({
        scope,
        locale,
        userId: ctx.auth.user.id,
        groupId: input.groupId,
        reportId: input.reportId,
        name: input.name,
        visibility: input.visibility,
        definition: input.definition,
      });
    }),

  updateView: reportManageProcedure
    .input(updateSavedReportViewInputSchema)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertReportExists(input);
      const scope = requireReportScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      const locale = await getReportLocale(scope);
      return updateSavedReportView({
        id: input.id,
        scope,
        locale,
        userId: ctx.auth.user.id,
        groupId: input.groupId,
        reportId: input.reportId,
        name: input.name,
        visibility: input.visibility,
        definition: input.definition,
      });
    }),

  archiveView: reportManageProcedure
    .input(savedReportViewIdSchema)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = requireReportScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      return archiveSavedReportView({
        id: input.id,
        scope,
        userId: ctx.auth.user.id,
      });
    }),

  createExport: reportExportProcedure
    .input(createReportExportInputSchema)
    .output(
      z.object({
        id: z.string(),
        csv: z.string(),
        filename: z.string(),
        rowCount: z.number().int(),
        possiblePartial: z.boolean(),
        timezone: z.string(),
        currency: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertReportExists(input);
      const scope = requireReportScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      return createReportExport({
        scope,
        userId: ctx.auth.user.id,
        groupId: input.groupId,
        reportId: input.reportId,
        savedViewId: input.savedViewId,
        definition: input.definition,
      });
    }),

  listExports: reportExportProcedure
    .input(reportIdentitySchema)
    .output(z.array(exportHistoryOutputSchema))
    .query(async ({ ctx, input }) => {
      assertReportExists(input);
      const scope = requireReportScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      return listReportExports({
        scope,
        groupId: input.groupId,
        reportId: input.reportId,
      });
    }),
});

function assertReportExists(input: {
  groupId: Parameters<typeof getReportById>[0];
  reportId: string;
}): void {
  if (!getReportById(input.groupId, input.reportId)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
  }
}
