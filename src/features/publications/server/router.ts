import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  organization,
  publicationTarget,
  publicationVersion,
} from "@/db/schema";
import {
  createPublicationTargetSchema,
  publicationKindSchema,
  publicationTargetIdSchema,
  publicationTargetStatusSchema,
  publishPublicationTargetSchema,
  rollbackPublicationTargetSchema,
  updatePublicationTargetSchema,
} from "@/features/publications/contracts";
import {
  getScopedPublicationTarget,
  requirePublicationAccess,
  type PublicationActor,
} from "@/features/publications/server/access";
import {
  checkPublicationDomain,
  getPublicationDomainInstructions,
} from "@/features/publications/server/domain-service";
import { getPublicationSourceInventory } from "@/features/publications/server/source-inventory";
import { buildPublishedFormEmbed } from "@/features/publications/lib/form-embed-code";
import {
  createPublicationTarget,
  pausePublicationTarget,
  updatePublicationTarget,
} from "@/features/publications/server/target-service";
import {
  getPublicationParity,
  listPublicationVersions,
  publishPublicationTarget,
  rollbackPublicationTarget,
} from "@/features/publications/server/version-service";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

type ProcedureContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

function actor(ctx: ProcedureContext): PublicationActor {
  return {
    userId: ctx.auth.user.id,
    organizationId: ctx.orgId,
    locationId: ctx.locationId,
  };
}

async function authorize(
  ctx: ProcedureContext,
  capability: "publication.view" | "publication.manage",
): Promise<string> {
  return requirePublicationAccess({ actor: actor(ctx), capability });
}

function scope(ctx: ProcedureContext, organizationId: string) {
  return { organizationId, locationId: ctx.locationId };
}

export const publicationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          kind: publicationKindSchema.optional(),
          status: publicationTargetStatusSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.view");
      return db
        .select({
          id: publicationTarget.id,
          kind: publicationTarget.kind,
          sourceKey: publicationTarget.sourceKey,
          sourceId: publicationTarget.sourceId,
          name: publicationTarget.name,
          slug: publicationTarget.slug,
          status: publicationTarget.status,
          locationId: publicationTarget.locationId,
          publishedVersionId: publicationTarget.publishedVersionId,
          domainHost: publicationTarget.domainHost,
          domainStatus: publicationTarget.domainStatus,
          sslStatus: publicationTarget.sslStatus,
          domainError: publicationTarget.domainError,
          domainCheckedAt: publicationTarget.domainCheckedAt,
          publishedAt: publicationTarget.publishedAt,
          updatedAt: publicationTarget.updatedAt,
        })
        .from(publicationTarget)
        .where(
          and(
            eq(publicationTarget.organizationId, organizationId),
            ctx.locationId
              ? eq(publicationTarget.locationId, ctx.locationId)
              : isNull(publicationTarget.locationId),
            ne(publicationTarget.status, "ARCHIVED"),
            input?.kind ? eq(publicationTarget.kind, input.kind) : undefined,
            input?.status
              ? eq(publicationTarget.status, input.status)
              : undefined,
          ),
        )
        .orderBy(desc(publicationTarget.updatedAt), desc(publicationTarget.id));
    }),

  get: protectedProcedure
    .input(publicationTargetIdSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.view");
      return getScopedPublicationTarget({
        ...scope(ctx, organizationId),
        id: input.id,
      });
    }),

  getFormEmbedCode: protectedProcedure
    .input(publicationTargetIdSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.view");
      const target = await getScopedPublicationTarget({
        ...scope(ctx, organizationId),
        id: input.id,
      });
      if (
        target.kind !== "FORM" ||
        target.status !== "PUBLISHED" ||
        !target.publishedVersionId
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Publish this form before copying embed code.",
        });
      }
      const [versionRows, organizationRows] = await Promise.all([
        db
          .select({ snapshot: publicationVersion.snapshot })
          .from(publicationVersion)
          .where(
            and(
              eq(publicationVersion.id, target.publishedVersionId),
              eq(publicationVersion.targetId, target.id),
            ),
          )
          .limit(1),
        db
          .select({ slug: organization.slug })
          .from(organization)
          .where(eq(organization.id, organizationId))
          .limit(1),
      ]);
      const version = versionRows[0];
      const organizationRow = organizationRows[0];
      const embed =
        version && organizationRow
          ? buildPublishedFormEmbed({
              name: target.name,
              slug: target.slug,
              organizationSlug: organizationRow.slug,
              snapshot: version.snapshot,
            })
          : null;
      if (!embed) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The published form could not be prepared for sharing.",
        });
      }
      return embed;
    }),

  sourceInventory: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await authorize(ctx, "publication.view");
    return getPublicationSourceInventory(scope(ctx, organizationId));
  }),

  create: protectedProcedure
    .input(createPublicationTargetSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.manage");
      return createPublicationTarget({
        actorId: ctx.auth.user.id,
        ...scope(ctx, organizationId),
        data: input,
      });
    }),

  update: protectedProcedure
    .input(updatePublicationTargetSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.manage");
      return updatePublicationTarget({
        actorId: ctx.auth.user.id,
        ...scope(ctx, organizationId),
        data: input,
      });
    }),

  publish: protectedProcedure
    .input(publishPublicationTargetSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.manage");
      return publishPublicationTarget({
        actorId: ctx.auth.user.id,
        ...scope(ctx, organizationId),
        ...input,
      });
    }),

  pause: protectedProcedure
    .input(publicationTargetIdSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.manage");
      return pausePublicationTarget({
        actorId: ctx.auth.user.id,
        ...scope(ctx, organizationId),
        id: input.id,
      });
    }),

  versions: protectedProcedure
    .input(publicationTargetIdSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.view");
      return listPublicationVersions({
        ...scope(ctx, organizationId),
        id: input.id,
      });
    }),

  rollback: protectedProcedure
    .input(rollbackPublicationTargetSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.manage");
      return rollbackPublicationTarget({
        actorId: ctx.auth.user.id,
        ...scope(ctx, organizationId),
        ...input,
      });
    }),

  parity: protectedProcedure
    .input(publicationTargetIdSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.view");
      return getPublicationParity({
        ...scope(ctx, organizationId),
        id: input.id,
      });
    }),

  domainInstructions: protectedProcedure
    .input(publicationTargetIdSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.manage");
      const target = await getScopedPublicationTarget({
        ...scope(ctx, organizationId),
        id: input.id,
      });
      return getPublicationDomainInstructions(target);
    }),

  verifyDomain: protectedProcedure
    .input(publicationTargetIdSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "publication.manage");
      try {
        return await checkPublicationDomain({
          actorId: ctx.auth.user.id,
          ...scope(ctx, organizationId),
          id: input.id,
        });
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify the custom domain.",
          cause: error,
        });
      }
    }),
});
