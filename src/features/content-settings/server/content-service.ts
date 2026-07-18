import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import {
  and,
  eq,
  isNull,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  contentLibraryItem,
  contentLibraryItemVersion,
} from "@/db/schema";
import {
  contentLibraryPayloadSchema,
  type ContentLibraryPayload,
} from "@/features/content-settings/contracts";

import type { ContentSettingsScope } from "./access";
import {
  contentItemScopeWhere,
  contentItemView,
  contentVersionView,
  exactContentLocation,
  type ContentLibraryItemView,
} from "./model";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function payloadRecord(payload: ContentLibraryPayload): Record<string, unknown> {
  return { ...payload };
}

function validateIdentity(input: {
  key: string;
  payload: ContentLibraryPayload;
}): void {
  if (input.payload.kind === "PUBLIC_PROFILE" && input.payload.slug !== input.key) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A public profile slug must match its reusable content key.",
    });
  }
}

async function lockItem(tx: Transaction, itemId: string): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`content-library:${itemId}`}, 0))`,
  );
}

async function scopedItem(
  tx: Transaction,
  scope: ContentSettingsScope,
  itemId: string,
) {
  const [item] = await tx
    .select()
    .from(contentLibraryItem)
    .where(
      and(
        eq(contentLibraryItem.id, itemId),
        eq(contentLibraryItem.organizationId, scope.organizationId),
        contentItemScopeWhere(scope),
      ),
    )
    .limit(1);
  if (!item) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Reusable content was not found in the active workspace.",
    });
  }
  return item;
}

export async function createContentLibraryItem(input: {
  scope: ContentSettingsScope;
  actorUserId: string;
  name: string;
  key: string;
  description: string | null;
  payload: ContentLibraryPayload;
  changeNote: string | null;
}): Promise<ContentLibraryItemView> {
  const payload = contentLibraryPayloadSchema.parse(input.payload);
  validateIdentity({ key: input.key, payload });
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.scope.organizationId}:${input.scope.locationId ?? "organization"}:${payload.kind}:${input.key}`}, 0))`,
    );
    const [duplicate] = await tx
      .select({ id: contentLibraryItem.id })
      .from(contentLibraryItem)
      .where(
        and(
          eq(contentLibraryItem.organizationId, input.scope.organizationId),
          contentItemScopeWhere(input.scope),
          eq(contentLibraryItem.kind, payload.kind),
          eq(contentLibraryItem.key, input.key),
          isNull(contentLibraryItem.archivedAt),
        ),
      )
      .limit(1);
    if (duplicate) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An active item of this type already uses that key.",
      });
    }
    const now = new Date();
    const itemId = createId();
    const versionId = createId();
    const [item] = await tx
      .insert(contentLibraryItem)
      .values({
        id: itemId,
        ...input.scope,
        kind: payload.kind,
        key: input.key,
        name: input.name,
        description: input.description,
        currentVersion: 1,
        createdById: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const [version] = await tx
      .insert(contentLibraryItemVersion)
      .values({
        id: versionId,
        itemId,
        ...input.scope,
        kind: payload.kind,
        version: 1,
        payload: payloadRecord(payload),
        changeNote: input.changeNote,
        createdById: input.actorUserId,
        createdAt: now,
      })
      .returning();
    if (!item || !version) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Reusable content could not be created." });
    }
    return contentItemView({ item, current: version });
  });
}

export async function versionContentLibraryItem(input: {
  scope: ContentSettingsScope;
  actorUserId: string;
  itemId: string;
  expectedVersion: number;
  name: string;
  description: string | null;
  payload: ContentLibraryPayload;
  changeNote: string | null;
}): Promise<ContentLibraryItemView> {
  const payload = contentLibraryPayloadSchema.parse(input.payload);
  return db.transaction(async (tx) => {
    await lockItem(tx, input.itemId);
    const item = await scopedItem(tx, input.scope, input.itemId);
    if (item.archivedAt) {
      throw new TRPCError({ code: "CONFLICT", message: "Archived content cannot be edited." });
    }
    if (item.currentVersion !== input.expectedVersion) {
      throw new TRPCError({ code: "CONFLICT", message: "This content changed after you opened it. Reload and review the latest version." });
    }
    if (item.kind !== payload.kind) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Content payload type does not match the library item.",
      });
    }
    validateIdentity({ key: item.key, payload });
    const nextVersion = item.currentVersion + 1;
    const now = new Date();
    const [version] = await tx
      .insert(contentLibraryItemVersion)
      .values({
        id: createId(),
        itemId: item.id,
        ...input.scope,
        kind: item.kind,
        version: nextVersion,
        payload: payloadRecord(payload),
        changeNote: input.changeNote,
        createdById: input.actorUserId,
        createdAt: now,
      })
      .returning();
    const [updated] = await tx
      .update(contentLibraryItem)
      .set({
        name: input.name,
        description: input.description,
        currentVersion: nextVersion,
        updatedAt: now,
      })
      .where(and(eq(contentLibraryItem.id, item.id), eq(contentLibraryItem.currentVersion, input.expectedVersion)))
      .returning();
    if (!version || !updated) {
      throw new TRPCError({ code: "CONFLICT", message: "Reusable content could not be versioned because it changed." });
    }
    return contentItemView({ item: updated, current: version });
  });
}

export async function publishContentLibraryItem(input: {
  scope: ContentSettingsScope;
  actorUserId: string;
  itemId: string;
  version: number;
}): Promise<ContentLibraryItemView> {
  return db.transaction(async (tx) => {
    await lockItem(tx, input.itemId);
    const item = await scopedItem(tx, input.scope, input.itemId);
    if (item.archivedAt) throw new TRPCError({ code: "CONFLICT", message: "Archived content cannot be published." });
    const [version] = await tx
      .select()
      .from(contentLibraryItemVersion)
      .where(and(eq(contentLibraryItemVersion.itemId, item.id), eq(contentLibraryItemVersion.organizationId, input.scope.organizationId), exactContentLocation(input.scope.locationId, contentLibraryItemVersion.locationId), eq(contentLibraryItemVersion.version, input.version)))
      .limit(1);
    if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "The selected content version was not found." });
    if (version.kind !== item.kind) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The selected content version has an invalid type." });
    contentVersionView(version);
    const now = new Date();
    const [updated] = await tx
      .update(contentLibraryItem)
      .set({ publishedVersion: version.version, publishedAt: now, publishedById: input.actorUserId, updatedAt: now })
      .where(eq(contentLibraryItem.id, item.id))
      .returning();
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Reusable content could not be published." });
    const [current] = item.currentVersion === version.version
      ? [version]
      : await tx.select().from(contentLibraryItemVersion).where(and(eq(contentLibraryItemVersion.itemId, item.id), eq(contentLibraryItemVersion.organizationId, input.scope.organizationId), exactContentLocation(input.scope.locationId, contentLibraryItemVersion.locationId), eq(contentLibraryItemVersion.version, item.currentVersion))).limit(1);
    if (!current) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Reusable content has no current version." });
    return contentItemView({ item: updated, current });
  });
}

export async function rollbackContentLibraryItem(input: {
  scope: ContentSettingsScope;
  actorUserId: string;
  itemId: string;
  targetVersion: number;
  expectedVersion: number;
  changeNote: string | null;
}): Promise<ContentLibraryItemView> {
  return db.transaction(async (tx) => {
    await lockItem(tx, input.itemId);
    const item = await scopedItem(tx, input.scope, input.itemId);
    if (item.archivedAt) throw new TRPCError({ code: "CONFLICT", message: "Archived content cannot be restored." });
    if (item.currentVersion !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "This content changed after you opened it. Reload and try again." });
    const [target] = await tx.select().from(contentLibraryItemVersion).where(and(eq(contentLibraryItemVersion.itemId, item.id), eq(contentLibraryItemVersion.organizationId, input.scope.organizationId), exactContentLocation(input.scope.locationId, contentLibraryItemVersion.locationId), eq(contentLibraryItemVersion.version, input.targetVersion))).limit(1);
    if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "The selected content version was not found." });
    if (target.kind !== item.kind) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The selected content version has an invalid type." });
    const payload = contentVersionView(target).payload;
    const nextVersion = item.currentVersion + 1;
    const now = new Date();
    const [version] = await tx.insert(contentLibraryItemVersion).values({ id: createId(), itemId: item.id, ...input.scope, kind: item.kind, version: nextVersion, payload: payloadRecord(payload), changeNote: input.changeNote ?? `Restored version ${input.targetVersion}`, sourceVersion: input.targetVersion, createdById: input.actorUserId, createdAt: now }).returning();
    const [updated] = await tx.update(contentLibraryItem).set({ currentVersion: nextVersion, updatedAt: now }).where(and(eq(contentLibraryItem.id, item.id), eq(contentLibraryItem.currentVersion, input.expectedVersion))).returning();
    if (!version || !updated) throw new TRPCError({ code: "CONFLICT", message: "Reusable content could not be restored because it changed." });
    return contentItemView({ item: updated, current: version });
  });
}

export async function archiveContentLibraryItem(input: {
  scope: ContentSettingsScope;
  actorUserId: string;
  itemId: string;
}): Promise<{ id: string; archivedAt: Date }> {
  return db.transaction(async (tx) => {
    await lockItem(tx, input.itemId);
    const item = await scopedItem(tx, input.scope, input.itemId);
    if (item.archivedAt) return { id: item.id, archivedAt: item.archivedAt };
    const archivedAt = new Date();
    const [updated] = await tx.update(contentLibraryItem).set({ archivedAt, archivedById: input.actorUserId, updatedAt: archivedAt }).where(and(eq(contentLibraryItem.id, item.id), isNull(contentLibraryItem.archivedAt))).returning({ id: contentLibraryItem.id });
    if (!updated) throw new TRPCError({ code: "CONFLICT", message: "Reusable content could not be archived because it changed." });
    return { id: updated.id, archivedAt };
  });
}
