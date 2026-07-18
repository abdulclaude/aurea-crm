import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import {
  cancellationCharge,
  cancellationCreditAllocation,
  cancellationPolicy,
  classCredit,
} from "@/db/schema";
import {
  deterministicDemoId,
  type DemoDataTransaction,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";

export async function seedCancellationCreditAllocations(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
  charges: ReadonlyArray<typeof cancellationCharge.$inferInsert>,
  policies: ReadonlyArray<typeof cancellationPolicy.$inferInsert>,
): Promise<Array<typeof cancellationCreditAllocation.$inferInsert>> {
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));
  const eligible = charges.filter((charge) => {
    const policy = charge.policyId
      ? policyById.get(charge.policyId)
      : undefined;
    return (
      charge.status !== "WAIVED" &&
      policy?.deductCredits === true &&
      (policy.creditsDeducted ?? 0) > 0
    );
  });
  if (eligible.length === 0) return [];

  const credits = await tx
    .select({
      id: classCredit.id,
      clientId: classCredit.clientId,
      totalCredits: classCredit.totalCredits,
      usedCredits: classCredit.usedCredits,
    })
    .from(classCredit)
    .where(
      and(
        eq(classCredit.organizationId, context.organizationId),
        eq(classCredit.locationId, context.locationId),
        inArray(
          classCredit.clientId,
          eligible.map((charge) => charge.clientId),
        ),
        or(
          isNull(classCredit.expiresAt),
          sql`${classCredit.expiresAt} > ${context.referenceDate}`,
        ),
        sql`${classCredit.usedCredits} < ${classCredit.totalCredits}`,
      ),
    )
    .orderBy(asc(classCredit.clientId), asc(classCredit.createdAt));

  const byClient = new Map<string, typeof credits>();
  for (const credit of credits) {
    const current = byClient.get(credit.clientId) ?? [];
    current.push(credit);
    byClient.set(credit.clientId, current);
  }

  const creditIncrements = new Map<string, number>();
  const chargeDeductions = new Map<string, number>();
  const allocations: Array<typeof cancellationCreditAllocation.$inferInsert> =
    [];
  for (const [chargeIndex, charge] of eligible.entries()) {
    const policy = charge.policyId
      ? policyById.get(charge.policyId)
      : undefined;
    let remaining = policy?.creditsDeducted ?? 0;
    for (const credit of byClient.get(charge.clientId) ?? []) {
      const reserved = creditIncrements.get(credit.id) ?? 0;
      const available = credit.totalCredits - credit.usedCredits - reserved;
      if (available <= 0) continue;
      const applied = Math.min(remaining, available);
      creditIncrements.set(credit.id, reserved + applied);
      allocations.push({
        id: deterministicDemoId(
          context.runId,
          "cancellation-credit-allocation",
          `${chargeIndex}-${credit.id}`,
        ),
        organizationId: context.organizationId,
        locationId: context.locationId,
        cancellationChargeId: charge.id,
        classCreditId: credit.id,
        credits: applied,
        createdAt: context.referenceDate,
      });
      remaining -= applied;
      if (remaining === 0) break;
    }
    chargeDeductions.set(charge.id, (policy?.creditsDeducted ?? 0) - remaining);
  }

  if (allocations.length > 0) {
    await tx.insert(cancellationCreditAllocation).values(allocations);
  }
  await applyCreditIncrements(tx, creditIncrements, context.referenceDate);
  await applyChargeDeductions(tx, chargeDeductions, context.referenceDate);
  return allocations;
}

async function applyCreditIncrements(
  tx: DemoDataTransaction,
  valuesById: Map<string, number>,
  now: Date,
): Promise<void> {
  if (valuesById.size === 0) return;
  const values = [...valuesById].map(
    ([id, value]) => sql`(${id}::text, ${value}::integer)`,
  );
  await tx.execute(sql`
    UPDATE "ClassCredit" AS target
    SET "usedCredits" = target."usedCredits" + source.value,
    "updatedAt" = ${now}
    FROM (VALUES ${sql.join(values, sql`, `)}) AS source(id, value)
    WHERE target."id" = source.id
  `);
}

async function applyChargeDeductions(
  tx: DemoDataTransaction,
  valuesById: Map<string, number>,
  now: Date,
): Promise<void> {
  if (valuesById.size === 0) return;
  const values = [...valuesById].map(
    ([id, value]) => sql`(${id}::text, ${value}::integer)`,
  );
  await tx.execute(sql`
    UPDATE "CancellationCharge" AS target
    SET "creditsDeducted" = source.value,
    "updatedAt" = ${now}
    FROM (VALUES ${sql.join(values, sql`, `)}) AS source(id, value)
    WHERE target."id" = source.id
  `);
}
