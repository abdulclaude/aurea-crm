import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { client, waiverSignature, waiverTemplate } from "@/db/schema";

const withSignatureCount = (row: {
  template: typeof waiverTemplate.$inferSelect;
  signatureCount: number;
}) => ({
  ...row.template,
  _count: { signatures: row.signatureCount },
});

export const waiversRouter = createTRPCRouter({
  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    const templates = await db
      .select({
        template: waiverTemplate,
        signatureCount: count(waiverSignature.id),
      })
      .from(waiverTemplate)
      .leftJoin(waiverSignature, eq(waiverSignature.templateId, waiverTemplate.id))
      .where(
        and(
          eq(waiverTemplate.organizationId, ctx.orgId),
          ...(ctx.locationId ? [eq(waiverTemplate.locationId, ctx.locationId)] : [])
        )
      )
      .groupBy(waiverTemplate.id)
      .orderBy(desc(waiverTemplate.createdAt));

    return templates.map(withSignatureCount);
  }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        content: z.string().min(1),
        isRequired: z.boolean().default(true),
        requiresMinor: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const now = new Date();
      const [createdTemplate] = await db
        .insert(waiverTemplate)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          ...input,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdTemplate;
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        isRequired: z.boolean().optional(),
        requiresMinor: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const { id, ...data } = input;

      const template = await db.query.waiverTemplate.findFirst({
        where: and(eq(waiverTemplate.id, id), eq(waiverTemplate.organizationId, ctx.orgId)),
      });

      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Waiver template not found" });

      const [updatedTemplate] = await db
        .update(waiverTemplate)
        .set({
          ...data,
          version: sql`${waiverTemplate.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(waiverTemplate.id, id))
        .returning();

      return updatedTemplate;
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const template = await db.query.waiverTemplate.findFirst({
        where: and(eq(waiverTemplate.id, input.id), eq(waiverTemplate.organizationId, ctx.orgId)),
      });

      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Waiver template not found" });

      const [deletedTemplate] = await db
        .delete(waiverTemplate)
        .where(eq(waiverTemplate.id, input.id))
        .returning();

      return deletedTemplate;
    }),

  sign: baseProcedure
    .input(
      z.object({
        templateId: z.string(),
        clientId: z.string(),
        signatureData: z.string().min(1),
        ipAddress: z.string().optional(),
        emergencyName: z.string().optional(),
        emergencyPhone: z.string().optional(),
        healthConditions: z.string().optional(),
        minorName: z.string().optional(),
        guardianName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const template = await db.query.waiverTemplate.findFirst({
        where: and(eq(waiverTemplate.id, input.templateId), eq(waiverTemplate.isActive, true)),
      });

      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Waiver not found" });

      const existing = await db.query.waiverSignature.findFirst({
        where: and(eq(waiverSignature.templateId, input.templateId), eq(waiverSignature.clientId, input.clientId)),
        orderBy: desc(waiverSignature.signedAt),
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Waiver already signed" });
      }

      return db.transaction(async (tx) => {
        const [signature] = await tx
          .insert(waiverSignature)
          .values({
            id: createId(),
          templateId: input.templateId,
          clientId: input.clientId,
          signatureData: input.signatureData,
          ipAddress: input.ipAddress,
          emergencyName: input.emergencyName,
          emergencyPhone: input.emergencyPhone,
          healthConditions: input.healthConditions,
          minorName: input.minorName,
          guardianName: input.guardianName,
        })
          .returning();

        await tx
          .update(client)
          .set({
            waiverSignedAt: new Date(),
            ...(input.emergencyName && { emergencyContactName: input.emergencyName }),
            ...(input.emergencyPhone && { emergencyContactPhone: input.emergencyPhone }),
            ...(input.healthConditions && { healthNotes: input.healthConditions }),
            updatedAt: new Date(),
          })
          .where(eq(client.id, input.clientId));

        return signature;
      });
    }),

  getSignaturesForClient: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ input }) => {
      const signatures = await db.query.waiverSignature.findMany({
        where: eq(waiverSignature.clientId, input.clientId),
        with: { waiverTemplate: { columns: { name: true, version: true } } },
        orderBy: desc(waiverSignature.signedAt),
      });

      return signatures.map(({ waiverTemplate, ...signature }) => ({
        ...signature,
        template: waiverTemplate,
      }));
    }),

  checkRequired: baseProcedure
    .input(z.object({ clientId: z.string(), organizationId: z.string() }))
    .query(async ({ input }) => {
      const templates = await db.query.waiverTemplate.findMany({
        where: and(
          eq(waiverTemplate.organizationId, input.organizationId),
          eq(waiverTemplate.isRequired, true),
          eq(waiverTemplate.isActive, true)
        ),
        columns: { id: true, name: true },
      });

      const templateIds = templates.map((template) => template.id);
      const signed = templateIds.length > 0
        ? await db.query.waiverSignature.findMany({
            where: and(
              eq(waiverSignature.clientId, input.clientId),
              inArray(waiverSignature.templateId, templateIds)
            ),
            columns: { templateId: true },
          })
        : [];

      const signedIds = new Set(signed.map((s) => s.templateId));
      const unsigned = templates.filter((t) => !signedIds.has(t.id));

      return {
        allSigned: unsigned.length === 0,
        unsigned,
        signedCount: signed.length,
        totalRequired: templates.length,
      };
    }),
});
