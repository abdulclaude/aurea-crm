import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  customerFieldDefinition,
  customerNoteTemplate,
  customerTagDefinition,
} from "@/db/schema";

import type { CustomerSettingsScope } from "./access";

type DefinitionTable =
  | typeof customerFieldDefinition
  | typeof customerTagDefinition
  | typeof customerNoteTemplate;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function definitionScopeWhere(
  table: DefinitionTable,
  scope: CustomerSettingsScope,
): ReturnType<typeof and> {
  return and(
    eq(table.organizationId, scope.organizationId),
    scope.locationId
      ? eq(table.locationId, scope.locationId)
      : isNull(table.locationId),
  );
}

export async function lockDefinitionScope(
  tx: Transaction,
  scope: CustomerSettingsScope,
  kind: "field" | "tag" | "note-template",
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${scope.organizationId}:${scope.locationId ?? "organization"}:customer-${kind}`}, 0))`,
  );
}
