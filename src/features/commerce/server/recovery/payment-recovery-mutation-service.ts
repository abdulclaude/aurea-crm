import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, max, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  paymentRecoveryAction,
  paymentRecoveryAttempt,
  paymentRecoveryCase,
} from "@/db/schema";
import type { CommerceTransaction } from "@/features/commerce/server/stripe/stripe-event-receipt";

import {
  exactRecoveryLocation,
  type PaymentRecoveryScope,
} from "./payment-recovery-access";
import { isAssignableRecoveryOwner } from "./payment-recovery-query-service";

export async function retryPaymentRecoveryAction(input: {
  scope: PaymentRecoveryScope;
  actorUserId: string;
  caseId: string;
  actionId: string;
}): Promise<{ queued: true; actionId: string }> {
  return db.transaction(async (tx) => {
    const selectedCase = await lockScopedCase(tx, input.scope, input.caseId);
    assertOperableCase(selectedCase);
    const [action] = await tx
      .select()
      .from(paymentRecoveryAction)
      .where(
        and(
          eq(paymentRecoveryAction.id, input.actionId),
          eq(paymentRecoveryAction.caseId, input.caseId),
          eq(paymentRecoveryAction.organizationId, input.scope.organizationId),
          exactRecoveryLocation(
            paymentRecoveryAction.locationId,
            input.scope.locationId,
          ),
        ),
      )
      .for("update");
    if (!action) notFound("Recovery action");
    if (action.status !== "FAILED") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Only a failed recovery action can be retried.",
      });
    }
    if (action.lastErrorCode === "ACTION_SIDE_EFFECT_AMBIGUOUS") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Reconcile the provider outcome before creating a deliberate replacement action.",
      });
    }
    if (action.attemptCount >= 20) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This action reached the maximum retry limit.",
      });
    }
    const now = new Date();
    await tx
      .update(paymentRecoveryAction)
      .set({
        status: "SCHEDULED",
        availableAt: now,
        scheduledAt: now,
        maxAttempts: Math.max(action.maxAttempts, action.attemptCount + 1),
        completedAt: null,
        cancelledAt: null,
        claimToken: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: now,
      })
      .where(eq(paymentRecoveryAction.id, action.id));
    await markCaseInProgress(tx, input.scope, input.caseId, now);
    await recordOperatorAttempt(tx, {
      ...input,
      actionId: action.id,
      action: "RETRY_ACTION",
      now,
    });
    return { queued: true, actionId: action.id };
  });
}

export async function resendPaymentRecovery(input: {
  scope: PaymentRecoveryScope;
  actorUserId: string;
  caseId: string;
  channel: "EMAIL" | "SMS";
}): Promise<{ queued: true; actionId: string }> {
  return db.transaction(async (tx) => {
    const selectedCase = await lockScopedCase(tx, input.scope, input.caseId);
    assertOperableCase(selectedCase);
    const [sequenceRow] = await tx
      .select({ sequence: max(paymentRecoveryAction.sequence) })
      .from(paymentRecoveryAction)
      .where(eq(paymentRecoveryAction.caseId, input.caseId));
    const now = new Date();
    const actionId = createId();
    await tx.insert(paymentRecoveryAction).values({
      id: actionId,
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
      caseId: input.caseId,
      type: input.channel === "EMAIL" ? "SEND_EMAIL" : "SEND_SMS",
      status: "SCHEDULED",
      sequence: (sequenceRow?.sequence ?? 0) + 1,
      idempotencyKey: `recovery:${input.caseId}:operator:${actionId}`,
      scheduledAt: now,
      availableAt: now,
      maxAttempts: 5,
      payload: { requestedBy: input.actorUserId, channel: input.channel },
      createdAt: now,
      updatedAt: now,
    });
    await markCaseInProgress(tx, input.scope, input.caseId, now);
    await recordOperatorAttempt(tx, {
      ...input,
      actionId,
      action: `RESEND_${input.channel}`,
      now,
    });
    return { queued: true, actionId };
  });
}

export async function reassignPaymentRecoveryCase(input: {
  scope: PaymentRecoveryScope;
  actorUserId: string;
  caseId: string;
  ownerUserId: string | null;
}): Promise<{ caseId: string; ownerUserId: string | null }> {
  if (
    input.ownerUserId &&
    !(await isAssignableRecoveryOwner(input.scope, input.ownerUserId))
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The selected owner is not a member of this workspace scope.",
    });
  }
  return db.transaction(async (tx) => {
    const selectedCase = await lockScopedCase(tx, input.scope, input.caseId);
    if (!selectedCase) notFound("Recovery case");
    const now = new Date();
    await tx
      .update(paymentRecoveryCase)
      .set({ ownerUserId: input.ownerUserId, updatedAt: now })
      .where(eq(paymentRecoveryCase.id, input.caseId));
    await recordOperatorAttempt(tx, {
      ...input,
      actionId: null,
      action: "REASSIGN_CASE",
      now,
      metadata: { ownerUserId: input.ownerUserId },
    });
    return { caseId: input.caseId, ownerUserId: input.ownerUserId };
  });
}

export async function cancelPaymentRecoveryCase(input: {
  scope: PaymentRecoveryScope;
  actorUserId: string;
  caseId: string;
}): Promise<{ cancelled: true; caseId: string }> {
  return db.transaction(async (tx) => {
    const selectedCase = await lockScopedCase(tx, input.scope, input.caseId);
    assertOperableCase(selectedCase);
    const now = new Date();
    const activeActions = await tx
      .select({
        id: paymentRecoveryAction.id,
        status: paymentRecoveryAction.status,
      })
      .from(paymentRecoveryAction)
      .where(
        and(
          eq(paymentRecoveryAction.caseId, input.caseId),
          eq(paymentRecoveryAction.organizationId, input.scope.organizationId),
          exactRecoveryLocation(
            paymentRecoveryAction.locationId,
            input.scope.locationId,
          ),
          inArray(paymentRecoveryAction.status, ["SCHEDULED", "PROCESSING"]),
        ),
      )
      .for("update");
    if (activeActions.some((action) => action.status === "PROCESSING")) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Wait for the in-progress recovery action before cancelling this case.",
      });
    }
    await tx
      .update(paymentRecoveryCase)
      .set({
        status: "CANCELLED",
        nextActionAt: null,
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(paymentRecoveryCase.id, input.caseId));
    await tx
      .update(paymentRecoveryAction)
      .set({
        status: "CANCELLED",
        cancelledAt: now,
        claimToken: null,
        leaseExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(paymentRecoveryAction.caseId, input.caseId),
          eq(paymentRecoveryAction.organizationId, input.scope.organizationId),
          exactRecoveryLocation(
            paymentRecoveryAction.locationId,
            input.scope.locationId,
          ),
          eq(paymentRecoveryAction.status, "SCHEDULED"),
        ),
      );
    await recordOperatorAttempt(tx, {
      ...input,
      actionId: null,
      action: "CANCEL_CASE",
      now,
    });
    return { cancelled: true, caseId: input.caseId };
  });
}

async function lockScopedCase(
  tx: CommerceTransaction,
  scope: PaymentRecoveryScope,
  caseId: string,
) {
  const [selected] = await tx
    .select({ id: paymentRecoveryCase.id, status: paymentRecoveryCase.status })
    .from(paymentRecoveryCase)
    .where(
      and(
        eq(paymentRecoveryCase.id, caseId),
        eq(paymentRecoveryCase.organizationId, scope.organizationId),
        exactRecoveryLocation(paymentRecoveryCase.locationId, scope.locationId),
      ),
    )
    .for("update");
  return selected;
}

function assertOperableCase(
  selected: Awaited<ReturnType<typeof lockScopedCase>>,
): asserts selected is NonNullable<Awaited<ReturnType<typeof lockScopedCase>>> {
  if (!selected) notFound("Recovery case");
  if (
    selected.status !== "OPEN" &&
    selected.status !== "IN_PROGRESS" &&
    selected.status !== "EXHAUSTED"
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This recovery case is already closed.",
    });
  }
}

async function markCaseInProgress(
  tx: CommerceTransaction,
  scope: PaymentRecoveryScope,
  caseId: string,
  now: Date,
): Promise<void> {
  await tx
    .update(paymentRecoveryCase)
    .set({
      status: "IN_PROGRESS",
      nextActionAt: now,
      exhaustedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(paymentRecoveryCase.id, caseId),
        eq(paymentRecoveryCase.organizationId, scope.organizationId),
        exactRecoveryLocation(paymentRecoveryCase.locationId, scope.locationId),
      ),
    );
}

async function recordOperatorAttempt(
  tx: CommerceTransaction,
  input: {
    scope: PaymentRecoveryScope;
    actorUserId: string;
    caseId: string;
    actionId: string | null;
    action: string;
    now: Date;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const id = createId();
  await tx.insert(paymentRecoveryAttempt).values({
    id,
    organizationId: input.scope.organizationId,
    locationId: input.scope.locationId,
    caseId: input.caseId,
    actionId: input.actionId,
    type: "OPERATOR",
    status: "SUCCEEDED",
    idempotencyKey: `recovery:${input.caseId}:operator-attempt:${id}`,
    occurredAt: input.now,
    metadata: {
      action: input.action,
      actorUserId: input.actorUserId,
      ...input.metadata,
    },
  });
}

function notFound(resource: string): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: `${resource} was not found.`,
  });
}
