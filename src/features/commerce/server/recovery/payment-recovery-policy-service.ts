import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, max, or, sql } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db";
import { paymentRecoveryPolicy } from "@/db/schema";
import {
  recoveryPolicyUpdateSchema,
  recoveryTargets,
} from "@/features/commerce/recovery-contracts";

import type { PaymentRecoveryScope } from "./payment-recovery-access";

type PolicyInput = z.infer<typeof recoveryPolicyUpdateSchema>;
type PolicyRow = typeof paymentRecoveryPolicy.$inferSelect;
type PolicyView = {
  id: string;
  target: PolicyRow["target"];
  mode: PolicyRow["mode"];
  name: string;
  version: number;
  gracePeriodDays: number;
  scheduleDays: number[];
  maxActions: number;
  steps: PolicyInput["steps"];
  updatedAt: Date;
};

function policyView(row: PolicyRow | undefined): PolicyView | null {
  if (!row) return null;
  const parsedSteps = recoveryPolicyUpdateSchema.shape.steps.safeParse(
    row.steps,
  );
  return {
    id: row.id,
    target: row.target,
    mode: row.mode,
    name: row.name,
    version: row.version,
    gracePeriodDays: row.gracePeriodDays,
    scheduleDays: row.scheduleDays,
    maxActions: row.maxActions,
    steps: parsedSteps.success ? parsedSteps.data : [],
    updatedAt: row.updatedAt,
  };
}

export async function listPaymentRecoveryPolicies(
  scope: PaymentRecoveryScope,
): Promise<
  Array<{
    target: (typeof recoveryTargets)[number];
    exact: ReturnType<typeof policyView>;
    inherited: ReturnType<typeof policyView>;
    effective: ReturnType<typeof policyView>;
  }>
> {
  const rows = await db
    .select()
    .from(paymentRecoveryPolicy)
    .where(
      and(
        eq(paymentRecoveryPolicy.organizationId, scope.organizationId),
        eq(paymentRecoveryPolicy.isActive, true),
        inArray(paymentRecoveryPolicy.target, [...recoveryTargets]),
        scope.locationId
          ? or(
              eq(paymentRecoveryPolicy.locationId, scope.locationId),
              isNull(paymentRecoveryPolicy.locationId),
            )
          : isNull(paymentRecoveryPolicy.locationId),
      ),
    )
    .orderBy(desc(paymentRecoveryPolicy.version));

  return recoveryTargets.map((target) => {
    const exact = rows.find(
      (row) => row.target === target && row.locationId === scope.locationId,
    );
    const inherited = scope.locationId
      ? rows.find((row) => row.target === target && row.locationId === null)
      : undefined;
    const effective =
      exact?.mode === "INHERIT" ? inherited : (exact ?? inherited);
    return {
      target,
      exact: policyView(exact),
      inherited: policyView(inherited),
      effective: policyView(effective),
    };
  });
}

export async function versionPaymentRecoveryPolicy(input: {
  scope: PaymentRecoveryScope;
  actorUserId: string;
  policy: PolicyInput;
}): Promise<PolicyView> {
  if (!input.scope.locationId && input.policy.mode === "INHERIT") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization policies cannot inherit from another scope.",
    });
  }

  return db.transaction(async (tx) => {
    const lockKey = [
      input.scope.organizationId,
      input.scope.locationId ?? "organization",
      input.policy.target,
    ].join(":");
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    );
    const [latest] = await tx
      .select({ version: max(paymentRecoveryPolicy.version) })
      .from(paymentRecoveryPolicy)
      .where(
        and(
          eq(paymentRecoveryPolicy.organizationId, input.scope.organizationId),
          input.scope.locationId
            ? eq(paymentRecoveryPolicy.locationId, input.scope.locationId)
            : isNull(paymentRecoveryPolicy.locationId),
          eq(paymentRecoveryPolicy.target, input.policy.target),
        ),
      );
    const now = new Date();
    const orderedSchedule = input.policy.scheduleDays
      .map((day, index) => ({ day, step: input.policy.steps[index] }))
      .sort((left, right) => left.day - right.day);
    await tx
      .update(paymentRecoveryPolicy)
      .set({ isActive: false, updatedAt: now })
      .where(
        and(
          eq(paymentRecoveryPolicy.organizationId, input.scope.organizationId),
          input.scope.locationId
            ? eq(paymentRecoveryPolicy.locationId, input.scope.locationId)
            : isNull(paymentRecoveryPolicy.locationId),
          eq(paymentRecoveryPolicy.target, input.policy.target),
          eq(paymentRecoveryPolicy.isActive, true),
        ),
      );
    const [created] = await tx
      .insert(paymentRecoveryPolicy)
      .values({
        id: createId(),
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        ...input.policy,
        scheduleDays: orderedSchedule.map((item) => item.day),
        steps: orderedSchedule.map((item) => item.step),
        version: (latest?.version ?? 0) + 1,
        isActive: true,
        createdBy: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "The payment recovery policy could not be saved.",
      });
    }
    const result = policyView(created);
    if (!result) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "The saved payment recovery policy could not be read.",
      });
    }
    return result;
  });
}
