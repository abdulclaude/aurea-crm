import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { savedAudience, user } from "@/db/schema";
import {
  savedAudienceDefinitionSchema,
  type SavedAudienceDefinition,
} from "@/features/audiences/lib/audience-definition";
import {
  findAudienceReferenceWarnings,
  getAudiencePreview,
} from "@/features/audiences/server/audience-query";
import {
  assertAudienceReferences,
  authorizeAudienceScope,
  getScopedAudience,
  requireActiveAudienceScope,
} from "@/features/audiences/server/audience-access";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const audienceIdSchema = z.object({ id: z.string().min(1).max(128) }).strict();
const audienceNameSchema = z.string().trim().min(1).max(100);
const audienceDescriptionSchema = z.string().trim().max(500).nullable().optional();

const audienceOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  definition: savedAudienceDefinitionSchema,
  schemaVersion: z.number().int(),
  createdByName: z.string().nullable(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const savedAudiencesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(100).default(""),
          includeArchived: z.boolean().default(false),
        })
        .strict(),
    )
    .output(z.array(audienceOutputSchema))
    .query(async ({ ctx, input }) => {
      const scope = requireActiveAudienceScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      await authorizeAudienceScope({
        userId: ctx.auth.user.id,
        scope,
        capability: "audience.view",
      });

      const rows = await db
        .select({
          id: savedAudience.id,
          name: savedAudience.name,
          description: savedAudience.description,
          definition: savedAudience.definition,
          schemaVersion: savedAudience.schemaVersion,
          createdByName: user.name,
          archivedAt: savedAudience.archivedAt,
          createdAt: savedAudience.createdAt,
          updatedAt: savedAudience.updatedAt,
        })
        .from(savedAudience)
        .leftJoin(user, eq(savedAudience.createdById, user.id))
        .where(
          and(
            eq(savedAudience.organizationId, scope.organizationId),
            scope.locationId
              ? eq(savedAudience.locationId, scope.locationId)
              : isNull(savedAudience.locationId),
            input.includeArchived ? undefined : isNull(savedAudience.archivedAt),
            input.search
              ? ilike(savedAudience.name, `%${input.search.replace(/[\\%_]/g, "\\$&")}%`)
              : undefined,
          ),
        )
        .orderBy(desc(savedAudience.updatedAt));

      return rows.map((row) => ({
        ...row,
        definition: savedAudienceDefinitionSchema.parse(row.definition),
      }));
    }),

  create: protectedProcedure
    .input(
      z
        .object({
          name: audienceNameSchema,
          description: audienceDescriptionSchema,
          definition: savedAudienceDefinitionSchema,
        })
        .strict(),
    )
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = requireActiveAudienceScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      await authorizeAudienceScope({
        userId: ctx.auth.user.id,
        scope,
        capability: "audience.manage",
      });
      const warnings = await findAudienceReferenceWarnings({
        scope,
        definition: input.definition,
      });
      assertAudienceReferences(warnings);

      const id = createId();
      const now = new Date();
      await db.insert(savedAudience).values({
        id,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        name: input.name,
        description: input.description ?? null,
        definition: input.definition,
        schemaVersion: input.definition.version,
        createdById: ctx.auth.user.id,
        updatedById: ctx.auth.user.id,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z
        .object({
          id: z.string().min(1).max(128),
          name: audienceNameSchema,
          description: audienceDescriptionSchema,
          definition: savedAudienceDefinitionSchema,
        })
        .strict(),
    )
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = requireActiveAudienceScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      await authorizeAudienceScope({
        userId: ctx.auth.user.id,
        scope,
        capability: "audience.manage",
      });
      const existing = await getScopedAudience({ id: input.id, scope });
      if (existing.archivedAt) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Restore this audience before editing it.",
        });
      }
      const warnings = await findAudienceReferenceWarnings({
        scope,
        definition: input.definition,
      });
      assertAudienceReferences(warnings);

      await db
        .update(savedAudience)
        .set({
          name: input.name,
          description: input.description ?? null,
          definition: input.definition,
          schemaVersion: input.definition.version,
          updatedById: ctx.auth.user.id,
          updatedAt: new Date(),
        })
        .where(eq(savedAudience.id, existing.id));
      return { id: existing.id };
    }),

  archive: protectedProcedure
    .input(audienceIdSchema)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = requireActiveAudienceScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      await authorizeAudienceScope({
        userId: ctx.auth.user.id,
        scope,
        capability: "audience.manage",
      });
      const existing = await getScopedAudience({ id: input.id, scope });
      const now = new Date();
      await db
        .update(savedAudience)
        .set({
          archivedAt: now,
          archivedById: ctx.auth.user.id,
          updatedById: ctx.auth.user.id,
          updatedAt: now,
        })
        .where(eq(savedAudience.id, existing.id));
      return { id: existing.id };
    }),

  restore: protectedProcedure
    .input(audienceIdSchema)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = requireActiveAudienceScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      await authorizeAudienceScope({
        userId: ctx.auth.user.id,
        scope,
        capability: "audience.manage",
      });
      const existing = await getScopedAudience({ id: input.id, scope });
      await db
        .update(savedAudience)
        .set({
          archivedAt: null,
          archivedById: null,
          updatedById: ctx.auth.user.id,
          updatedAt: new Date(),
        })
        .where(eq(savedAudience.id, existing.id));
      return { id: existing.id };
    }),

  preview: protectedProcedure
    .input(
      z.discriminatedUnion("mode", [
        z.object({ mode: z.literal("saved"), id: z.string().min(1).max(128) }).strict(),
        z
          .object({
            mode: z.literal("definition"),
            definition: savedAudienceDefinitionSchema,
          })
          .strict(),
      ]),
    )
    .output(
      z.object({
        count: z.number().int().nonnegative(),
        email: z.object({
          eligible: z.number().int().nonnegative(),
          suppressed: z.number().int().nonnegative(),
          invalid: z.number().int().nonnegative(),
        }),
        warnings: z.array(z.string()),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = requireActiveAudienceScope({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      await authorizeAudienceScope({
        userId: ctx.auth.user.id,
        scope,
        capability: "audience.view",
      });

      let definition: SavedAudienceDefinition;
      if (input.mode === "saved") {
        const audience = await getScopedAudience({ id: input.id, scope });
        definition = savedAudienceDefinitionSchema.parse(audience.definition);
      } else {
        definition = input.definition;
      }

      const [audiencePreview, warnings] = await Promise.all([
        getAudiencePreview({ scope, definition }),
        findAudienceReferenceWarnings({ scope, definition }),
      ]);
      return { ...audiencePreview, warnings };
    }),
});
