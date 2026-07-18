import "server-only";

import { TRPCError } from "@trpc/server";
import { eq, isNull, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import {
  contentLibraryItem,
  contentLibraryItemVersion,
} from "@/db/schema";
import {
  contentLibraryPayloadSchema,
  type ContentLibraryPayload,
} from "@/features/content-settings/contracts";

import type { ContentSettingsScope } from "./access";

type ItemRow = typeof contentLibraryItem.$inferSelect;
type VersionRow = typeof contentLibraryItemVersion.$inferSelect;

export type ContentLibraryVersionView = {
  id: string;
  version: number;
  payload: ContentLibraryPayload;
  changeNote: string | null;
  sourceVersion: number | null;
  createdById: string | null;
  createdAt: Date;
};

export type ContentLibraryItemView = {
  id: string;
  kind: ItemRow["kind"];
  key: string;
  name: string;
  description: string | null;
  currentVersion: number;
  publishedVersion: number | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  hasUnpublishedChanges: boolean;
  current: ContentLibraryVersionView;
};

export function exactContentLocation(
  locationId: string | null,
  column: AnyPgColumn = contentLibraryItem.locationId,
): SQL {
  return locationId === null ? isNull(column) : eq(column, locationId);
}

export function contentVersionView(
  row: VersionRow,
): ContentLibraryVersionView {
  const payload = contentLibraryPayloadSchema.safeParse(row.payload);
  if (!payload.success || payload.data.kind !== row.kind) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Reusable content version ${row.version} is invalid.`,
    });
  }
  return {
    id: row.id,
    version: row.version,
    payload: payload.data,
    changeNote: row.changeNote,
    sourceVersion: row.sourceVersion,
    createdById: row.createdById,
    createdAt: row.createdAt,
  };
}

export function contentItemView(input: {
  item: ItemRow;
  current: VersionRow;
}): ContentLibraryItemView {
  const current = contentVersionView(input.current);
  const status = input.item.archivedAt
    ? "ARCHIVED"
    : input.item.publishedVersion
      ? "PUBLISHED"
      : "DRAFT";
  return {
    id: input.item.id,
    kind: input.item.kind,
    key: input.item.key,
    name: input.item.name,
    description: input.item.description,
    currentVersion: input.item.currentVersion,
    publishedVersion: input.item.publishedVersion,
    publishedAt: input.item.publishedAt,
    archivedAt: input.item.archivedAt,
    createdAt: input.item.createdAt,
    updatedAt: input.item.updatedAt,
    status,
    hasUnpublishedChanges:
      input.item.publishedVersion !== input.item.currentVersion,
    current,
  };
}

export function contentItemScopeWhere(
  scope: ContentSettingsScope,
): SQL {
  return exactContentLocation(scope.locationId);
}
