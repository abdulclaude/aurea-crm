import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  funnel,
  publicationTarget,
  publicationVersion,
} from "@/db/schema";
import { publicationConsentConfigSchema } from "@/features/publications/contracts";
import {
  publishedFunnelSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";

export async function getPublishedTrackingSource(input: {
  funnelId: string;
  targetId: string;
  versionId: string;
}) {
  const [row] = await db
    .select({
      consentSnapshot: publicationVersion.consentSnapshot,
      locationId: publicationTarget.locationId,
      organizationId: publicationTarget.organizationId,
      snapshot: publicationVersion.snapshot,
      targetId: publicationTarget.id,
      versionId: publicationVersion.id,
    })
    .from(publicationTarget)
    .innerJoin(
      publicationVersion,
      and(
        eq(publicationVersion.id, publicationTarget.publishedVersionId),
        eq(publicationVersion.targetId, publicationTarget.id),
      ),
    )
    .innerJoin(
      funnel,
      and(
        eq(funnel.id, publicationTarget.sourceId),
        eq(funnel.organizationId, publicationTarget.organizationId),
        or(
          eq(funnel.locationId, publicationTarget.locationId),
          and(
            isNull(funnel.locationId),
            isNull(publicationTarget.locationId),
          ),
        ),
      ),
    )
    .where(
      and(
        eq(publicationTarget.id, input.targetId),
        eq(publicationTarget.kind, "FUNNEL"),
        eq(publicationTarget.status, "PUBLISHED"),
        eq(publicationVersion.id, input.versionId),
        eq(funnel.id, input.funnelId),
        eq(funnel.funnelType, "INTERNAL"),
      ),
    )
    .limit(1);
  if (!row) return null;

  const envelope = storedPublicationSnapshotSchema.safeParse(row.snapshot);
  const consent = publicationConsentConfigSchema.safeParse(row.consentSnapshot);
  if (
    !envelope.success ||
    envelope.data.channelConfig.kind !== "FUNNEL" ||
    !consent.success
  ) {
    return null;
  }
  const source = publishedFunnelSourceSchema.safeParse(envelope.data.source);
  if (!source.success || source.data.funnel?.id !== input.funnelId) return null;

  return {
    analytics: envelope.data.channelConfig.analytics,
    consent: consent.data,
    locationId: row.locationId,
    organizationId: row.organizationId,
    targetId: row.targetId,
    versionId: row.versionId,
  };
}
