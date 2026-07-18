import "server-only";

import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  contentLibraryItem,
  contentLibraryItemVersion,
} from "@/db/schema";
import {
  contentLibraryPayloadSchema,
  type ContentLibraryKind,
  type ContentLibraryPayload,
} from "@/features/content-settings/contracts";
import {
  buildTerminologyDictionary,
  mergeScopedOverrides,
  macroIsAvailable,
  selectScopedOverride,
  visibleFaqEntries,
} from "@/features/content-settings/lib/runtime-content";

import type { ContentSettingsScope } from "./access";

export type ResolvedPublishedContent = {
  itemId: string;
  key: string;
  name: string;
  version: number;
  locationId: string | null;
  payload: ContentLibraryPayload;
};

async function resolvePublishedByKey(input: {
  scope: ContentSettingsScope;
  kind: ContentLibraryKind;
  key: string;
}): Promise<ResolvedPublishedContent | null> {
  const rows = await db
    .select({ item: contentLibraryItem, version: contentLibraryItemVersion })
    .from(contentLibraryItem)
    .innerJoin(
      contentLibraryItemVersion,
      and(
        eq(contentLibraryItemVersion.itemId, contentLibraryItem.id),
        eq(
          contentLibraryItemVersion.organizationId,
          contentLibraryItem.organizationId,
        ),
        sql`${contentLibraryItemVersion.locationId} IS NOT DISTINCT FROM ${contentLibraryItem.locationId}`,
        eq(contentLibraryItemVersion.version, contentLibraryItem.publishedVersion),
      ),
    )
    .where(
      and(
        eq(contentLibraryItem.organizationId, input.scope.organizationId),
        input.scope.locationId
          ? or(
              isNull(contentLibraryItem.locationId),
              eq(contentLibraryItem.locationId, input.scope.locationId),
            )
          : isNull(contentLibraryItem.locationId),
        eq(contentLibraryItem.kind, input.kind),
        eq(contentLibraryItem.key, input.key),
        isNull(contentLibraryItem.archivedAt),
      ),
    )
    .orderBy(desc(contentLibraryItem.locationId))
    .limit(2);
  const selected = selectScopedOverride(
    rows.map((row) => ({ ...row, locationId: row.item.locationId })),
    input.scope.locationId,
  );
  if (!selected) return null;
  const payload = contentLibraryPayloadSchema.parse(selected.version.payload);
  if (payload.kind !== selected.item.kind) return null;
  return {
    itemId: selected.item.id,
    key: selected.item.key,
    name: selected.item.name,
    version: selected.version.version,
    locationId: selected.item.locationId,
    payload,
  };
}

export async function resolvePublishedFaqCollection(input: {
  scope: ContentSettingsScope;
  key: string;
}) {
  const content = await resolvePublishedByKey({
    ...input,
    kind: "FAQ_COLLECTION",
  });
  if (!content || content.payload.kind !== "FAQ_COLLECTION") return null;
  return { ...content, entries: visibleFaqEntries(content.payload) };
}

export async function resolvePublishedPublicProfile(input: {
  scope: ContentSettingsScope;
  slug: string;
}) {
  const content = await resolvePublishedByKey({
    scope: input.scope,
    key: input.slug,
    kind: "PUBLIC_PROFILE",
  });
  if (!content || content.payload.kind !== "PUBLIC_PROFILE") return null;
  return { ...content, profile: content.payload };
}

export async function resolveInternalTerminology(input: {
  scope: ContentSettingsScope;
  key: string;
}) {
  const content = await resolvePublishedByKey({
    ...input,
    kind: "TERMINOLOGY_PACK",
  });
  if (!content || content.payload.kind !== "TERMINOLOGY_PACK") return null;
  return { ...content, terms: buildTerminologyDictionary(content.payload) };
}

export async function listInternalMessageMacros(input: {
  scope: ContentSettingsScope;
  channel: "EMAIL" | "SMS" | "INBOX";
}) {
  const rows = await db
    .select({ item: contentLibraryItem, version: contentLibraryItemVersion })
    .from(contentLibraryItem)
    .innerJoin(
      contentLibraryItemVersion,
      and(
        eq(contentLibraryItemVersion.itemId, contentLibraryItem.id),
        eq(
          contentLibraryItemVersion.organizationId,
          contentLibraryItem.organizationId,
        ),
        sql`${contentLibraryItemVersion.locationId} IS NOT DISTINCT FROM ${contentLibraryItem.locationId}`,
        eq(contentLibraryItemVersion.version, contentLibraryItem.publishedVersion),
      ),
    )
    .where(
      and(
        eq(contentLibraryItem.organizationId, input.scope.organizationId),
        input.scope.locationId
          ? or(
              isNull(contentLibraryItem.locationId),
              eq(contentLibraryItem.locationId, input.scope.locationId),
            )
          : isNull(contentLibraryItem.locationId),
        eq(contentLibraryItem.kind, "MESSAGE_MACRO"),
        isNull(contentLibraryItem.archivedAt),
      ),
    )
    .orderBy(desc(contentLibraryItem.locationId), contentLibraryItem.name);

  const selected = mergeScopedOverrides(
    rows.map((row) => ({
      ...row,
      key: row.item.key,
      locationId: row.item.locationId,
    })),
    input.scope.locationId,
  );
  return selected.flatMap((row) => {
    const payload = contentLibraryPayloadSchema.safeParse(row.version.payload);
    if (
      !payload.success ||
      payload.data.kind !== "MESSAGE_MACRO" ||
      !macroIsAvailable({ payload: payload.data, channel: input.channel })
    ) {
      return [];
    }
    return [{
      itemId: row.item.id,
      key: row.item.key,
      name: row.item.name,
      version: row.version.version,
      locationId: row.item.locationId,
      macro: payload.data,
    }];
  });
}
