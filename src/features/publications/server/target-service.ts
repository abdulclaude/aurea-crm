import "server-only";

import { randomBytes } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, ne, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { publicationTarget } from "@/db/schema";
import {
  createPublicationTargetSchema,
  updatePublicationTargetSchema,
} from "@/features/publications/contracts";
import { normalizePublicationDomain } from "@/features/publications/lib/domain-verification";
import { parseChannelConfigForKind } from "@/features/publications/lib/publication-policy";
import {
  getScopedPublicationTarget,
  PUBLICATION_TARGET_FIELDS,
} from "@/features/publications/server/access";
import { resolvePublicationSource } from "@/features/publications/server/source-resolver";
import { buildThemeSnapshot } from "@/features/publications/server/theme-snapshot";

type CreateTargetInput = z.infer<typeof createPublicationTargetSchema>;
type UpdateTargetInput = z.infer<typeof updatePublicationTargetSchema>;

function newDomainToken(): string {
  return randomBytes(24).toString("base64url");
}

function normalizeDomainInput(host: string | null): string | null {
  if (host === null || host.trim() === "") return null;
  try {
    return normalizePublicationDomain(host);
  } catch (error: unknown) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        error instanceof Error
          ? error.message
          : "The custom domain is invalid.",
      cause: error,
    });
  }
}

async function requireAvailableIdentity(input: {
  organizationId: string;
  id?: string;
  kind?: CreateTargetInput["kind"];
  sourceKey?: string;
  slug?: string;
  domainHost?: string | null;
}): Promise<void> {
  const conflicts = await db
    .select({ id: publicationTarget.id })
    .from(publicationTarget)
    .where(
      and(
        input.id ? ne(publicationTarget.id, input.id) : undefined,
        or(
          input.kind && input.sourceKey
            ? and(
                eq(publicationTarget.organizationId, input.organizationId),
                eq(publicationTarget.kind, input.kind),
                eq(publicationTarget.sourceKey, input.sourceKey),
              )
            : undefined,
          input.slug
            ? and(
                eq(publicationTarget.organizationId, input.organizationId),
                eq(publicationTarget.slug, input.slug),
              )
            : undefined,
          input.domainHost
            ? eq(publicationTarget.domainHost, input.domainHost)
            : undefined,
        ),
      ),
    )
    .limit(1);
  if (conflicts[0]) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That source, slug, or custom domain is already in use.",
    });
  }
}

export async function createPublicationTarget(input: {
  actorId: string;
  organizationId: string;
  locationId: string | null;
  data: CreateTargetInput;
}): Promise<typeof publicationTarget.$inferSelect> {
  const source = await resolvePublicationSource({
    scope: {
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
    kind: input.data.kind,
    sourceKey: input.data.sourceKey,
  });
  const domainHost = normalizeDomainInput(input.data.domainHost);
  await buildThemeSnapshot({
    themePresetId: input.data.themePresetId,
    scope: {
      organizationId: input.organizationId,
      locationId: source.locationId,
    },
  });
  await requireAvailableIdentity({
    organizationId: input.organizationId,
    kind: input.data.kind,
    sourceKey: input.data.sourceKey,
    slug: input.data.slug,
    domainHost,
  });

  const now = new Date();
  const [created] = await db
    .insert(publicationTarget)
    .values({
      id: createId(),
      organizationId: input.organizationId,
      locationId: source.locationId,
      kind: input.data.kind,
      sourceKey: source.sourceKey,
      sourceId: source.sourceId,
      name: input.data.name,
      slug: input.data.slug,
      themePresetId: input.data.themePresetId,
      domainHost,
      domainVerificationToken: newDomainToken(),
      domainStatus: domainHost ? "PENDING" : "NOT_CONFIGURED",
      sslStatus: domainHost ? "PENDING" : "NOT_CONFIGURED",
      seoConfig: input.data.seoConfig,
      consentConfig: input.data.consentConfig,
      channelConfig: input.data.channelConfig,
      createdById: input.actorId,
      updatedById: input.actorId,
      createdAt: now,
      updatedAt: now,
    })
    .returning(PUBLICATION_TARGET_FIELDS);
  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create the publication target.",
    });
  }
  return created;
}

export async function updatePublicationTarget(input: {
  actorId: string;
  organizationId: string;
  locationId: string | null;
  data: UpdateTargetInput;
}): Promise<typeof publicationTarget.$inferSelect> {
  const target = await getScopedPublicationTarget({
    id: input.data.id,
    organizationId: input.organizationId,
    locationId: input.locationId,
  });
  if (input.data.channelConfig) {
    parseChannelConfigForKind(target.kind, input.data.channelConfig);
  }
  const nextTheme =
    input.data.themePresetId === undefined
      ? target.themePresetId
      : input.data.themePresetId;
  await buildThemeSnapshot({
    themePresetId: nextTheme,
    scope: {
      organizationId: target.organizationId,
      locationId: target.locationId,
    },
  });

  const hasDomainChange = input.data.domainHost !== undefined;
  const slugChanged =
    input.data.slug !== undefined && input.data.slug !== target.slug;
  const domainHost = hasDomainChange
    ? normalizeDomainInput(input.data.domainHost ?? null)
    : target.domainHost;
  if (input.data.slug !== undefined || (hasDomainChange && domainHost)) {
    await requireAvailableIdentity({
      id: target.id,
      organizationId: target.organizationId,
      slug: input.data.slug,
      domainHost: hasDomainChange ? domainHost : undefined,
    });
  }
  const [updated] = await db
    .update(publicationTarget)
    .set({
      name: input.data.name,
      slug: input.data.slug,
      themePresetId: input.data.themePresetId,
      seoConfig: input.data.seoConfig,
      consentConfig: input.data.consentConfig,
      channelConfig: input.data.channelConfig,
      status:
        slugChanged && target.status === "PUBLISHED" ? "PAUSED" : undefined,
      domainHost: hasDomainChange ? domainHost : undefined,
      domainVerificationToken: hasDomainChange ? newDomainToken() : undefined,
      domainStatus: hasDomainChange
        ? domainHost
          ? "PENDING"
          : "NOT_CONFIGURED"
        : undefined,
      sslStatus: hasDomainChange
        ? domainHost
          ? "PENDING"
          : "NOT_CONFIGURED"
        : undefined,
      domainCheckedAt: hasDomainChange ? null : undefined,
      domainError: hasDomainChange ? null : undefined,
      updatedById: input.actorId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publicationTarget.id, target.id),
        eq(publicationTarget.organizationId, target.organizationId),
        eq(publicationTarget.updatedAt, target.updatedAt),
      ),
    )
    .returning(PUBLICATION_TARGET_FIELDS);
  if (!updated) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This publication target changed. Refresh and try again.",
    });
  }
  return updated;
}

export async function pausePublicationTarget(input: {
  actorId: string;
  organizationId: string;
  locationId: string | null;
  id: string;
}): Promise<typeof publicationTarget.$inferSelect> {
  const target = await getScopedPublicationTarget(input);
  if (!target.publishedVersionId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This target has not been published yet.",
    });
  }
  const [paused] = await db
    .update(publicationTarget)
    .set({
      status: "PAUSED",
      updatedById: input.actorId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publicationTarget.id, target.id),
        eq(publicationTarget.organizationId, input.organizationId),
      ),
    )
    .returning(PUBLICATION_TARGET_FIELDS);
  if (!paused) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to pause the publication target.",
    });
  }
  return paused;
}
