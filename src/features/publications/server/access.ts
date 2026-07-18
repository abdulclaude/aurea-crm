import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { publicationTarget } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";

export type PublicationActor = {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
};

export const PUBLICATION_TARGET_FIELDS = {
  id: publicationTarget.id,
  organizationId: publicationTarget.organizationId,
  locationId: publicationTarget.locationId,
  kind: publicationTarget.kind,
  sourceKey: publicationTarget.sourceKey,
  sourceId: publicationTarget.sourceId,
  name: publicationTarget.name,
  slug: publicationTarget.slug,
  status: publicationTarget.status,
  themePresetId: publicationTarget.themePresetId,
  publishedVersionId: publicationTarget.publishedVersionId,
  domainHost: publicationTarget.domainHost,
  domainVerificationToken: publicationTarget.domainVerificationToken,
  domainStatus: publicationTarget.domainStatus,
  sslStatus: publicationTarget.sslStatus,
  domainCheckedAt: publicationTarget.domainCheckedAt,
  domainError: publicationTarget.domainError,
  seoConfig: publicationTarget.seoConfig,
  consentConfig: publicationTarget.consentConfig,
  channelConfig: publicationTarget.channelConfig,
  publishedAt: publicationTarget.publishedAt,
  createdById: publicationTarget.createdById,
  updatedById: publicationTarget.updatedById,
  createdAt: publicationTarget.createdAt,
  updatedAt: publicationTarget.updatedAt,
};

export async function requirePublicationAccess(input: {
  actor: PublicationActor;
  capability: "publication.view" | "publication.manage";
}): Promise<string> {
  if (!input.actor.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing publication targets.",
    });
  }
  await requireCapability({
    actor: input.actor,
    capability: input.capability,
    resource: {
      organizationId: input.actor.organizationId,
      locationId: input.actor.locationId,
    },
  });
  return input.actor.organizationId;
}

export async function getScopedPublicationTarget(input: {
  id: string;
  organizationId: string;
  locationId: string | null;
}): Promise<typeof publicationTarget.$inferSelect> {
  const [target] = await db
    .select(PUBLICATION_TARGET_FIELDS)
    .from(publicationTarget)
    .where(
      and(
        eq(publicationTarget.id, input.id),
        eq(publicationTarget.organizationId, input.organizationId),
        input.locationId
          ? eq(publicationTarget.locationId, input.locationId)
          : isNull(publicationTarget.locationId),
      ),
    )
    .limit(1);
  if (!target || target.status === "ARCHIVED") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Publication target not found.",
    });
  }
  return target;
}
