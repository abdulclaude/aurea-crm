import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, max, sql } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db";
import {
  commerceDocumentDefaults,
  commerceGuestPassPolicyVersion,
  commerceRevenueCategory,
} from "@/db/schema";
import type {
  GuestPassPolicyValues,
  saveDocumentDefaultsSchema,
} from "@/features/commerce-settings/contracts";

import type { CommerceSettingsScope } from "./access";
import type { CommerceSettingsTransaction } from "./mutation-scope";
import { scoped } from "./mutation-scope";

type DocumentDefaultsValues = z.infer<typeof saveDocumentDefaultsSchema>;

async function requireActiveRevenueCategory(
  tx: CommerceSettingsTransaction,
  scope: CommerceSettingsScope,
  categoryId: string,
): Promise<void> {
  const [category] = await tx
    .select({ id: commerceRevenueCategory.id })
    .from(commerceRevenueCategory)
    .where(
      and(
        scoped(commerceRevenueCategory, scope),
        eq(commerceRevenueCategory.id, categoryId),
        isNull(commerceRevenueCategory.archivedAt),
      ),
    )
    .limit(1)
    .for("share");
  if (!category)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Revenue category was not found in this workspace.",
    });
}

export async function saveDocumentDefaults(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  values: DocumentDefaultsValues;
}): Promise<void> {
  await db.transaction(async (tx) => {
    if (input.values.defaultRevenueCategoryId)
      await requireActiveRevenueCategory(
        tx,
        input.scope,
        input.values.defaultRevenueCategoryId,
      );
    const [current] = await tx
      .select({ id: commerceDocumentDefaults.id })
      .from(commerceDocumentDefaults)
      .where(scoped(commerceDocumentDefaults, input.scope))
      .limit(1);
    if (current) {
      await tx
        .update(commerceDocumentDefaults)
        .set({
          ...input.values,
          updatedById: input.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(commerceDocumentDefaults.id, current.id));
    } else {
      await tx.insert(commerceDocumentDefaults).values({
        id: createId(),
        ...input.scope,
        ...input.values,
        createdById: input.actorUserId,
        updatedById: input.actorUserId,
      });
    }
  });
}

export async function versionGuestPassPolicy(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  values: GuestPassPolicyValues;
  expectedVersion: number | null;
  changeNote: string | null;
}): Promise<{ version: number }> {
  return db.transaction(async (tx) => {
    const lockKey = `${input.scope.organizationId}:${input.scope.locationId ?? "organization"}:guest-pass-policy`;
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    );
    const [active] = await tx
      .select({
        id: commerceGuestPassPolicyVersion.id,
        version: commerceGuestPassPolicyVersion.version,
      })
      .from(commerceGuestPassPolicyVersion)
      .where(
        and(
          scoped(commerceGuestPassPolicyVersion, input.scope),
          eq(commerceGuestPassPolicyVersion.isActive, true),
        ),
      )
      .limit(1);
    if ((active?.version ?? null) !== input.expectedVersion)
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Guest-pass policy changed. Refresh and review the latest version.",
      });
    const [latest] = await tx
      .select({ version: max(commerceGuestPassPolicyVersion.version) })
      .from(commerceGuestPassPolicyVersion)
      .where(scoped(commerceGuestPassPolicyVersion, input.scope));
    if (active)
      await tx
        .update(commerceGuestPassPolicyVersion)
        .set({ isActive: false })
        .where(eq(commerceGuestPassPolicyVersion.id, active.id));
    const version = (latest?.version ?? 0) + 1;
    await tx.insert(commerceGuestPassPolicyVersion).values({
      id: createId(),
      ...input.scope,
      version,
      values: input.values,
      isActive: true,
      changeNote: input.changeNote,
      createdById: input.actorUserId,
    });
    return { version };
  });
}
