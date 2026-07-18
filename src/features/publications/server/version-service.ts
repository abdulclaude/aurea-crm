import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, max } from "drizzle-orm";

import { db } from "@/db";
import { publicationTarget, publicationVersion } from "@/db/schema";
import { requirePublishableKind } from "@/features/publications/lib/publication-policy";
import {
  getScopedPublicationTarget,
  PUBLICATION_TARGET_FIELDS,
} from "@/features/publications/server/access";
import { buildPublicationSnapshot } from "@/features/publications/server/snapshot-service";

type VersionActorInput = {
  actorId: string;
  organizationId: string;
  locationId: string | null;
  id: string;
};

async function nextVersionNumber(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  targetId: string,
): Promise<number> {
  const [row] = await transaction
    .select({ value: max(publicationVersion.version) })
    .from(publicationVersion)
    .where(eq(publicationVersion.targetId, targetId));
  return (row?.value ?? 0) + 1;
}

export async function publishPublicationTarget(
  input: VersionActorInput & { changeNote: string | null },
): Promise<{ target: typeof publicationTarget.$inferSelect; version: number }> {
  const target = await getScopedPublicationTarget(input);
  requirePublishableKind(target.kind);
  const bundle = await buildPublicationSnapshot(target);
  if (bundle.errors.length > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: bundle.errors.join(" "),
    });
  }

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({
        id: publicationTarget.id,
        updatedAt: publicationTarget.updatedAt,
      })
      .from(publicationTarget)
      .where(
        and(
          eq(publicationTarget.id, target.id),
          eq(publicationTarget.organizationId, input.organizationId),
          input.locationId
            ? eq(publicationTarget.locationId, input.locationId)
            : isNull(publicationTarget.locationId),
        ),
      )
      .limit(1)
      .for("update");
    if (!locked || locked.updatedAt.getTime() !== target.updatedAt.getTime()) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This target changed while it was being published. Try again.",
      });
    }

    const version = await nextVersionNumber(tx, target.id);
    const versionId = createId();
    const now = new Date();
    await tx.insert(publicationVersion).values({
      id: versionId,
      targetId: target.id,
      version,
      snapshotSchemaVersion: 1,
      contentHash: bundle.contentHash,
      snapshot: bundle.snapshot,
      themeSnapshot: bundle.themeSnapshot,
      seoSnapshot: bundle.seoSnapshot,
      consentSnapshot: bundle.consentSnapshot,
      validation: bundle.validation,
      changeNote: input.changeNote,
      createdById: input.actorId,
      createdAt: now,
    });
    const [updated] = await tx
      .update(publicationTarget)
      .set({
        status: "PUBLISHED",
        publishedVersionId: versionId,
        publishedAt: now,
        updatedById: input.actorId,
        updatedAt: now,
      })
      .where(eq(publicationTarget.id, target.id))
      .returning(PUBLICATION_TARGET_FIELDS);
    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to promote the publication version.",
      });
    }
    return { target: updated, version };
  });
}

export async function listPublicationVersions(input: {
  organizationId: string;
  locationId: string | null;
  id: string;
}): Promise<
  Array<{
    id: string;
    version: number;
    contentHash: string;
    changeNote: string | null;
    isRollback: boolean;
    createdById: string | null;
    createdAt: Date;
  }>
> {
  const target = await getScopedPublicationTarget(input);
  return db
    .select({
      id: publicationVersion.id,
      version: publicationVersion.version,
      contentHash: publicationVersion.contentHash,
      changeNote: publicationVersion.changeNote,
      isRollback: publicationVersion.isRollback,
      createdById: publicationVersion.createdById,
      createdAt: publicationVersion.createdAt,
    })
    .from(publicationVersion)
    .where(eq(publicationVersion.targetId, target.id))
    .orderBy(desc(publicationVersion.version))
    .limit(100);
}

export async function rollbackPublicationTarget(
  input: VersionActorInput & {
    versionId: string;
    changeNote: string | null;
  },
): Promise<{ target: typeof publicationTarget.$inferSelect; version: number }> {
  const target = await getScopedPublicationTarget(input);
  const [previous] = await db
    .select({
      version: publicationVersion.version,
      snapshotSchemaVersion: publicationVersion.snapshotSchemaVersion,
      contentHash: publicationVersion.contentHash,
      snapshot: publicationVersion.snapshot,
      themeSnapshot: publicationVersion.themeSnapshot,
      seoSnapshot: publicationVersion.seoSnapshot,
      consentSnapshot: publicationVersion.consentSnapshot,
      validation: publicationVersion.validation,
    })
    .from(publicationVersion)
    .where(
      and(
        eq(publicationVersion.id, input.versionId),
        eq(publicationVersion.targetId, target.id),
      ),
    )
    .limit(1);
  if (!previous) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Publication version not found.",
    });
  }

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: publicationTarget.id })
      .from(publicationTarget)
      .where(eq(publicationTarget.id, target.id))
      .limit(1)
      .for("update");
    if (!locked) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Target not found." });
    }
    const version = await nextVersionNumber(tx, target.id);
    const versionId = createId();
    const now = new Date();
    await tx.insert(publicationVersion).values({
      id: versionId,
      targetId: target.id,
      version,
      snapshotSchemaVersion: previous.snapshotSchemaVersion,
      contentHash: previous.contentHash,
      snapshot: previous.snapshot,
      themeSnapshot: previous.themeSnapshot,
      seoSnapshot: previous.seoSnapshot,
      consentSnapshot: previous.consentSnapshot,
      validation: previous.validation,
      changeNote:
        input.changeNote ?? `Rolled back to version ${previous.version}.`,
      isRollback: true,
      createdById: input.actorId,
      createdAt: now,
    });
    const [updated] = await tx
      .update(publicationTarget)
      .set({
        status: "PUBLISHED",
        publishedVersionId: versionId,
        publishedAt: now,
        updatedById: input.actorId,
        updatedAt: now,
      })
      .where(eq(publicationTarget.id, target.id))
      .returning(PUBLICATION_TARGET_FIELDS);
    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to promote the rollback version.",
      });
    }
    return { target: updated, version };
  });
}

export async function getPublicationParity(input: {
  organizationId: string;
  locationId: string | null;
  id: string;
}): Promise<{
  currentHash: string;
  publishedHash: string | null;
  matchesPublished: boolean;
  publishedVersionId: string | null;
  publishable: boolean;
  errors: string[];
  warnings: string[];
}> {
  const target = await getScopedPublicationTarget(input);
  const current = await buildPublicationSnapshot(target);
  const [published] = target.publishedVersionId
    ? await db
        .select({
          id: publicationVersion.id,
          contentHash: publicationVersion.contentHash,
        })
        .from(publicationVersion)
        .where(
          and(
            eq(publicationVersion.id, target.publishedVersionId),
            eq(publicationVersion.targetId, target.id),
          ),
        )
        .limit(1)
    : [];
  return {
    currentHash: current.contentHash,
    publishedHash: published?.contentHash ?? null,
    matchesPublished: published?.contentHash === current.contentHash,
    publishedVersionId: published?.id ?? null,
    publishable: current.errors.length === 0,
    errors: current.errors,
    warnings: current.warnings,
  };
}
