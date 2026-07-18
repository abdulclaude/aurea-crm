import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { commerceRevenueCategory } from "@/db/schema";
import type { CommerceSettingsScope } from "@/features/commerce-settings/server/access";

import { inCommerceSettingsScope } from "./model";

export type RevenueCategorySnapshot = {
  id: string;
  code: string;
  name: string;
  accountingAccountReference: string | null;
  accountingAccountName: string | null;
};

export async function resolveRevenueCategorySelection(input: {
  scope: CommerceSettingsScope;
  selection: string | null | undefined;
}): Promise<RevenueCategorySnapshot | null> {
  const selection = input.selection?.trim();
  if (!selection) return null;

  const [category] = await db
    .select({
      id: commerceRevenueCategory.id,
      code: commerceRevenueCategory.code,
      name: commerceRevenueCategory.name,
      accountingAccountReference:
        commerceRevenueCategory.accountingAccountReference,
      accountingAccountName: commerceRevenueCategory.accountingAccountName,
    })
    .from(commerceRevenueCategory)
    .where(
      and(
        inCommerceSettingsScope(
          commerceRevenueCategory.organizationId,
          commerceRevenueCategory.locationId,
          input.scope,
        ),
        isNull(commerceRevenueCategory.archivedAt),
        or(
          eq(commerceRevenueCategory.id, selection),
          eq(commerceRevenueCategory.code, selection.toUpperCase()),
          eq(commerceRevenueCategory.name, selection),
        ),
      ),
    )
    .limit(1);

  if (!category) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Revenue category was not found in this workspace.",
    });
  }

  return category;
}

export async function resolveRevenueCategorySelections(input: {
  scope: CommerceSettingsScope;
  selections: Array<string | null | undefined>;
}): Promise<Array<RevenueCategorySnapshot | null>> {
  const normalized = input.selections.map(
    (selection) => selection?.trim() || null,
  );
  const unique = Array.from(
    new Set(
      normalized.filter((selection): selection is string => selection !== null),
    ),
  );
  if (unique.length === 0) return normalized.map(() => null);

  const rows = await db
    .select({
      id: commerceRevenueCategory.id,
      code: commerceRevenueCategory.code,
      name: commerceRevenueCategory.name,
      accountingAccountReference:
        commerceRevenueCategory.accountingAccountReference,
      accountingAccountName: commerceRevenueCategory.accountingAccountName,
    })
    .from(commerceRevenueCategory)
    .where(
      and(
        inCommerceSettingsScope(
          commerceRevenueCategory.organizationId,
          commerceRevenueCategory.locationId,
          input.scope,
        ),
        isNull(commerceRevenueCategory.archivedAt),
        or(
          inArray(commerceRevenueCategory.id, unique),
          inArray(
            commerceRevenueCategory.code,
            unique.map((selection) => selection.toUpperCase()),
          ),
          inArray(commerceRevenueCategory.name, unique),
        ),
      ),
    );
  const bySelection = new Map<string, RevenueCategorySnapshot>();
  for (const row of rows) {
    bySelection.set(row.id, row);
    bySelection.set(row.code, row);
    bySelection.set(row.name, row);
  }

  return normalized.map((selection) => {
    if (selection === null) return null;
    const category =
      bySelection.get(selection) ?? bySelection.get(selection.toUpperCase());
    if (!category) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Revenue category was not found in this workspace.",
      });
    }
    return category;
  });
}

export async function listCanonicalRevenueCategories(
  scope: CommerceSettingsScope,
): Promise<RevenueCategorySnapshot[]> {
  return db
    .select({
      id: commerceRevenueCategory.id,
      code: commerceRevenueCategory.code,
      name: commerceRevenueCategory.name,
      accountingAccountReference:
        commerceRevenueCategory.accountingAccountReference,
      accountingAccountName: commerceRevenueCategory.accountingAccountName,
    })
    .from(commerceRevenueCategory)
    .where(
      and(
        inCommerceSettingsScope(
          commerceRevenueCategory.organizationId,
          commerceRevenueCategory.locationId,
          scope,
        ),
        isNull(commerceRevenueCategory.archivedAt),
      ),
    );
}
