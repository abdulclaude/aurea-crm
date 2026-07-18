import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";

import {
  cancellationCharge,
  cancellationCreditAllocation,
  cancellationPolicy,
  classCredit,
} from "@/db/schema";

import { exactCancellationLocation } from "./cancellation-access";
import type { CancellationTransaction } from "./cancellation-domain-types";

export async function deductCreditsForCreatedCharges(
  tx: CancellationTransaction,
  input: {
    organizationId: string;
    locationId: string | null;
    charges: Array<typeof cancellationCharge.$inferSelect>;
    policyByBooking: Map<
      string,
      typeof cancellationPolicy.$inferSelect | undefined
    >;
    now: Date;
  },
): Promise<void> {
  const requirements = input.charges.flatMap((charge) => {
    const policy = input.policyByBooking.get(charge.bookingId);
    if (!policy?.deductCredits || policy.creditsDeducted <= 0) return [];
    return [{ charge, required: policy.creditsDeducted }];
  });
  if (requirements.length === 0) return;

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
        eq(classCredit.organizationId, input.organizationId),
        exactCancellationLocation(classCredit.locationId, input.locationId),
        inArray(
          classCredit.clientId,
          requirements.map(({ charge }) => charge.clientId),
        ),
        or(isNull(classCredit.expiresAt), gt(classCredit.expiresAt, input.now)),
        sql`${classCredit.usedCredits} < ${classCredit.totalCredits}`,
      ),
    )
    .orderBy(
      asc(classCredit.clientId),
      sql`${classCredit.expiresAt} ASC NULLS LAST`,
      asc(classCredit.createdAt),
    )
    .for("update");

  const creditsByClient = new Map<string, typeof credits>();
  for (const credit of credits) {
    const current = creditsByClient.get(credit.clientId) ?? [];
    current.push(credit);
    creditsByClient.set(credit.clientId, current);
  }

  const creditIncrements = new Map<string, number>();
  const chargeDeductions = new Map<string, number>();
  const allocationRows: Array<
    typeof cancellationCreditAllocation.$inferInsert
  > = [];
  for (const { charge, required } of requirements) {
    let remaining = required;
    for (const credit of creditsByClient.get(charge.clientId) ?? []) {
      const alreadyAllocated = creditIncrements.get(credit.id) ?? 0;
      const available =
        credit.totalCredits - credit.usedCredits - alreadyAllocated;
      if (available <= 0) continue;
      const applied = Math.min(available, remaining);
      creditIncrements.set(credit.id, alreadyAllocated + applied);
      allocationRows.push({
        id: createId(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        cancellationChargeId: charge.id,
        classCreditId: credit.id,
        credits: applied,
        createdAt: input.now,
      });
      remaining -= applied;
      if (remaining === 0) break;
    }
    chargeDeductions.set(charge.id, required - remaining);
  }

  if (allocationRows.length > 0) {
    await tx.insert(cancellationCreditAllocation).values(allocationRows);
  }
  await applyCreditIncrements(tx, creditIncrements, input.now);
  await applyChargeDeductions(tx, chargeDeductions, input.now);
}

async function applyCreditIncrements(
  tx: CancellationTransaction,
  increments: Map<string, number>,
  now: Date,
): Promise<void> {
  if (increments.size === 0) return;
  const values = [...increments].map(
    ([id, increment]) => sql`(${id}::text, ${increment}::integer)`,
  );
  await tx.execute(sql`
    UPDATE "ClassCredit" AS credit
    SET
      "usedCredits" = credit."usedCredits" + allocation.increment,
      "updatedAt" = ${now}
    FROM (VALUES ${sql.join(values, sql`, `)}) AS allocation(id, increment)
    WHERE credit."id" = allocation.id
  `);
}

async function applyChargeDeductions(
  tx: CancellationTransaction,
  deductions: Map<string, number>,
  now: Date,
): Promise<void> {
  if (deductions.size === 0) return;
  const values = [...deductions].map(
    ([id, deducted]) => sql`(${id}::text, ${deducted}::integer)`,
  );
  await tx.execute(sql`
    UPDATE "CancellationCharge" AS charge
    SET
      "creditsDeducted" = allocation.deducted,
      "updatedAt" = ${now}
    FROM (VALUES ${sql.join(values, sql`, `)}) AS allocation(id, deducted)
    WHERE charge."id" = allocation.id
  `);
}
