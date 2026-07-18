import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db";
import { commerceTaxAssignment, commerceTaxRate } from "@/db/schema";
import type {
  createTaxRateSchema,
  updateTaxRateSchema,
} from "@/features/commerce-settings/contracts";

import type { CommerceSettingsScope } from "./access";
import { scoped } from "./mutation-scope";

type TaxRateValues = z.infer<typeof createTaxRateSchema>;
type TaxRateUpdate = z.infer<typeof updateTaxRateSchema>;

export async function createTaxRate(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  values: TaxRateValues;
}): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const id = createId();
    await tx.insert(commerceTaxRate).values({
      id,
      ...input.scope,
      ...input.values,
      createdById: input.actorUserId,
      updatedById: input.actorUserId,
    });
    return { id };
  });
}

export async function updateTaxRate(
  input: {
    scope: CommerceSettingsScope;
    actorUserId: string;
    id: string;
  } & Omit<TaxRateUpdate, "id">,
): Promise<void> {
  await db.transaction(async (tx) => {
    const { scope, actorUserId, id, ...values } = input;
    const updated = await tx
      .update(commerceTaxRate)
      .set({ ...values, updatedById: actorUserId, updatedAt: new Date() })
      .where(
        and(
          scoped(commerceTaxRate, scope),
          eq(commerceTaxRate.id, id),
          isNull(commerceTaxRate.archivedAt),
        ),
      )
      .returning({ id: commerceTaxRate.id });
    if (!updated[0])
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tax rate was not found in this workspace.",
      });
  });
}

export async function archiveTaxRate(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  id: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [ownedTaxRate] = await tx
      .select({ id: commerceTaxRate.id })
      .from(commerceTaxRate)
      .where(
        and(
          scoped(commerceTaxRate, input.scope),
          eq(commerceTaxRate.id, input.id),
          isNull(commerceTaxRate.archivedAt),
        ),
      )
      .limit(1)
      .for("update");
    if (!ownedTaxRate)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tax rate was not found in this workspace.",
      });
    const references = await tx
      .select({ id: commerceTaxAssignment.id })
      .from(commerceTaxAssignment)
      .where(
        and(
          scoped(commerceTaxAssignment, input.scope),
          eq(commerceTaxAssignment.taxRateId, input.id),
          isNull(commerceTaxAssignment.archivedAt),
        ),
      )
      .limit(1);
    if (references[0])
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Reassign or archive active tax assignments before archiving this tax rate.",
      });
    const updated = await tx
      .update(commerceTaxRate)
      .set({
        archivedAt: new Date(),
        archivedById: input.actorUserId,
        updatedById: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          scoped(commerceTaxRate, input.scope),
          eq(commerceTaxRate.id, input.id),
          isNull(commerceTaxRate.archivedAt),
        ),
      )
      .returning({ id: commerceTaxRate.id });
    if (!updated[0])
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tax rate was not found in this workspace.",
      });
  });
}
