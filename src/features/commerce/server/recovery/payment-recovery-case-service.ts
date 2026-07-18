import "server-only";

import { randomUUID } from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";

import {
  paymentRecoveryAction,
  paymentRecoveryAttempt,
  paymentRecoveryCase,
} from "@/db/schema";
import type { CommerceTransaction } from "@/features/commerce/server/stripe/stripe-event-receipt";

import {
  resolveEffectivePaymentRecoveryPolicy,
  type PaymentRecoveryTarget,
} from "./payment-recovery-policy";

const DAY_MS = 24 * 60 * 60 * 1000;

type RecoveryResource = {
  invoiceId?: string | null;
  membershipId?: string | null;
  bookingId?: string | null;
  studioBookingId?: string | null;
};

type OpenRecoveryCaseInput = RecoveryResource & {
  tx: CommerceTransaction;
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  target: PaymentRecoveryTarget;
  caseKey: string;
  sourceEventId?: string | null;
  sourceEventAt: Date;
  attemptKey: string;
  amountMinor: number;
  currency: string;
  currencyExponent: number;
  studioPaymentId?: string | null;
  commerceOperationId?: string | null;
  provider: string;
  providerAccountRef?: string | null;
  stripeConnectionId?: string | null;
  providerObjectId?: string | null;
  errorCode: string;
  errorMessage: string;
  operatorReviewOnly?: boolean;
  metadata?: Record<string, unknown>;
};

export async function openPaymentRecoveryCase(
  input: OpenRecoveryCaseInput,
): Promise<{ caseId: string; duplicate: boolean }> {
  const policy = await resolveEffectivePaymentRecoveryPolicy({
    tx: input.tx,
    organizationId: input.organizationId,
    locationId: input.locationId,
    target: input.target,
  });
  const policyEnabled = policy?.mode === "ENABLED";
  const caseDisabled = policy?.mode === "DISABLED" && !input.operatorReviewOnly;
  const now = new Date();
  const [created] = await input.tx
    .insert(paymentRecoveryCase)
    .values({
      id: randomUUID(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: input.clientId,
      target: input.target,
      status: caseDisabled ? "CANCELLED" : "OPEN",
      caseKey: input.caseKey,
      policyId: policy?.id,
      policyVersion: policy?.version,
      policySnapshot: policy ?? {},
      invoiceId: input.invoiceId,
      membershipId: input.membershipId,
      bookingId: input.bookingId,
      studioBookingId: input.studioBookingId,
      studioPaymentId: input.studioPaymentId,
      commerceOperationId: input.commerceOperationId,
      provider: input.provider,
      providerAccountRef: input.providerAccountRef,
      stripeConnectionId: input.stripeConnectionId,
      providerObjectId: input.providerObjectId,
      sourceEventId: input.sourceEventId,
      sourceEventAt: input.sourceEventAt,
      amountMinor: input.amountMinor,
      currency: input.currency,
      currencyExponent: input.currencyExponent,
      attemptCount: 0,
      nextActionAt:
        policyEnabled && !input.operatorReviewOnly ? input.sourceEventAt : null,
      lastErrorCode: input.errorCode,
      lastErrorMessage: input.errorMessage,
      metadata: input.metadata ?? {},
      openedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: paymentRecoveryCase.caseKey })
    .returning({ id: paymentRecoveryCase.id });

  const [selected] = await input.tx
    .select()
    .from(paymentRecoveryCase)
    .where(eq(paymentRecoveryCase.caseKey, input.caseKey))
    .for("update");
  if (!selected) {
    throw new Error("Payment recovery case conflict could not be resolved");
  }

  const stale = input.sourceEventAt < selected.sourceEventAt;
  const [attempt] = await input.tx
    .insert(paymentRecoveryAttempt)
    .values({
      id: randomUUID(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      caseId: selected.id,
      type: "PROVIDER_EVENT",
      status: stale ? "IGNORED" : "FAILED",
      idempotencyKey: input.attemptKey,
      provider: input.provider,
      providerAccountRef: input.providerAccountRef,
      stripeConnectionId: input.stripeConnectionId,
      providerObjectId: input.providerObjectId,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      occurredAt: input.sourceEventAt,
      metadata: input.metadata ?? {},
    })
    .onConflictDoNothing({ target: paymentRecoveryAttempt.idempotencyKey })
    .returning({ id: paymentRecoveryAttempt.id });

  if (!attempt || stale) {
    return { caseId: selected.id, duplicate: !attempt };
  }

  await input.tx
    .update(paymentRecoveryCase)
    .set({
      status: caseDisabled ? "CANCELLED" : "IN_PROGRESS",
      policyId: policy?.id ?? selected.policyId,
      policyVersion: policy?.version ?? selected.policyVersion,
      policySnapshot: policy ?? selected.policySnapshot,
      sourceEventId: input.sourceEventId,
      sourceEventAt: input.sourceEventAt,
      studioPaymentId: input.studioPaymentId ?? selected.studioPaymentId,
      commerceOperationId:
        input.commerceOperationId ?? selected.commerceOperationId,
      provider: input.provider,
      providerAccountRef: input.providerAccountRef ?? null,
      stripeConnectionId: input.stripeConnectionId ?? null,
      providerObjectId: input.providerObjectId ?? selected.providerObjectId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      currencyExponent: input.currencyExponent,
      attemptCount: sql`${paymentRecoveryCase.attemptCount} + 1`,
      nextActionAt:
        policyEnabled && !input.operatorReviewOnly ? input.sourceEventAt : null,
      lastErrorCode: input.errorCode,
      lastErrorMessage: input.errorMessage,
      recoveredAt: null,
      exhaustedAt: null,
      cancelledAt: caseDisabled ? now : null,
      updatedAt: now,
    })
    .where(eq(paymentRecoveryCase.id, selected.id));

  if (policyEnabled && !input.operatorReviewOnly) {
    const workflowOffset =
      input.target === "MEMBERSHIP" && input.studioPaymentId ? 1 : 0;
    if (workflowOffset === 1) {
      await input.tx
        .insert(paymentRecoveryAction)
        .values({
          id: randomUUID(),
          organizationId: input.organizationId,
          locationId: input.locationId,
          caseId: selected.id,
          type: "DISPATCH_WORKFLOW",
          status: "SCHEDULED",
          sequence: 1,
          idempotencyKey: `recovery:${selected.id}:payment-workflow:${input.studioPaymentId}`,
          scheduledAt: input.sourceEventAt,
          availableAt: input.sourceEventAt,
          maxAttempts: 5,
          payload: { studioPaymentId: input.studioPaymentId },
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing({ target: paymentRecoveryAction.idempotencyKey });
    }
    if (input.target === "MEMBERSHIP") {
      const graceEndsAt = new Date(
        input.sourceEventAt.getTime() + policy.gracePeriodDays * DAY_MS,
      );
      await input.tx
        .insert(paymentRecoveryAction)
        .values({
          id: randomUUID(),
          organizationId: input.organizationId,
          locationId: input.locationId,
          caseId: selected.id,
          type: "GRACE_PERIOD_END",
          status: "SCHEDULED",
          sequence: 99,
          idempotencyKey: `recovery:${selected.id}:v${policy.version}:grace-period-end`,
          scheduledAt: graceEndsAt,
          availableAt: graceEndsAt,
          maxAttempts: 5,
          payload: { membershipId: input.membershipId },
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing({ target: paymentRecoveryAction.idempotencyKey });
    }
    await schedulePolicyActions({
      tx: input.tx,
      caseId: selected.id,
      organizationId: input.organizationId,
      locationId: input.locationId,
      sourceEventAt: input.sourceEventAt,
      policy,
      sequenceOffset: workflowOffset,
    });
  }

  return { caseId: selected.id, duplicate: false };
}

export async function resolvePaymentRecoveryCases(input: {
  tx: CommerceTransaction;
  organizationId: string;
  locationId: string | null;
  target: PaymentRecoveryTarget;
  resource: RecoveryResource;
  sourceEventId?: string | null;
  occurredAt: Date;
  attemptKey: string;
  provider: string;
  providerAccountRef?: string | null;
  stripeConnectionId?: string | null;
  providerObjectId?: string | null;
}): Promise<number> {
  const resourceCondition = recoveryResourceCondition(input.resource);
  const cases = await input.tx
    .select()
    .from(paymentRecoveryCase)
    .where(
      and(
        eq(paymentRecoveryCase.organizationId, input.organizationId),
        input.locationId
          ? eq(paymentRecoveryCase.locationId, input.locationId)
          : sql`${paymentRecoveryCase.locationId} IS NULL`,
        eq(paymentRecoveryCase.target, input.target),
        inArray(paymentRecoveryCase.status, ["OPEN", "IN_PROGRESS"]),
        resourceCondition,
      ),
    )
    .for("update");

  let resolved = 0;
  for (const selected of cases) {
    const stale = input.occurredAt < selected.sourceEventAt;
    const [attempt] = await input.tx
      .insert(paymentRecoveryAttempt)
      .values({
        id: randomUUID(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        caseId: selected.id,
        type: "PROVIDER_EVENT",
        status: stale ? "IGNORED" : "SUCCEEDED",
        idempotencyKey: `${input.attemptKey}:${selected.id}`,
        provider: input.provider,
        providerAccountRef: input.providerAccountRef,
        stripeConnectionId: input.stripeConnectionId,
        providerObjectId: input.providerObjectId,
        occurredAt: input.occurredAt,
      })
      .onConflictDoNothing({ target: paymentRecoveryAttempt.idempotencyKey })
      .returning({ id: paymentRecoveryAttempt.id });
    if (!attempt || stale) continue;

    await input.tx
      .update(paymentRecoveryCase)
      .set({
        status: "RECOVERED",
        sourceEventId: input.sourceEventId,
        sourceEventAt: input.occurredAt,
        providerObjectId: input.providerObjectId ?? selected.providerObjectId,
        nextActionAt: null,
        recoveredAt: input.occurredAt,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(paymentRecoveryCase.id, selected.id));
    await input.tx
      .update(paymentRecoveryAction)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        claimToken: null,
        leaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentRecoveryAction.caseId, selected.id),
          inArray(paymentRecoveryAction.status, ["SCHEDULED", "PROCESSING"]),
        ),
      );
    resolved += 1;
  }

  return resolved;
}

function recoveryResourceCondition(resource: RecoveryResource) {
  if (resource.invoiceId) {
    return eq(paymentRecoveryCase.invoiceId, resource.invoiceId);
  }
  if (resource.membershipId) {
    return eq(paymentRecoveryCase.membershipId, resource.membershipId);
  }
  if (resource.bookingId) {
    return eq(paymentRecoveryCase.bookingId, resource.bookingId);
  }
  if (resource.studioBookingId) {
    return eq(paymentRecoveryCase.studioBookingId, resource.studioBookingId);
  }
  throw new Error("Payment recovery resource is missing");
}

async function schedulePolicyActions(input: {
  tx: CommerceTransaction;
  caseId: string;
  organizationId: string;
  locationId: string | null;
  sourceEventAt: Date;
  policy: NonNullable<
    Awaited<ReturnType<typeof resolveEffectivePaymentRecoveryPolicy>>
  >;
  sequenceOffset: number;
}): Promise<void> {
  const actions = input.policy.scheduleDays
    .slice(0, input.policy.maxActions)
    .map((day, index) => {
      const availableAt = new Date(
        input.sourceEventAt.getTime() + day * DAY_MS,
      );
      return {
        id: randomUUID(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        caseId: input.caseId,
        type: input.policy.steps[index]?.type ?? "SEND_EMAIL",
        status: "SCHEDULED" as const,
        sequence: index + 1 + input.sequenceOffset,
        idempotencyKey: `recovery:${input.caseId}:v${input.policy.version}:step:${index + 1 + input.sequenceOffset}`,
        scheduledAt: availableAt,
        availableAt,
        maxAttempts: 5,
        payload: {
          policyId: input.policy.id,
          policyVersion: input.policy.version,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
  if (actions.length === 0) return;

  await input.tx
    .insert(paymentRecoveryAction)
    .values(actions)
    .onConflictDoNothing({ target: paymentRecoveryAction.idempotencyKey });
}
