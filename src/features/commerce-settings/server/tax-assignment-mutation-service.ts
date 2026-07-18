import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db";
import {
  commerceTaxAssignment,
  commerceTaxRate,
  studioProduct,
} from "@/db/schema";
import type { upsertTaxAssignmentSchema } from "@/features/commerce-settings/contracts";

import type { CommerceSettingsScope } from "./access";
import type { CommerceSettingsTransaction } from "./mutation-scope";
import { scoped } from "./mutation-scope";

type TaxAssignmentValues = z.infer<typeof upsertTaxAssignmentSchema>;

async function requireActiveTaxRate(
  tx: CommerceSettingsTransaction,
  scope: CommerceSettingsScope,
  taxRateId: string,
): Promise<void> {
  const [taxRate] = await tx
    .select({ id: commerceTaxRate.id })
    .from(commerceTaxRate)
    .where(
      and(
        scoped(commerceTaxRate, scope),
        eq(commerceTaxRate.id, taxRateId),
        isNull(commerceTaxRate.archivedAt),
      ),
    )
    .limit(1)
    .for("share");
  if (!taxRate)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Tax rate was not found in this workspace.",
    });
}

async function requireProduct(
  tx: CommerceSettingsTransaction,
  scope: CommerceSettingsScope,
  productId: string,
): Promise<void> {
  const [product] = await tx
    .select({ id: studioProduct.id })
    .from(studioProduct)
    .where(
      and(
        eq(studioProduct.id, productId),
        eq(studioProduct.organizationId, scope.organizationId),
        scope.locationId
          ? eq(studioProduct.locationId, scope.locationId)
          : isNull(studioProduct.locationId),
        eq(studioProduct.isActive, true),
        isNull(studioProduct.deletedAt),
      ),
    )
    .limit(1)
    .for("share");
  if (!product)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Product was not found in this workspace.",
    });
}

export async function upsertTaxAssignment(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  values: TaxAssignmentValues;
}): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    if (input.values.taxRateId)
      await requireActiveTaxRate(tx, input.scope, input.values.taxRateId);
    if (input.values.productId)
      await requireProduct(tx, input.scope, input.values.productId);
    const targetWhere =
      input.values.subjectType === "PRODUCT"
        ? and(
            scoped(commerceTaxAssignment, input.scope),
            eq(commerceTaxAssignment.subjectType, "PRODUCT"),
            eq(commerceTaxAssignment.productId, input.values.productId!),
            isNull(commerceTaxAssignment.archivedAt),
          )
        : and(
            scoped(commerceTaxAssignment, input.scope),
            eq(commerceTaxAssignment.subjectType, "LINE_TYPE"),
            eq(commerceTaxAssignment.lineType, input.values.lineType!),
            isNull(commerceTaxAssignment.archivedAt),
          );
    const [existing] = await tx
      .select({ id: commerceTaxAssignment.id })
      .from(commerceTaxAssignment)
      .where(
        input.values.id
          ? and(
              scoped(commerceTaxAssignment, input.scope),
              eq(commerceTaxAssignment.id, input.values.id),
              isNull(commerceTaxAssignment.archivedAt),
            )
          : targetWhere,
      )
      .limit(1);
    if (input.values.id && !existing)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tax assignment was not found in this workspace.",
      });
    if (existing) {
      await tx
        .update(commerceTaxAssignment)
        .set({
          subjectType: input.values.subjectType,
          lineType: input.values.lineType,
          productId: input.values.productId,
          taxRateId: input.values.taxRateId,
          updatedById: input.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(commerceTaxAssignment.id, existing.id));
      return { id: existing.id };
    }
    const id = createId();
    await tx.insert(commerceTaxAssignment).values({
      id,
      ...input.scope,
      subjectType: input.values.subjectType,
      lineType: input.values.lineType,
      productId: input.values.productId,
      taxRateId: input.values.taxRateId,
      createdById: input.actorUserId,
      updatedById: input.actorUserId,
    });
    return { id };
  });
}

export async function archiveTaxAssignment(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  id: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(commerceTaxAssignment)
      .set({
        archivedAt: new Date(),
        archivedById: input.actorUserId,
        updatedById: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          scoped(commerceTaxAssignment, input.scope),
          eq(commerceTaxAssignment.id, input.id),
          isNull(commerceTaxAssignment.archivedAt),
        ),
      )
      .returning({ id: commerceTaxAssignment.id });
    if (!updated[0])
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tax assignment was not found in this workspace.",
      });
  });
}
