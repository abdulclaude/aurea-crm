import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { customerNoteTemplate } from "@/db/schema";

import type { CustomerSettingsScope } from "./access";
import {
  definitionScopeWhere,
  lockDefinitionScope,
} from "./definition-service-helpers";

type CustomerNoteTemplateValues = {
  name: string;
  description: string | null;
  content: string;
};

type CustomerNoteTemplateListItem = Pick<
  typeof customerNoteTemplate.$inferSelect,
  | "id"
  | "name"
  | "description"
  | "content"
  | "archivedAt"
  | "createdAt"
  | "updatedAt"
>;

export async function listCustomerNoteTemplates(
  scope: CustomerSettingsScope,
): Promise<CustomerNoteTemplateListItem[]> {
  return db
    .select({
      id: customerNoteTemplate.id,
      name: customerNoteTemplate.name,
      description: customerNoteTemplate.description,
      content: customerNoteTemplate.content,
      archivedAt: customerNoteTemplate.archivedAt,
      createdAt: customerNoteTemplate.createdAt,
      updatedAt: customerNoteTemplate.updatedAt,
    })
    .from(customerNoteTemplate)
    .where(definitionScopeWhere(customerNoteTemplate, scope))
    .orderBy(desc(customerNoteTemplate.archivedAt), customerNoteTemplate.name);
}

export async function createCustomerNoteTemplate(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  values: CustomerNoteTemplateValues;
}): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await lockDefinitionScope(tx, input.scope, "note-template");
    const [existing] = await tx
      .select({ id: customerNoteTemplate.id })
      .from(customerNoteTemplate)
      .where(
        and(
          definitionScopeWhere(customerNoteTemplate, input.scope),
          sql`lower(${customerNoteTemplate.name}) = lower(${input.values.name})`,
          isNull(customerNoteTemplate.archivedAt),
        ),
      )
      .limit(1);
    if (existing)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A note template already uses this name.",
      });
    const now = new Date();
    const id = createId();
    await tx.insert(customerNoteTemplate).values({
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

export async function updateCustomerNoteTemplate(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  id: string;
  values: CustomerNoteTemplateValues;
}): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await lockDefinitionScope(tx, input.scope, "note-template");
    const [conflict] = await tx
      .select({ id: customerNoteTemplate.id })
      .from(customerNoteTemplate)
      .where(
        and(
          definitionScopeWhere(customerNoteTemplate, input.scope),
          sql`lower(${customerNoteTemplate.name}) = lower(${input.values.name})`,
          ne(customerNoteTemplate.id, input.id),
          isNull(customerNoteTemplate.archivedAt),
        ),
      )
      .limit(1);
    if (conflict)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A note template already uses this name.",
      });
    const [updated] = await tx
      .update(customerNoteTemplate)
      .set({
        ...input.values,
        updatedById: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          definitionScopeWhere(customerNoteTemplate, input.scope),
          eq(customerNoteTemplate.id, input.id),
          isNull(customerNoteTemplate.archivedAt),
        ),
      )
      .returning({ id: customerNoteTemplate.id });
    if (!updated)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Note template not found.",
      });
    return updated;
  });
}

export async function archiveCustomerNoteTemplate(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  id: string;
}): Promise<{ id: string }> {
  const [archived] = await db
    .update(customerNoteTemplate)
    .set({
      archivedAt: new Date(),
      archivedById: input.actorUserId,
      updatedById: input.actorUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        definitionScopeWhere(customerNoteTemplate, input.scope),
        eq(customerNoteTemplate.id, input.id),
        isNull(customerNoteTemplate.archivedAt),
      ),
    )
    .returning({ id: customerNoteTemplate.id });
  if (!archived)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Note template not found.",
    });
  return archived;
}
