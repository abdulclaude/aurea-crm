import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { client, waiverSignature, waiverTemplate } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";
import { verifyUploadReceipt } from "@/features/uploads/upload-receipt";

const withSignatureCount = (row: {
  id: string;
  name: string;
  content: string;
  documentUrl: string | null;
  documentName: string | null;
  documentSize: number | null;
  documentMimeType: string | null;
  isRequired: boolean;
  requiresMinor: boolean;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  signatureCount: number;
}) => {
  const { signatureCount, ...template } = row;
  return {
    ...template,
    _count: { signatures: signatureCount },
  };
};

export const waiversRouter = createTRPCRouter({
  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
    await requireCapability({
      actor: {
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      },
      capability: "customer.view",
      resource: { organizationId: ctx.orgId, locationId: ctx.locationId },
    });

    const templates = await db
      .select({
        id: waiverTemplate.id,
        name: waiverTemplate.name,
        content: waiverTemplate.content,
        documentUrl: waiverTemplate.documentUrl,
        documentName: waiverTemplate.documentName,
        documentSize: waiverTemplate.documentSize,
        documentMimeType: waiverTemplate.documentMimeType,
        isRequired: waiverTemplate.isRequired,
        requiresMinor: waiverTemplate.requiresMinor,
        isActive: waiverTemplate.isActive,
        version: waiverTemplate.version,
        createdAt: waiverTemplate.createdAt,
        updatedAt: waiverTemplate.updatedAt,
        signatureCount: count(waiverSignature.id),
      })
      .from(waiverTemplate)
      .leftJoin(waiverSignature, eq(waiverSignature.templateId, waiverTemplate.id))
      .where(
        and(
          eq(waiverTemplate.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(waiverTemplate.locationId, ctx.locationId)
            : isNull(waiverTemplate.locationId),
        )
      )
      .groupBy(waiverTemplate.id)
      .orderBy(desc(waiverTemplate.createdAt));

    return templates.map(withSignatureCount);
  }),

  listSignatures: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }
    await requireCapability({
      actor: {
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      },
      capability: "customer.view",
      resource: { organizationId: ctx.orgId, locationId: ctx.locationId },
    });

    return db
      .select({
        id: waiverSignature.id,
        clientId: waiverSignature.clientId,
        clientName: client.name,
        clientEmail: client.email,
        templateId: waiverSignature.templateId,
        templateName: sql<string>`coalesce(${waiverSignature.templateName}, ${waiverTemplate.name})`,
        templateVersion: waiverSignature.templateVersion,
        signedAt: waiverSignature.signedAt,
        expiresAt: waiverSignature.expiresAt,
        guardianName: waiverSignature.guardianName,
      })
      .from(waiverSignature)
      .innerJoin(
        waiverTemplate,
        eq(waiverTemplate.id, waiverSignature.templateId),
      )
      .innerJoin(client, eq(client.id, waiverSignature.clientId))
      .where(
        and(
          eq(waiverTemplate.organizationId, ctx.orgId),
          eq(client.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(waiverTemplate.locationId, ctx.locationId)
            : isNull(waiverTemplate.locationId),
          ctx.locationId
            ? eq(client.locationId, ctx.locationId)
            : isNull(client.locationId),
        ),
      )
      .orderBy(desc(waiverSignature.signedAt))
      .limit(500);
  }),

  createTemplate: protectedProcedure
    .input(
      z
        .object({
          name: z.string().min(1).max(200),
          content: z.string().min(1),
          documentUrl: z.url(),
          documentName: z.string().min(1).max(255),
          documentKey: z.string().min(1).max(500),
          documentSize: z.number().int().positive().max(16 * 1024 * 1024),
          documentMimeType: z.literal("application/pdf"),
          uploadReceipt: z.string().min(1).max(4_096),
          isRequired: z.boolean().default(true),
          requiresMinor: z.boolean().default(false),
        })
        .superRefine((input, validation) => {
          const url = new URL(input.documentUrl);
          const uploadThingHost =
            url.hostname === "utfs.io" || url.hostname.endsWith(".ufs.sh");
          if (!uploadThingHost || !url.pathname.includes(input.documentKey)) {
            validation.addIssue({
              code: "custom",
              path: ["documentUrl"],
              message: "Waiver document must reference the completed upload.",
            });
          }
        })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "customer.manage",
        resource: { organizationId: ctx.orgId, locationId: ctx.locationId },
      });
      const uploadIsValid = verifyUploadReceipt(input.uploadReceipt, {
        key: input.documentKey,
        locationId: ctx.locationId ?? null,
        organizationId: ctx.orgId,
        route: "waiverDocument",
        url: input.documentUrl,
        userId: ctx.auth.user.id,
      });
      if (!uploadIsValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Waiver PDF upload could not be verified.",
        });
      }

      const now = new Date();
      const { uploadReceipt: _uploadReceipt, ...templateInput } = input;
      const [createdTemplate] = await db
        .insert(waiverTemplate)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          ...templateInput,
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
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "customer.manage",
        resource: { organizationId: ctx.orgId, locationId: ctx.locationId },
      });
      const { id, ...data } = input;

      const template = await db.query.waiverTemplate.findFirst({
        where: and(
          eq(waiverTemplate.id, id),
          eq(waiverTemplate.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(waiverTemplate.locationId, ctx.locationId)
            : isNull(waiverTemplate.locationId),
        ),
      });

      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Waiver template not found" });
      const createsNewVersion =
        data.name !== undefined ||
        data.content !== undefined ||
        data.isRequired !== undefined ||
        data.requiresMinor !== undefined;

      const [updatedTemplate] = await db
        .update(waiverTemplate)
        .set({
          ...data,
          version: createsNewVersion
            ? sql`${waiverTemplate.version} + 1`
            : waiverTemplate.version,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(waiverTemplate.id, id),
            eq(waiverTemplate.organizationId, ctx.orgId),
            ctx.locationId
              ? eq(waiverTemplate.locationId, ctx.locationId)
              : isNull(waiverTemplate.locationId),
          ),
        )
        .returning();

      return updatedTemplate;
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "customer.manage",
        resource: { organizationId: ctx.orgId, locationId: ctx.locationId },
      });

      const template = await db.query.waiverTemplate.findFirst({
        where: and(
          eq(waiverTemplate.id, input.id),
          eq(waiverTemplate.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(waiverTemplate.locationId, ctx.locationId)
            : isNull(waiverTemplate.locationId),
        ),
      });

      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Waiver template not found" });

      const [signatureCount] = await db
        .select({ value: count() })
        .from(waiverSignature)
        .where(eq(waiverSignature.templateId, input.id));
      if ((signatureCount?.value ?? 0) > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Deactivate signed waiver templates instead of deleting them.",
        });
      }

      const [deletedTemplate] = await db
        .delete(waiverTemplate)
        .where(
          and(
            eq(waiverTemplate.id, input.id),
            eq(waiverTemplate.organizationId, ctx.orgId),
            ctx.locationId
              ? eq(waiverTemplate.locationId, ctx.locationId)
              : isNull(waiverTemplate.locationId),
          ),
        )
        .returning();

      return deletedTemplate;
    }),

  sign: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        clientId: z.string(),
        signatureData: z.string().min(1).max(100_000),
        emergencyName: z.string().max(200).optional(),
        emergencyPhone: z.string().max(100).optional(),
        healthConditions: z.string().max(5_000).optional(),
        minorName: z.string().max(200).optional(),
        guardianName: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.orgId;
      if (!organizationId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId: ctx.locationId,
        },
        capability: "customer.manage",
        resource: { organizationId, locationId: ctx.locationId },
      });
      const locationTemplateWhere = ctx.locationId
        ? eq(waiverTemplate.locationId, ctx.locationId)
        : isNull(waiverTemplate.locationId);
      const locationClientWhere = ctx.locationId
        ? eq(client.locationId, ctx.locationId)
        : isNull(client.locationId);
      const [template, scopedClient] = await Promise.all([
        db.query.waiverTemplate.findFirst({
          where: and(
            eq(waiverTemplate.id, input.templateId),
            eq(waiverTemplate.organizationId, organizationId),
            locationTemplateWhere,
            eq(waiverTemplate.isActive, true),
          ),
        }),
        db.query.client.findFirst({
          where: and(
            eq(client.id, input.clientId),
            eq(client.organizationId, organizationId),
            locationClientWhere,
          ),
          columns: { id: true },
        }),
      ]);

      if (!template || !scopedClient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Waiver or client not found" });
      }

      return db.transaction(async (tx) => {
        const existing = await tx.query.waiverSignature.findFirst({
          where: and(
            eq(waiverSignature.templateId, input.templateId),
            eq(waiverSignature.clientId, input.clientId),
            eq(waiverSignature.templateVersion, template.version),
          ),
          columns: { id: true },
        });
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Waiver already signed" });
        }

        const [signature] = await tx
          .insert(waiverSignature)
          .values({
            id: createId(),
            templateId: input.templateId,
            clientId: input.clientId,
            templateVersion: template.version,
            templateName: template.name,
            templateContent: template.content,
            documentUrl: template.documentUrl,
            documentName: template.documentName,
            documentKey: template.documentKey,
            signatureData: input.signatureData,
            emergencyName: input.emergencyName,
            emergencyPhone: input.emergencyPhone,
            healthConditions: input.healthConditions,
            minorName: input.minorName,
            guardianName: input.guardianName,
          })
          .onConflictDoNothing()
          .returning();
        if (!signature) {
          throw new TRPCError({ code: "CONFLICT", message: "Waiver already signed" });
        }

        await tx
          .update(client)
          .set({
            waiverSignedAt: new Date(),
            ...(input.emergencyName && { emergencyContactName: input.emergencyName }),
            ...(input.emergencyPhone && { emergencyContactPhone: input.emergencyPhone }),
            ...(input.healthConditions && { healthNotes: input.healthConditions }),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(client.id, input.clientId),
              eq(client.organizationId, organizationId),
              locationClientWhere,
            ),
          );

        return signature;
      });
    }),

  getSignaturesForClient: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "customer.view",
        resource: { organizationId: ctx.orgId, locationId: ctx.locationId },
      });
      const scopedClient = await db.query.client.findFirst({
        where: and(
          eq(client.id, input.clientId),
          eq(client.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(client.locationId, ctx.locationId)
            : isNull(client.locationId),
        ),
        columns: { id: true },
      });
      if (!scopedClient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return db
        .select({
          id: waiverSignature.id,
          templateId: waiverSignature.templateId,
          templateName: sql<string>`coalesce(${waiverSignature.templateName}, ${waiverTemplate.name})`,
          templateVersion: waiverSignature.templateVersion,
          documentUrl: waiverSignature.documentUrl,
          documentName: waiverSignature.documentName,
          signedAt: waiverSignature.signedAt,
          expiresAt: waiverSignature.expiresAt,
          guardianName: waiverSignature.guardianName,
          agreedToTerms: waiverSignature.agreedToTerms,
        })
        .from(waiverSignature)
        .innerJoin(
          waiverTemplate,
          eq(waiverTemplate.id, waiverSignature.templateId),
        )
        .where(
          and(
            eq(waiverSignature.clientId, input.clientId),
            eq(waiverTemplate.organizationId, ctx.orgId),
            ctx.locationId
              ? eq(waiverTemplate.locationId, ctx.locationId)
              : isNull(waiverTemplate.locationId),
          ),
        )
        .orderBy(desc(waiverSignature.signedAt));
    }),

  checkRequired: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "customer.view",
        resource: { organizationId: ctx.orgId, locationId: ctx.locationId },
      });
      const scopedClient = await db.query.client.findFirst({
        where: and(
          eq(client.id, input.clientId),
          eq(client.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(client.locationId, ctx.locationId)
            : isNull(client.locationId),
        ),
        columns: { id: true },
      });
      if (!scopedClient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }
      const templates = await db.query.waiverTemplate.findMany({
        where: and(
          eq(waiverTemplate.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(waiverTemplate.locationId, ctx.locationId)
            : isNull(waiverTemplate.locationId),
          eq(waiverTemplate.isRequired, true),
          eq(waiverTemplate.isActive, true)
        ),
        columns: {
          id: true,
          name: true,
          content: true,
          version: true,
          documentUrl: true,
          documentName: true,
        },
      });

      const templateIds = templates.map((template) => template.id);
      const signed = templateIds.length > 0
        ? await db.query.waiverSignature.findMany({
            where: and(
              eq(waiverSignature.clientId, input.clientId),
              inArray(waiverSignature.templateId, templateIds),
            ),
            columns: { templateId: true, templateVersion: true },
          })
        : [];

      const signedVersions = new Set(
        signed.map((signature) =>
          `${signature.templateId}:${signature.templateVersion}`,
        ),
      );
      const unsigned = templates.filter(
        (template) =>
          !signedVersions.has(`${template.id}:${template.version}`),
      );

      return {
        allSigned: unsigned.length === 0,
        unsigned,
        signedCount: templates.length - unsigned.length,
        totalRequired: templates.length,
      };
    }),
});
