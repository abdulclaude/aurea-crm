import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db";
import { commerceDocumentDefaults, commerceRevenueCategory } from "@/db/schema";
import type {
  createRevenueCategorySchema,
  updateRevenueCategorySchema,
} from "@/features/commerce-settings/contracts";

import type { CommerceSettingsScope } from "./access";
import { scoped } from "./mutation-scope";

type RevenueCategoryValues = z.infer<typeof createRevenueCategorySchema>;
type RevenueCategoryUpdate = z.infer<typeof updateRevenueCategorySchema>;

export async function createRevenueCategory(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  values: RevenueCategoryValues;
}): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const id = createId();
    await tx.insert(commerceRevenueCategory).values({
      id,
      ...input.scope,
      ...input.values,
      createdById: input.actorUserId,
      updatedById: input.actorUserId,
    });
    return { id };
  });
}

export async function updateRevenueCategory(
  input: {
    scope: CommerceSettingsScope;
    actorUserId: string;
    id: string;
  } & Omit<RevenueCategoryUpdate, "id">,
): Promise<void> {
  await db.transaction(async (tx) => {
    const { scope, actorUserId, id, ...values } = input;
    const updated = await tx
      .update(commerceRevenueCategory)
      .set({ ...values, updatedById: actorUserId, updatedAt: new Date() })
      .where(
        and(
          scoped(commerceRevenueCategory, scope),
          eq(commerceRevenueCategory.id, id),
          isNull(commerceRevenueCategory.archivedAt),
        ),
      )
      .returning({ id: commerceRevenueCategory.id });
    if (!updated[0])
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Revenue category was not found in this workspace.",
      });
  });
}

export async function archiveRevenueCategory(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  id: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [ownedCategory] = await tx
      .select({ id: commerceRevenueCategory.id })
      .from(commerceRevenueCategory)
      .where(
        and(
          scoped(commerceRevenueCategory, input.scope),
          eq(commerceRevenueCategory.id, input.id),
          isNull(commerceRevenueCategory.archivedAt),
        ),
      )
      .limit(1)
      .for("update");
    if (!ownedCategory)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Revenue category was not found in this workspace.",
      });
    const [documents] = await tx
      .select({ id: commerceDocumentDefaults.id })
      .from(commerceDocumentDefaults)
      .where(
        and(
          scoped(commerceDocumentDefaults, input.scope),
          eq(commerceDocumentDefaults.defaultRevenueCategoryId, input.id),
        ),
      )
      .limit(1);
    if (documents)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Choose another default revenue category before archiving this category.",
      });
    const updated = await tx
      .update(commerceRevenueCategory)
      .set({
        archivedAt: new Date(),
        archivedById: input.actorUserId,
        updatedById: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          scoped(commerceRevenueCategory, input.scope),
          eq(commerceRevenueCategory.id, input.id),
          isNull(commerceRevenueCategory.archivedAt),
        ),
      )
      .returning({ id: commerceRevenueCategory.id });
    if (!updated[0])
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Revenue category was not found in this workspace.",
      });
  });
}
