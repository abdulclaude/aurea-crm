import "server-only";

import { and, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  organization,
  publicationTarget,
  publicationVersion,
} from "@/db/schema";
import type { PublicationKind } from "@/features/publications/contracts";
import { normalizePublicationDomain } from "@/features/publications/lib/domain-verification";

const publicSelection = {
  id: publicationTarget.id,
  organizationId: publicationTarget.organizationId,
  organizationSlug: organization.slug,
  locationId: publicationTarget.locationId,
  kind: publicationTarget.kind,
  sourceKey: publicationTarget.sourceKey,
  sourceId: publicationTarget.sourceId,
  name: publicationTarget.name,
  slug: publicationTarget.slug,
  status: publicationTarget.status,
  domainHost: publicationTarget.domainHost,
  domainStatus: publicationTarget.domainStatus,
  sslStatus: publicationTarget.sslStatus,
  versionId: publicationVersion.id,
  version: publicationVersion.version,
  snapshot: publicationVersion.snapshot,
  themeSnapshot: publicationVersion.themeSnapshot,
  seoSnapshot: publicationVersion.seoSnapshot,
  consentSnapshot: publicationVersion.consentSnapshot,
  contentHash: publicationVersion.contentHash,
} as const;

const locationScope = (locationId: string | null) =>
  locationId
    ? eq(publicationTarget.locationId, locationId)
    : isNull(publicationTarget.locationId);

export async function getPublishedPublicationByPath(input: {
  organizationSlug: string;
  slug: string;
}) {
  const [row] = await db
    .select(publicSelection)
    .from(publicationTarget)
    .innerJoin(
      publicationVersion,
      and(
        eq(publicationVersion.id, publicationTarget.publishedVersionId),
        eq(publicationVersion.targetId, publicationTarget.id),
      ),
    )
    .innerJoin(
      organization,
      eq(organization.id, publicationTarget.organizationId),
    )
    .where(
      and(
        eq(organization.slug, input.organizationSlug),
        eq(publicationTarget.slug, input.slug),
        eq(publicationTarget.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublishedPublicationByPathVersion(input: {
  organizationSlug: string;
  slug: string;
  targetId: string;
  versionId: string;
}) {
  const [row] = await db
    .select(publicSelection)
    .from(publicationTarget)
    .innerJoin(
      publicationVersion,
      and(
        eq(publicationVersion.id, input.versionId),
        eq(publicationVersion.id, publicationTarget.publishedVersionId),
        eq(publicationVersion.targetId, publicationTarget.id),
      ),
    )
    .innerJoin(
      organization,
      eq(organization.id, publicationTarget.organizationId),
    )
    .where(
      and(
        eq(publicationTarget.id, input.targetId),
        eq(organization.slug, input.organizationSlug),
        eq(publicationTarget.slug, input.slug),
        eq(publicationTarget.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublishedPublicationChannel(input: {
  organizationSlug: string;
  targetSlug: string;
  kind: PublicationKind;
  sourceId: string;
}) {
  const target = await getPublishedPublicationByPath({
    organizationSlug: input.organizationSlug,
    slug: input.targetSlug,
  });
  if (
    !target ||
    target.kind !== input.kind ||
    target.sourceId !== input.sourceId
  ) {
    return null;
  }
  return target;
}

export async function getPublishedPublicationByDomain(host: string) {
  let normalizedHost: string;
  try {
    normalizedHost = normalizePublicationDomain(host);
  } catch {
    return null;
  }
  const [row] = await db
    .select(publicSelection)
    .from(publicationTarget)
    .innerJoin(
      publicationVersion,
      and(
        eq(publicationVersion.id, publicationTarget.publishedVersionId),
        eq(publicationVersion.targetId, publicationTarget.id),
      ),
    )
    .innerJoin(
      organization,
      eq(organization.id, publicationTarget.organizationId),
    )
    .where(
      and(
        eq(publicationTarget.domainHost, normalizedHost),
        eq(publicationTarget.status, "PUBLISHED"),
        eq(publicationTarget.domainStatus, "VERIFIED"),
        eq(publicationTarget.sslStatus, "ACTIVE"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublicationControlByDomain(host: string) {
  let normalizedHost: string;
  try {
    normalizedHost = normalizePublicationDomain(host);
  } catch {
    return null;
  }
  const [row] = await db
    .select({ id: publicationTarget.id, status: publicationTarget.status })
    .from(publicationTarget)
    .where(
      and(
        eq(publicationTarget.domainHost, normalizedHost),
        ne(publicationTarget.status, "ARCHIVED"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublicationControlBySource(input: {
  organizationId: string;
  locationId: string | null;
  kind: PublicationKind;
  sourceKey: string;
}) {
  const [row] = await db
    .select({
      id: publicationTarget.id,
      status: publicationTarget.status,
      publishedVersionId: publicationTarget.publishedVersionId,
    })
    .from(publicationTarget)
    .where(
      and(
        eq(publicationTarget.kind, input.kind),
        eq(publicationTarget.sourceKey, input.sourceKey),
        eq(publicationTarget.organizationId, input.organizationId),
        locationScope(input.locationId),
        ne(publicationTarget.status, "ARCHIVED"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function hasManagedPublicationForSourceId(input: {
  organizationId: string;
  kind: PublicationKind;
  sourceId: string;
}) {
  const [row] = await db
    .select({ id: publicationTarget.id })
    .from(publicationTarget)
    .where(
      and(
        eq(publicationTarget.organizationId, input.organizationId),
        eq(publicationTarget.kind, input.kind),
        eq(publicationTarget.sourceId, input.sourceId),
        ne(publicationTarget.status, "ARCHIVED"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function getPublishedPublicationBySource(input: {
  organizationId: string;
  locationId: string | null;
  kind: PublicationKind;
  sourceKey: string;
}) {
  const [row] = await db
    .select(publicSelection)
    .from(publicationTarget)
    .innerJoin(
      publicationVersion,
      and(
        eq(publicationVersion.id, publicationTarget.publishedVersionId),
        eq(publicationVersion.targetId, publicationTarget.id),
      ),
    )
    .innerJoin(
      organization,
      eq(organization.id, publicationTarget.organizationId),
    )
    .where(
      and(
        eq(publicationTarget.kind, input.kind),
        eq(publicationTarget.sourceKey, input.sourceKey),
        eq(publicationTarget.organizationId, input.organizationId),
        locationScope(input.locationId),
        eq(publicationTarget.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  return row ?? null;
}
