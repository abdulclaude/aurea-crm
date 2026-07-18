import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { customerTagDefinition } from "@/db/schema";

import type { CustomerSettingsScope } from "./access";
import {
  definitionScopeWhere,
  lockDefinitionScope,
} from "./definition-service-helpers";

type CustomerTagDefinitionValues = {
  name: string;
  color: string | null;
  description: string | null;
};

type CustomerTagDefinitionListItem = Pick<
  typeof customerTagDefinition.$inferSelect,
  | "id"
  | "name"
  | "color"
  | "description"
  | "archivedAt"
  | "createdAt"
  | "updatedAt"
>;

export async function listCustomerTagDefinitions(
  scope: CustomerSettingsScope,
): Promise<CustomerTagDefinitionListItem[]> {
  return db
    .select({
      id: customerTagDefinition.id,
      name: customerTagDefinition.name,
      color: customerTagDefinition.color,
      description: customerTagDefinition.description,
      archivedAt: customerTagDefinition.archivedAt,
      createdAt: customerTagDefinition.createdAt,
      updatedAt: customerTagDefinition.updatedAt,
    })
    .from(customerTagDefinition)
    .where(definitionScopeWhere(customerTagDefinition, scope))
    .orderBy(
      desc(customerTagDefinition.archivedAt),
      customerTagDefinition.name,
    );
}

export async function createCustomerTagDefinition(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  values: CustomerTagDefinitionValues;
}): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await lockDefinitionScope(tx, input.scope, "tag");
    const [existing] = await tx
      .select({ id: customerTagDefinition.id })
      .from(customerTagDefinition)
      .where(
        and(
          definitionScopeWhere(customerTagDefinition, input.scope),
          sql`lower(${customerTagDefinition.name}) = lower(${input.values.name})`,
          isNull(customerTagDefinition.archivedAt),
        ),
      )
      .limit(1);
    if (existing)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A customer tag already uses this name.",
      });
    const now = new Date();
    const id = createId();
    await tx.insert(customerTagDefinition).values({
      id,
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
      ...input.values,
      createdById: input.actorUserId,
      updatedById: input.actorUserId,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  });
}

export async function updateCustomerTagDefinition(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  id: string;
  values: CustomerTagDefinitionValues;
}): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await lockDefinitionScope(tx, input.scope, "tag");
    const [conflict] = await tx
      .select({ id: customerTagDefinition.id })
      .from(customerTagDefinition)
      .where(
        and(
          definitionScopeWhere(customerTagDefinition, input.scope),
          sql`lower(${customerTagDefinition.name}) = lower(${input.values.name})`,
          ne(customerTagDefinition.id, input.id),
          isNull(customerTagDefinition.archivedAt),
        ),
      )
      .limit(1);
    if (conflict)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A customer tag already uses this name.",
      });
    const [updated] = await tx
      .update(customerTagDefinition)
      .set({
        ...input.values,
        updatedById: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          definitionScopeWhere(customerTagDefinition, input.scope),
          eq(customerTagDefinition.id, input.id),
          isNull(customerTagDefinition.archivedAt),
        ),
      )
      .returning({ id: customerTagDefinition.id });
    if (!updated)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Customer tag not found.",
      });
    return updated;
  });
}

export async function archiveCustomerTagDefinition(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  id: string;
}): Promise<{ id: string }> {
  const [archived] = await db
    .update(customerTagDefinition)
    .set({
      archivedAt: new Date(),
      archivedById: input.actorUserId,
      updatedById: input.actorUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        definitionScopeWhere(customerTagDefinition, input.scope),
        eq(customerTagDefinition.id, input.id),
        isNull(customerTagDefinition.archivedAt),
      ),
    )
    .returning({ id: customerTagDefinition.id });
  if (!archived)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Customer tag not found.",
    });
  return archived;
}
