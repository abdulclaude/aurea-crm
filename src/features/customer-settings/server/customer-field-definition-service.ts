import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { customerFieldDefinition } from "@/db/schema";
import type { CustomerFieldDefinitionValues } from "@/features/customer-settings/contracts";
import { normalizeCustomerFieldDefinition } from "@/features/customer-settings/lib/customer-field-definition";

import type { CustomerSettingsScope } from "./access";
import {
  definitionScopeWhere,
  lockDefinitionScope,
} from "./definition-service-helpers";

type CustomerFieldDefinitionListItem = Pick<
  typeof customerFieldDefinition.$inferSelect,
  | "id"
  | "key"
  | "label"
  | "description"
  | "fieldType"
  | "isRequired"
  | "options"
  | "archivedAt"
  | "createdAt"
  | "updatedAt"
>;

export async function listCustomerFieldDefinitions(
  scope: CustomerSettingsScope,
): Promise<CustomerFieldDefinitionListItem[]> {
  return db
    .select({
      id: customerFieldDefinition.id,
      key: customerFieldDefinition.key,
      label: customerFieldDefinition.label,
      description: customerFieldDefinition.description,
      fieldType: customerFieldDefinition.fieldType,
      isRequired: customerFieldDefinition.isRequired,
      options: customerFieldDefinition.options,
      archivedAt: customerFieldDefinition.archivedAt,
      createdAt: customerFieldDefinition.createdAt,
      updatedAt: customerFieldDefinition.updatedAt,
    })
    .from(customerFieldDefinition)
    .where(definitionScopeWhere(customerFieldDefinition, scope))
    .orderBy(
      desc(customerFieldDefinition.archivedAt),
      customerFieldDefinition.label,
    );
}

export async function createCustomerFieldDefinition(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  values: CustomerFieldDefinitionValues;
}): Promise<{ id: string }> {
  const values = normalizeCustomerFieldDefinition(input.values);
  return db.transaction(async (tx) => {
    await lockDefinitionScope(tx, input.scope, "field");
    const existing = await tx
      .select({ id: customerFieldDefinition.id })
      .from(customerFieldDefinition)
      .where(
        and(
          definitionScopeWhere(customerFieldDefinition, input.scope),
          eq(customerFieldDefinition.key, values.key),
          isNull(customerFieldDefinition.archivedAt),
        ),
      )
      .limit(1);
    if (existing[0]) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A customer field already uses this key.",
      });
    }
    const now = new Date();
    const id = createId();
    await tx.insert(customerFieldDefinition).values({
      id,
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
      ...values,
      createdById: input.actorUserId,
      updatedById: input.actorUserId,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  });
}

export async function updateCustomerFieldDefinition(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  id: string;
  values: CustomerFieldDefinitionValues;
}): Promise<{ id: string }> {
  const values = normalizeCustomerFieldDefinition(input.values);
  return db.transaction(async (tx) => {
    await lockDefinitionScope(tx, input.scope, "field");
    const [updated] = await tx
      .update(customerFieldDefinition)
      .set({ ...values, updatedById: input.actorUserId, updatedAt: new Date() })
      .where(
        and(
          definitionScopeWhere(customerFieldDefinition, input.scope),
          eq(customerFieldDefinition.id, input.id),
          isNull(customerFieldDefinition.archivedAt),
        ),
      )
      .returning({ id: customerFieldDefinition.id });
    if (!updated)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Customer field not found.",
      });
    return updated;
  });
}

export async function archiveCustomerFieldDefinition(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  id: string;
}): Promise<{ id: string }> {
  const [archived] = await db
    .update(customerFieldDefinition)
    .set({
      archivedAt: new Date(),
      archivedById: input.actorUserId,
      updatedById: input.actorUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        definitionScopeWhere(customerFieldDefinition, input.scope),
        eq(customerFieldDefinition.id, input.id),
        isNull(customerFieldDefinition.archivedAt),
      ),
    )
    .returning({ id: customerFieldDefinition.id });
  if (!archived)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Customer field not found.",
    });
  return archived;
}
