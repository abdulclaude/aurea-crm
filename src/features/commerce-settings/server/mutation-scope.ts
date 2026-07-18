import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";

import type { CommerceSettingsScope } from "./access";
import { inCommerceSettingsScope } from "./model";

export type CommerceSettingsTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export function scoped(
  table: {
    organizationId: AnyPgColumn;
    locationId: AnyPgColumn;
  },
  scope: CommerceSettingsScope,
) {
  return inCommerceSettingsScope(table.organizationId, table.locationId, scope);
}
