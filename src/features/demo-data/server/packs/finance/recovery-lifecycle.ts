import { createHash } from "node:crypto";

import { currencyExponent } from "@/features/commerce/lib/money";
import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import { DAY, DEMO_FINANCE_PROVIDER } from "./constants";
import type { RecoveryCaseSeed } from "./recovery-fixtures";
import type { FinanceFixturePlan } from "./types";

export function addRecoveryLifecycle(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  fixture: RecoveryCaseSeed,
  index: number,
  policyId: string,
): void {
  const caseId = deterministicDemoId(
    context.runId,
    "payment-recovery-case",
    fixture.key,
  );
  const openedAt = new Date(
    context.referenceDate.getTime() - (index + 2) * DAY,
  );
  const recovered = fixture.status === "RECOVERED";
  const exhausted = fixture.status === "EXHAUSTED";
  plan.recoveryCases.push({
    id: caseId,
    organizationId: context.organizationId,
    locationId: context.locationId,
    clientId: fixture.clientId,
    target: fixture.target,
    status: fixture.status,
    caseKey: `demo:${context.runId}:${fixture.key}`,
    policyId,
    policyVersion: 1,
    policySnapshot: { demo: true, version: 1 },
    invoiceId: fixture.sourceKind === "invoice" ? fixture.sourceId : null,
    membershipId: fixture.sourceKind === "membership" ? fixture.sourceId : null,
    bookingId: fixture.sourceKind === "booking" ? fixture.sourceId : null,
    studioBookingId:
      fixture.sourceKind === "studioBooking" ? fixture.sourceId : null,
    commerceOperationId: fixture.operationId,
    provider: DEMO_FINANCE_PROVIDER,
    providerObjectId: `aurea-demo:recovery:${context.runId}:${fixture.key}`,
    sourceEventAt: openedAt,
    amountMinor: fixture.amountMinor,
    currency: context.currency,
    currencyExponent: currencyExponent(context.currency),
    attemptCount: recovered ? 2 : exhausted ? 3 : 1,
    nextActionAt:
      fixture.status === "OPEN" || fixture.status === "IN_PROGRESS"
        ? new Date(context.referenceDate.getTime() + DAY)
        : null,
    lastErrorCode: recovered ? null : "DEMO_PAYMENT_FAILED",
    lastErrorMessage: recovered
      ? null
      : "Synthetic payment failure for recovery workflow demonstration.",
    openedAt,
    recoveredAt: recovered ? context.referenceDate : null,
    exhaustedAt: exhausted ? context.referenceDate : null,
    metadata: demoMetadata(context, { scenario: fixture.scenario }),
    createdAt: openedAt,
    updatedAt: context.referenceDate,
  });
  addActionsAttemptsAndLink(plan, context, {
    caseId,
    fixture,
    openedAt,
  });
}

function addActionsAttemptsAndLink(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  input: { caseId: string; fixture: RecoveryCaseSeed; openedAt: Date },
): void {
  const terminal =
    input.fixture.status === "RECOVERED" ||
    input.fixture.status === "EXHAUSTED";
  const actionTypes =
    input.fixture.target === "BOOKING"
      ? (["SEND_EMAIL", "RELEASE_BOOKING", "CREATE_TASK"] as const)
      : (["SEND_EMAIL", "CREATE_TASK"] as const);
  actionTypes.forEach((type, sequence) => {
    const id = deterministicDemoId(
      context.runId,
      "payment-recovery-action",
      `${input.fixture.key}-${sequence}`,
    );
    const succeeded = sequence === 0 || input.fixture.status === "EXHAUSTED";
    plan.recoveryActions.push({
      id,
      organizationId: context.organizationId,
      locationId: context.locationId,
      caseId: input.caseId,
      type,
      status: succeeded ? "SUCCEEDED" : terminal ? "CANCELLED" : "SCHEDULED",
      sequence,
      idempotencyKey: `demo:${context.runId}:recovery-action:${input.fixture.key}:${sequence}`,
      scheduledAt: new Date(input.openedAt.getTime() + sequence * DAY),
      availableAt: new Date(input.openedAt.getTime() + sequence * DAY),
      attemptCount: succeeded ? 1 : 0,
      maxAttempts: 5,
      payload: demoMetadata(context, { scenario: input.fixture.scenario }),
      completedAt: succeeded ? context.referenceDate : null,
      cancelledAt: !succeeded && terminal ? context.referenceDate : null,
      createdAt: input.openedAt,
      updatedAt: context.referenceDate,
    });
    if (succeeded) {
      plan.recoveryAttempts.push({
        id: deterministicDemoId(
          context.runId,
          "payment-recovery-attempt",
          `${input.fixture.key}-action-${sequence}`,
        ),
        organizationId: context.organizationId,
        locationId: context.locationId,
        caseId: input.caseId,
        actionId: id,
        type: "DELIVERY",
        status: "SUCCEEDED",
        idempotencyKey: `demo:${context.runId}:recovery-attempt:${input.fixture.key}:action:${sequence}`,
        provider: DEMO_FINANCE_PROVIDER,
        metadata: demoMetadata(context, { synthetic: true }),
        occurredAt: context.referenceDate,
        createdAt: context.referenceDate,
      });
    }
  });
  plan.recoveryAttempts.push({
    id: deterministicDemoId(
      context.runId,
      "payment-recovery-attempt",
      `${input.fixture.key}-provider-failure`,
    ),
    organizationId: context.organizationId,
    locationId: context.locationId,
    caseId: input.caseId,
    type: "PROVIDER_EVENT",
    status: "FAILED",
    idempotencyKey: `demo:${context.runId}:recovery-attempt:${input.fixture.key}:provider-failure`,
    provider: DEMO_FINANCE_PROVIDER,
    providerObjectId: `aurea-demo:failure:${input.fixture.key}`,
    errorCode: "DEMO_PAYMENT_FAILED",
    errorMessage: "Synthetic provider decline.",
    metadata: demoMetadata(context),
    occurredAt: input.openedAt,
    createdAt: input.openedAt,
  });
  if (input.fixture.status === "RECOVERED") {
    plan.recoveryAttempts.push({
      id: deterministicDemoId(
        context.runId,
        "payment-recovery-attempt",
        `${input.fixture.key}-provider-success`,
      ),
      organizationId: context.organizationId,
      locationId: context.locationId,
      caseId: input.caseId,
      type: "PROVIDER_EVENT",
      status: "SUCCEEDED",
      idempotencyKey: `demo:${context.runId}:recovery-attempt:${input.fixture.key}:provider-success`,
      provider: DEMO_FINANCE_PROVIDER,
      providerObjectId: `aurea-demo:success:${input.fixture.key}`,
      metadata: demoMetadata(context),
      occurredAt: context.referenceDate,
      createdAt: context.referenceDate,
    });
  }
  if (input.fixture.status !== "EXHAUSTED") {
    plan.recoveryLinks.push({
      id: deterministicDemoId(
        context.runId,
        "payment-recovery-link",
        input.fixture.key,
      ),
      organizationId: context.organizationId,
      locationId: context.locationId,
      caseId: input.caseId,
      tokenHash: createHash("sha256")
        .update(`demo:${context.runId}:recovery-link:${input.fixture.key}`)
        .digest("hex"),
      purpose:
        input.fixture.target === "MEMBERSHIP"
          ? "UPDATE_PAYMENT"
          : "RETRY_CHECKOUT",
      expiresAt: new Date(context.referenceDate.getTime() + 14 * DAY),
      usedAt:
        input.fixture.status === "RECOVERED" ? context.referenceDate : null,
      createdBy: context.actorUserId,
      createdAt: input.openedAt,
    });
  }
}
