import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import {
  cancellationCharge,
  commerceLedgerEntry,
  commerceOperation,
  stripeConnection,
} from "@/db/schema";
import { normalizeCurrency } from "@/features/commerce/lib/money";
import { cancellationPaymentIntentCanBeCancelled } from "@/features/studio/lib/cancellation-payment-attempt-rules";
import { getStripePlatformClient } from "@/lib/stripe";

import { exactCancellationLocation } from "./cancellation-access";

const FUNDED_LEDGER_STATUSES = [
  "SUCCEEDED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "DISPUTED",
  "WON",
  "LOST",
] as const;

export async function cancelUnpaidCancellationPaymentIntent(input: {
  organizationId: string;
  locationId: string | null;
  chargeId: string;
}): Promise<{ readyForWaiver: true }> {
  const attempt = await loadPaymentAttempt(input);
  if (!attempt.paymentIntentId) return { readyForWaiver: true };
  if (!attempt.operationId || !attempt.providerAccountId) {
    throw unsafeAttemptError();
  }
  const confirmedAttempt = {
    ...attempt,
    operationId: attempt.operationId,
    paymentIntentId: attempt.paymentIntentId,
  };

  await assertNoFundedPayment(
    confirmedAttempt.operationId,
    confirmedAttempt.paymentIntentId,
  );

  const stripe = getStripePlatformClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(
    attempt.paymentIntentId,
  );
  assertPaymentIntentMatchesAttempt(paymentIntent, confirmedAttempt);

  let terminalIntent = paymentIntent;
  if (paymentIntent.status !== "canceled") {
    if (!cancellationPaymentIntentCanBeCancelled(paymentIntent.status)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "This Stripe payment is not safely cancelable. Reconcile or refund it before waiving the fee.",
      });
    }
    terminalIntent = await stripe.paymentIntents.cancel(
      paymentIntent.id,
      {},
      {
        idempotencyKey: `cancel-cancellation-charge:${input.chargeId}:${paymentIntent.id}`,
      },
    );
    assertPaymentIntentMatchesAttempt(terminalIntent, confirmedAttempt);
  }
  if (terminalIntent.status !== "canceled") throw unsafeAttemptError();

  await finalizeCancelledAttempt(input, confirmedAttempt);
  return { readyForWaiver: true };
}

type PaymentAttempt = {
  chargeId: string;
  paymentIntentId: string | null;
  operationId: string | null;
  providerAccountId: string | null;
  amountMinor: number | null;
  currency: string | null;
};

async function loadPaymentAttempt(input: {
  organizationId: string;
  locationId: string | null;
  chargeId: string;
}): Promise<PaymentAttempt> {
  const [record] = await db
    .select({
      chargeId: cancellationCharge.id,
      paymentIntentId: cancellationCharge.stripePaymentIntentId,
      operationId: commerceOperation.id,
      operationPaymentIntentId: commerceOperation.providerPaymentIntentId,
      providerAccountId: commerceOperation.providerAccountId,
      amountMinor: commerceOperation.amountMinor,
      currency: commerceOperation.currency,
      connectionAccountId: stripeConnection.stripeAccountId,
    })
    .from(cancellationCharge)
    .leftJoin(
      commerceOperation,
      and(
        eq(commerceOperation.id, cancellationCharge.commerceOperationId),
        eq(commerceOperation.organizationId, cancellationCharge.organizationId),
        sql`${commerceOperation.locationId} IS NOT DISTINCT FROM ${cancellationCharge.locationId}`,
        eq(commerceOperation.type, "PAYMENT"),
        eq(commerceOperation.provider, "STRIPE"),
      ),
    )
    .leftJoin(
      stripeConnection,
      and(
        eq(stripeConnection.id, cancellationCharge.stripeConnectionId),
        eq(stripeConnection.organizationId, cancellationCharge.organizationId),
        sql`${stripeConnection.locationId} IS NOT DISTINCT FROM ${cancellationCharge.locationId}`,
        eq(stripeConnection.accountType, "express"),
      ),
    )
    .where(
      and(
        eq(cancellationCharge.id, input.chargeId),
        eq(cancellationCharge.organizationId, input.organizationId),
        exactCancellationLocation(
          cancellationCharge.locationId,
          input.locationId,
        ),
      ),
    )
    .limit(1);
  if (!record) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Cancellation charge not found.",
    });
  }
  if (
    record.paymentIntentId &&
    (!record.operationId ||
      record.operationPaymentIntentId !== record.paymentIntentId ||
      !record.providerAccountId ||
      record.connectionAccountId !== record.providerAccountId)
  ) {
    throw unsafeAttemptError();
  }
  return record;
}

async function assertNoFundedPayment(
  operationId: string,
  paymentIntentId: string,
): Promise<void> {
  const funded = await db.query.commerceLedgerEntry.findFirst({
    where: and(
      eq(commerceLedgerEntry.operationId, operationId),
      eq(commerceLedgerEntry.paymentIntentId, paymentIntentId),
      eq(commerceLedgerEntry.kind, "PAYMENT"),
      inArray(commerceLedgerEntry.status, [...FUNDED_LEDGER_STATUSES]),
    ),
    columns: { id: true },
  });
  if (funded) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This fee has a funded payment and must use the refund flow.",
    });
  }
}

function assertPaymentIntentMatchesAttempt(
  paymentIntent: Stripe.PaymentIntent,
  attempt: PaymentAttempt,
): void {
  const expandableDestination = paymentIntent.transfer_data?.destination;
  const destination =
    typeof expandableDestination === "string"
      ? expandableDestination
      : (expandableDestination?.id ?? null);
  if (
    paymentIntent.id !== attempt.paymentIntentId ||
    paymentIntent.amount !== attempt.amountMinor ||
    normalizeCurrency(paymentIntent.currency) !== attempt.currency ||
    destination !== attempt.providerAccountId
  ) {
    throw unsafeAttemptError();
  }
}

async function finalizeCancelledAttempt(
  input: {
    organizationId: string;
    locationId: string | null;
    chargeId: string;
  },
  attempt: PaymentAttempt & { operationId: string; paymentIntentId: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    const [lockedOperation] = await tx
      .select({
        status: commerceOperation.status,
        paymentIntentId: commerceOperation.providerPaymentIntentId,
      })
      .from(commerceOperation)
      .where(eq(commerceOperation.id, attempt.operationId))
      .limit(1)
      .for("update");
    if (
      !lockedOperation ||
      lockedOperation.paymentIntentId !== attempt.paymentIntentId ||
      ![
        "CREATED",
        "PROVIDER_PENDING",
        "REQUIRES_ACTION",
        "FAILED",
        "CANCELLED",
      ].includes(lockedOperation.status)
    ) {
      throw unsafeAttemptError();
    }

    const [locked] = await tx
      .select({
        operationId: cancellationCharge.commerceOperationId,
        paymentIntentId: cancellationCharge.stripePaymentIntentId,
      })
      .from(cancellationCharge)
      .where(
        and(
          eq(cancellationCharge.id, input.chargeId),
          eq(cancellationCharge.organizationId, input.organizationId),
          exactCancellationLocation(
            cancellationCharge.locationId,
            input.locationId,
          ),
        ),
      )
      .limit(1)
      .for("update");
    if (
      !locked ||
      locked.operationId !== attempt.operationId ||
      locked.paymentIntentId !== attempt.paymentIntentId
    ) {
      throw unsafeAttemptError();
    }

    const funded = await tx.query.commerceLedgerEntry.findFirst({
      where: and(
        eq(commerceLedgerEntry.operationId, attempt.operationId),
        eq(commerceLedgerEntry.paymentIntentId, attempt.paymentIntentId),
        eq(commerceLedgerEntry.kind, "PAYMENT"),
        inArray(commerceLedgerEntry.status, [...FUNDED_LEDGER_STATUSES]),
      ),
      columns: { id: true },
    });
    if (funded) throw unsafeAttemptError();

    const [cancelledOperation] = await tx
      .update(commerceOperation)
      .set({
        status: "CANCELLED",
        completedAt: new Date(),
        failureCode: "PAYMENT_ATTEMPT_CANCELLED",
        failureMessage: "The unpaid Stripe payment attempt was cancelled.",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commerceOperation.id, attempt.operationId),
          eq(
            commerceOperation.providerPaymentIntentId,
            attempt.paymentIntentId,
          ),
          inArray(commerceOperation.status, [
            "CREATED",
            "PROVIDER_PENDING",
            "REQUIRES_ACTION",
            "FAILED",
          ]),
        ),
      )
      .returning({ id: commerceOperation.id });
    if (!cancelledOperation && lockedOperation.status !== "CANCELLED") {
      throw unsafeAttemptError();
    }
    await tx
      .update(cancellationCharge)
      .set({
        status: "FAILED",
        stripePaymentIntentId: null,
        failureCode: "PAYMENT_ATTEMPT_CANCELLED",
        failureMessage: "The unpaid Stripe payment attempt was cancelled.",
        updatedAt: new Date(),
      })
      .where(eq(cancellationCharge.id, input.chargeId));
  });
}

function unsafeAttemptError(): TRPCError {
  return new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      "The Stripe payment attempt could not be proven unpaid and safely canceled.",
  });
}
