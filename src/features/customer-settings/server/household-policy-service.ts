import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, max, sql } from "drizzle-orm";

import { db } from "@/db";
import { householdSharingPolicyVersion } from "@/db/schema";
import {
  householdSharingPolicyValuesSchema,
  type HouseholdSharingPolicyValues,
} from "@/features/customer-settings/contracts";

import type { CustomerSettingsScope } from "./access";

function policyScopeWhere(scope: CustomerSettingsScope) {
  return and(
    eq(householdSharingPolicyVersion.organizationId, scope.organizationId),
    scope.locationId
      ? eq(householdSharingPolicyVersion.locationId, scope.locationId)
      : isNull(householdSharingPolicyVersion.locationId),
  );
}

function policyView(row: {
  id: string;
  version: number;
  values: unknown;
  changeNote: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    version: row.version,
    values: householdSharingPolicyValuesSchema.parse(row.values),
    changeNote: row.changeNote,
    createdAt: row.createdAt,
  };
}

export async function getHouseholdSharingPolicy(scope: CustomerSettingsScope) {
  const [active] = await db
    .select({
      id: householdSharingPolicyVersion.id,
      version: householdSharingPolicyVersion.version,
      values: householdSharingPolicyVersion.values,
      changeNote: householdSharingPolicyVersion.changeNote,
      createdAt: householdSharingPolicyVersion.createdAt,
    })
    .from(householdSharingPolicyVersion)
    .where(
      and(
        policyScopeWhere(scope),
        eq(householdSharingPolicyVersion.isActive, true),
      ),
    )
    .limit(1);
  return active ? policyView(active) : null;
}

export async function listHouseholdSharingPolicyHistory(
  scope: CustomerSettingsScope,
) {
  const rows = await db
    .select({
      id: householdSharingPolicyVersion.id,
      version: householdSharingPolicyVersion.version,
      values: householdSharingPolicyVersion.values,
      changeNote: householdSharingPolicyVersion.changeNote,
      createdAt: householdSharingPolicyVersion.createdAt,
    })
    .from(householdSharingPolicyVersion)
    .where(policyScopeWhere(scope))
    .orderBy(desc(householdSharingPolicyVersion.version));
  return rows.map(policyView);
}

export async function saveHouseholdSharingPolicy(input: {
  scope: CustomerSettingsScope;
  actorUserId: string;
  values: HouseholdSharingPolicyValues;
  expectedVersion: number | null;
  changeNote: string | null;
}) {
  return db.transaction(async (tx) => {
    const lockKey = `${input.scope.organizationId}:${input.scope.locationId ?? "organization"}:household-sharing`;
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    );
    const [active] = await tx
      .select({ version: householdSharingPolicyVersion.version })
      .from(householdSharingPolicyVersion)
      .where(
        and(
          policyScopeWhere(input.scope),
          eq(householdSharingPolicyVersion.isActive, true),
        ),
      )
      .limit(1);
    if ((active?.version ?? null) !== input.expectedVersion) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This household policy changed after you opened it. Reload and review the latest version.",
      });
    }
    const [latest] = await tx
      .select({ version: max(householdSharingPolicyVersion.version) })
      .from(householdSharingPolicyVersion)
      .where(policyScopeWhere(input.scope));
    await tx
      .update(householdSharingPolicyVersion)
      .set({ isActive: false })
      .where(
        and(
          policyScopeWhere(input.scope),
          eq(householdSharingPolicyVersion.isActive, true),
        ),
      );
    const now = new Date();
    const [created] = await tx
      .insert(householdSharingPolicyVersion)
      .values({
        id: createId(),
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        version: (latest?.version ?? 0) + 1,
        values: input.values,
        isActive: true,
        changeNote: input.changeNote,
        createdById: input.actorUserId,
        createdAt: now,
      })
      .returning({
        id: householdSharingPolicyVersion.id,
        version: householdSharingPolicyVersion.version,
        values: householdSharingPolicyVersion.values,
        changeNote: householdSharingPolicyVersion.changeNote,
        createdAt: householdSharingPolicyVersion.createdAt,
      });
    if (!created)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Household policy could not be saved.",
      });
    return policyView(created);
  });
}
