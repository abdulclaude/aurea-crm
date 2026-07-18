import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import { DEMO_FINANCE_PROVIDER } from "./constants";
import { addLedger, before, pick } from "./helpers";
import type {
  FinanceFixturePlan,
  FinancePackDependencies,
  LedgerSeed,
} from "./types";

export function buildExtraLedgerFixtures(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  dependencies: FinancePackDependencies,
  currency: string,
  exponent: number,
): void {
  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const adjustmentCount = context.profile === "QA_EXHAUSTIVE" ? 40 : 16;
  for (let index = 0; index < adjustmentCount; index += 1) {
    const client = pick(dependencies.clients, index * 5, "client");
    const amount = (10 + (index % 6) * 5) * 10 ** exponent;
    const occurredAt = before(context.referenceDate, index * 9);
    const operationId = deterministicDemoId(
      context.runId,
      "finance-operation",
      `adjustment-${index}`,
    );
    plan.operations.push({
      id: operationId,
      ...scope,
      clientId: client.id,
      type: "CREDIT_ADJUSTMENT",
      status: "SUCCEEDED",
      provider: DEMO_FINANCE_PROVIDER,
      providerAccountId: null,
      stripeConnectionId: null,
      idempotencyKey: `demo:${context.runId}:adjustment:${index}`,
      amountMinor: amount,
      currency,
      currencyExponent: exponent,
      requestedBy: context.actorUserId,
      completedAt: occurredAt,
      metadata: demoMetadata(context),
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    addLedger(plan, context, {
      index: `adjustment-${index}`,
      kind: index % 2 === 0 ? "CREDIT" : "ADJUSTMENT",
      status: "SUCCEEDED",
      amount,
      occurredAt,
      clientId: client.id,
      operationId,
    });
  }

  const payoutCount = Math.min(
    dependencies.instructors.length,
    context.profile === "QA_EXHAUSTIVE" ? 24 : 8,
  );
  for (let index = 0; index < payoutCount; index += 1) {
    const instructor = pick(dependencies.instructors, index, "instructor");
    addLedger(plan, context, {
      index: `payout-${index}`,
      kind: "PAYOUT",
      status: ["SUCCEEDED", "FAILED", "CANCELLED"][
        index % 3
      ] as LedgerSeed["status"],
      amount: (120 + index * 15) * 10 ** exponent,
      occurredAt: before(context.referenceDate, index * 14),
      instructorId: instructor.id,
    });
  }
}
