import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { CommerceSettingsScope } from "./access";

export function exactScopedLocation(
  column: AnyPgColumn,
  locationId: string | null,
): SQL {
  return locationId === null ? isNull(column) : eq(column, locationId);
}

export function inCommerceSettingsScope(
  organizationIdColumn: AnyPgColumn,
  locationIdColumn: AnyPgColumn,
  scope: CommerceSettingsScope,
): SQL {
  return and(
    eq(organizationIdColumn, scope.organizationId),
    exactScopedLocation(locationIdColumn, scope.locationId),
  )!;
}
