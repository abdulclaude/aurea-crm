import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db";
import { commerceOfflinePaymentMethod } from "@/db/schema";
import type {
  createOfflinePaymentMethodSchema,
  updateOfflinePaymentMethodSchema,
} from "@/features/commerce-settings/contracts";

import type { CommerceSettingsScope } from "./access";
import { scoped } from "./mutation-scope";

type OfflinePaymentMethodValues = z.infer<
  typeof createOfflinePaymentMethodSchema
>;
type OfflinePaymentMethodUpdate = z.infer<
  typeof updateOfflinePaymentMethodSchema
>;

export async function createOfflinePaymentMethod(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  values: OfflinePaymentMethodValues;
}): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const id = createId();
    await tx.insert(commerceOfflinePaymentMethod).values({
      id,
      ...input.scope,
      ...input.values,
      createdById: input.actorUserId,
      updatedById: input.actorUserId,
    });
    return { id };
  });
}

export async function updateOfflinePaymentMethod(
  input: {
    scope: CommerceSettingsScope;
    actorUserId: string;
    id: string;
  } & Omit<OfflinePaymentMethodUpdate, "id">,
): Promise<void> {
  await db.transaction(async (tx) => {
    const { scope, actorUserId, id, ...values } = input;
    const updated = await tx
      .update(commerceOfflinePaymentMethod)
      .set({ ...values, updatedById: actorUserId, updatedAt: new Date() })
      .where(
        and(
          scoped(commerceOfflinePaymentMethod, scope),
          eq(commerceOfflinePaymentMethod.id, id),
          isNull(commerceOfflinePaymentMethod.archivedAt),
        ),
      )
      .returning({ id: commerceOfflinePaymentMethod.id });
    if (!updated[0])
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Offline payment method was not found in this workspace.",
      });
  });
}

export async function archiveOfflinePaymentMethod(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  id: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(commerceOfflinePaymentMethod)
      .set({
        archivedAt: new Date(),
        archivedById: input.actorUserId,
        updatedById: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          scoped(commerceOfflinePaymentMethod, input.scope),
          eq(commerceOfflinePaymentMethod.id, input.id),
          isNull(commerceOfflinePaymentMethod.archivedAt),
        ),
      )
      .returning({ id: commerceOfflinePaymentMethod.id });
    if (!updated[0])
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Offline payment method was not found in this workspace.",
      });
  });
}
