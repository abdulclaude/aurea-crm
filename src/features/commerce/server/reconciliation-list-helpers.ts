import { eq, type AnyColumn, type SQL } from "drizzle-orm";

export type CommerceScope = {
  organizationId: string;
  locationId: string | null;
};

export type Page<T> = {
  items: T[];
  nextCursor: { at: Date; id: string } | null;
};

export function containsPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export function locationCondition(
  column: AnyColumn<{ data: string }>,
  locationId: string | null,
): SQL | null {
  return locationId ? eq(column, locationId) : null;
}

export function pageResult<T extends { id: string }>(input: {
  rows: T[];
  limit: number;
  cursorDate: (row: T) => Date;
}): Page<T> {
  const hasMore = input.rows.length > input.limit;
  const items = hasMore ? input.rows.slice(0, input.limit) : input.rows;
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      hasMore && last
        ? { at: input.cursorDate(last), id: last.id }
        : null,
  };
}
