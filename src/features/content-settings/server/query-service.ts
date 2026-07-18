import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  contentLibraryItem,
  contentLibraryItemVersion,
} from "@/db/schema";
import type { ContentLibraryKind } from "@/features/content-settings/contracts";

import type { ContentSettingsScope } from "./access";
import {
  contentItemScopeWhere,
  contentItemView,
  contentVersionView,
  exactContentLocation,
  type ContentLibraryItemView,
  type ContentLibraryVersionView,
} from "./model";

export async function listContentLibraryItems(input: {
  scope: ContentSettingsScope;
  kind?: ContentLibraryKind;
  search: string;
  includeArchived: boolean;
}): Promise<ContentLibraryItemView[]> {
  const filters = [
    eq(contentLibraryItem.organizationId, input.scope.organizationId),
    contentItemScopeWhere(input.scope),
  ];
  if (input.kind) filters.push(eq(contentLibraryItem.kind, input.kind));
  if (!input.includeArchived) filters.push(isNull(contentLibraryItem.archivedAt));
  if (input.search) {
    const match = `%${input.search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const searchFilter = or(
      ilike(contentLibraryItem.name, match),
      ilike(contentLibraryItem.key, match),
    );
    if (searchFilter) filters.push(searchFilter);
  }
  const items = await db
    .select()
    .from(contentLibraryItem)
    .where(and(...filters))
    .orderBy(asc(contentLibraryItem.kind), asc(contentLibraryItem.name))
    .limit(250);
  if (items.length === 0) return [];
  const versions = await db
    .select()
    .from(contentLibraryItemVersion)
    .where(
      and(
        eq(contentLibraryItemVersion.organizationId, input.scope.organizationId),
        exactContentLocation(input.scope.locationId, contentLibraryItemVersion.locationId),
        inArray(contentLibraryItemVersion.itemId, items.map((item) => item.id)),
      ),
    );
  const byItemVersion = new Map(
    versions.map((version) => [`${version.itemId}:${version.version}`, version]),
  );
  return items.map((item) => {
    const current = byItemVersion.get(`${item.id}:${item.currentVersion}`);
    if (!current) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Reusable content ${item.name} has no current version.`,
      });
    }
    return contentItemView({ item, current });
  });
}

export async function getContentLibraryItem(input: {
  scope: ContentSettingsScope;
  itemId: string;
}): Promise<{ item: ContentLibraryItemView; history: ContentLibraryVersionView[] }> {
  const [item] = await db
    .select()
    .from(contentLibraryItem)
    .where(and(eq(contentLibraryItem.id, input.itemId), eq(contentLibraryItem.organizationId, input.scope.organizationId), contentItemScopeWhere(input.scope)))
    .limit(1);
  if (!item) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Reusable content was not found." });
  }
  const versions = await db
    .select()
    .from(contentLibraryItemVersion)
    .where(and(eq(contentLibraryItemVersion.itemId, item.id), eq(contentLibraryItemVersion.organizationId, input.scope.organizationId), exactContentLocation(input.scope.locationId, contentLibraryItemVersion.locationId)))
    .orderBy(desc(contentLibraryItemVersion.version));
  const current = versions.find((version) => version.version === item.currentVersion);
  if (!current) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Reusable content has no current version." });
  }
  return { item: contentItemView({ item, current }), history: versions.map(contentVersionView) };
}
