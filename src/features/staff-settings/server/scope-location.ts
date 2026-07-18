import { eq, isNull, type AnyColumn } from "drizzle-orm";

export function scopeLocation(column: AnyColumn, locationId: string | null) {
  return locationId === null ? isNull(column) : eq(column, locationId);
}
