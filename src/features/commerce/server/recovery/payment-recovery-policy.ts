import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { paymentRecoveryPolicy } from "@/db/schema";
import type { CommerceTransaction } from "@/features/commerce/server/stripe/stripe-event-receipt";

export const paymentRecoveryTargetSchema = z.enum([
  "INVOICE",
  "MEMBERSHIP",
  "BOOKING",
]);

export const paymentRecoveryStepSchema = z.object({
  type: z.enum([
    "SEND_EMAIL",
    "SEND_SMS",
    "GRACE_PERIOD_END",
    "ESCALATE",
    "EXPIRE_BOOKING",
    "RELEASE_BOOKING",
    "RETRY_PAYMENT",
    "CREATE_TASK",
    "DISPATCH_WORKFLOW",
  ]),
});

export type PaymentRecoveryTarget = z.infer<
  typeof paymentRecoveryTargetSchema
>;

export type EffectivePaymentRecoveryPolicy = {
  id: string;
  version: number;
  mode: "ENABLED" | "DISABLED";
  gracePeriodDays: number;
  scheduleDays: number[];
  maxActions: number;
  steps: Array<z.infer<typeof paymentRecoveryStepSchema>>;
};

export async function resolveEffectivePaymentRecoveryPolicy(input: {
  tx: CommerceTransaction;
  organizationId: string;
  locationId: string | null;
  target: PaymentRecoveryTarget;
}): Promise<EffectivePaymentRecoveryPolicy | null> {
  const locationPolicy = input.locationId
    ? await input.tx.query.paymentRecoveryPolicy.findFirst({
        where: and(
          eq(paymentRecoveryPolicy.organizationId, input.organizationId),
          eq(paymentRecoveryPolicy.locationId, input.locationId),
          eq(paymentRecoveryPolicy.target, input.target),
          eq(paymentRecoveryPolicy.isActive, true),
        ),
      })
    : null;

  if (locationPolicy && locationPolicy.mode !== "INHERIT") {
    return normalizePolicy(locationPolicy);
  }

  const organizationPolicy =
    await input.tx.query.paymentRecoveryPolicy.findFirst({
      where: and(
        eq(paymentRecoveryPolicy.organizationId, input.organizationId),
        isNull(paymentRecoveryPolicy.locationId),
        eq(paymentRecoveryPolicy.target, input.target),
        eq(paymentRecoveryPolicy.isActive, true),
      ),
    });

  return organizationPolicy ? normalizePolicy(organizationPolicy) : null;
}

function normalizePolicy(
  policy: typeof paymentRecoveryPolicy.$inferSelect,
): EffectivePaymentRecoveryPolicy {
  const parsedSteps = z.array(paymentRecoveryStepSchema).safeParse(policy.steps);
  const scheduleDays = [...new Set(policy.scheduleDays)]
    .filter((day) => Number.isInteger(day) && day >= 0)
    .sort((left, right) => left - right)
    .slice(0, policy.maxActions);

  return {
    id: policy.id,
    version: policy.version,
    mode: policy.mode === "DISABLED" ? "DISABLED" : "ENABLED",
    gracePeriodDays: policy.gracePeriodDays,
    scheduleDays,
    maxActions: policy.maxActions,
    steps: parsedSteps.success ? parsedSteps.data : [],
  };
}
