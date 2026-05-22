import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { and, desc, eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { importJob } from "@/db/schema";
import { ImportSource } from "@/db/enums";
import { inngest } from "@/inngest/client";
import { classifyMindbodyFileName } from "@/features/studio/import/lib/mindbody-csv";
import {
  deleteUploadThingFiles,
  uploadedFilesFromImportConfig,
} from "@/features/studio/import/server/uploadthing-files";

const ColumnMappingSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  memberSince: z.string().optional(),
  membershipStatus: z.string().optional(),
  membershipType: z.string().optional(),
  notes: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

const UploadedImportFileSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  uploadKey: z.string().optional(),
  size: z.number().optional(),
  type: z.string().optional(),
  relativePath: z.string().optional(),
  zipSourceName: z.string().optional(),
  zipSourceUrl: z.string().url().optional(),
  zipEntryPath: z.string().optional(),
});

const ImportJobIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid import job ID");

export const importRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organisation",
      });

    const jobs = await db.query.importJob.findMany({
      where: eq(importJob.organizationId, ctx.orgId),
      orderBy: desc(importJob.createdAt),
      limit: 20,
    });

    return { jobs };
  }),

  getJob: protectedProcedure
    .input(z.object({ id: ImportJobIdSchema }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organisation",
        });

      const job = await db.query.importJob.findFirst({
        where: and(
          eq(importJob.id, input.id),
          eq(importJob.organizationId, ctx.orgId),
        ),
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      return { job };
    }),

  createCsvImport: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string().url(),
        columnMapping: ColumnMappingSchema,
        source: z.nativeEnum(ImportSource).default(ImportSource.CSV),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organisation",
        });

      const now = new Date();
      const [job] = await db
        .insert(importJob)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          source: input.source,
          status: "PENDING",
          columnMapping: input.columnMapping,
          rawFileUrl: input.fileUrl,
          importedBy: ctx.auth.user.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await inngest.send({
        name: "studio/import.process",
        data: { importJobId: job.id, organizationId: ctx.orgId },
      });

      return { job };
    }),

  deleteUploadedMindbodyFile: protectedProcedure
    .input(
      z.object({
        file: UploadedImportFileSchema.pick({
          url: true,
          uploadKey: true,
          zipSourceUrl: true,
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const deleted = await deleteUploadThingFiles([
        {
          url: input.file.url,
          uploadKey: input.file.uploadKey,
          zipSourceUrl: input.file.zipSourceUrl,
        },
      ]);

      return { deleted };
    }),

  deleteMindbodyImportUpload: protectedProcedure
    .input(z.object({ id: ImportJobIdSchema }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organisation",
        });

      const job = await db.query.importJob.findFirst({
        where: and(
          eq(importJob.id, input.id),
          eq(importJob.organizationId, ctx.orgId),
        ),
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status === "PROCESSING") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete an upload for an import that is processing.",
        });
      }

      const deleted = await deleteUploadThingFiles(
        uploadedFilesFromImportConfig(job.importConfig),
      );

      await db
        .update(importJob)
        .set({
          status: "ROLLED_BACK",
          importConfig: {
            deletedUploadAt: new Date().toISOString(),
            deletedUploadKeys: deleted.keys,
            previousSourceFilenames: job.sourceFilenames ?? [],
            source:
              job.importConfig &&
              typeof job.importConfig === "object" &&
              !Array.isArray(job.importConfig) &&
              "source" in job.importConfig
                ? job.importConfig.source
                : undefined,
          },
          rawFileUrl: null,
          sourceFilenames: [],
          updatedAt: new Date(),
        })
        .where(eq(importJob.id, input.id));

      return { deleted };
    }),

  createMindbodyImport: protectedProcedure
    .input(
      z.object({
        files: z.array(UploadedImportFileSchema).min(1),
        dryRun: z.boolean().default(false),
        source: z.enum(["dashboard", "onboarding"]).default("dashboard"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organisation",
        });

      const now = new Date();
      const activeJob = await db.query.importJob.findFirst({
        where: and(
          eq(importJob.organizationId, ctx.orgId),
          eq(importJob.source, "MINDBODY"),
          inArray(importJob.status, ["PENDING", "PROCESSING"]),
        ),
        columns: { id: true, status: true },
        orderBy: desc(importJob.createdAt),
      });
      if (activeJob) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            activeJob.status === "PROCESSING"
              ? "A Mindbody import is already processing. Wait for it to finish before starting another import."
              : "A Mindbody upload is already queued. Delete or replace it before starting another import.",
        });
      }

      const [job] = await db
        .insert(importJob)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          source: "MINDBODY",
          status: "PENDING",
          columnMapping: {},
          importConfig: {
            files: input.files,
            dryRun: input.dryRun,
            source: input.source,
            unmappedFieldsStrategy: "preserve_in_metadata_and_notify",
          },
          rawFileUrl: input.files[0]?.url ?? null,
          sourceFilenames: input.files.map(
            (file) => file.relativePath || file.name,
          ),
          importedBy: ctx.auth.user.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await inngest.send({
        name: "studio/import.process",
        data: {
          importJobId: job.id,
          organizationId: ctx.orgId,
          provider: "mindbody",
        },
      });

      return { job };
    }),

  previewMindbodyFiles: protectedProcedure
    .input(z.object({ files: z.array(UploadedImportFileSchema).min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organisation",
        });

      const files = input.files.map((file) => ({
        ...file,
        kind: classifyMindbodyFileName(file.relativePath || file.name),
      }));

      const counts = files.reduce<Record<string, number>>((acc, file) => {
        acc[file.kind] = (acc[file.kind] ?? 0) + 1;
        return acc;
      }, {});

      return { files, counts };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: ImportJobIdSchema }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organisation",
        });

      const job = await db.query.importJob.findFirst({
        where: and(
          eq(importJob.id, input.id),
          eq(importJob.organizationId, ctx.orgId),
        ),
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status === "PROCESSING") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot cancel a job that is already processing",
        });
      }

      await db
        .update(importJob)
        .set({ status: "ROLLED_BACK", updatedAt: new Date() })
        .where(eq(importJob.id, input.id));

      return { success: true };
    }),

  previewCsv: protectedProcedure
    .input(
      z.object({
        rows: z.array(z.record(z.string(), z.string())).max(5),
        columnMapping: ColumnMappingSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organisation",
        });

      const preview = input.rows.map((row) => {
        const mapped: Record<string, string> = {};
        for (const [field, csvCol] of Object.entries(input.columnMapping)) {
          if (csvCol && row[csvCol] !== undefined) {
            mapped[field] = String(row[csvCol]);
          }
        }
        return mapped;
      });

      return { preview };
    }),
});
