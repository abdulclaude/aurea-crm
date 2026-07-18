import "server-only";

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";

import { db } from "@/db";
import {
  commerceLedgerEntry,
  commerceOperation,
  stripeConnection,
} from "@/db/schema";
import {
  assertRefundAmountAvailable,
  calculateRefundAvailability,
} from "@/features/commerce/lib/refund-policy";
import type {
  RequestRefundInput,
  RequestRefundOutput,
} from "@/features/commerce/refund-contracts";
import { getStripePlatformClient } from "@/lib/stripe";

type RefundScope = {
  organizationId: string;
  locationId: string | null;
  requestedBy: string;
};

type RefundOperation = typeof commerceOperation.$inferSelect;
type OriginalPayment = typeof commerceLedgerEntry.$inferSelect;

const refundMetadataSchema = z.object({
  originalLedgerEntryId: z.string().uuid(),
  reason: z.enum(["requested_by_customer", "duplicate", "fraudulent"]),
});

const stripeFailureSchema = z
  .object({
    code: z.string().max(100).optional(),
    type: z.string().max(100).optional(),
  })
  .passthrough();

export async function requestStripeRefund(input: {
  scope: RefundScope;
  refund: RequestRefundInput;
}): Promise<RequestRefundOutput> {
  const prepared = await prepareRefundOperation(input);
  if (
    prepared.operation.providerRefundId ||
    ["SUCCEEDED", "FAILED", "CANCELLED"].includes(prepared.operation.status)
  ) {
    return refundOutput(prepared.operation);
  }

  await assertRefundStripeAccountBinding(prepared.operation);

  const stripe = getStripePlatformClient();
  let providerRefund: Stripe.Refund;
  try {
    providerRefund = await stripe.refunds.create(
      buildStripeRefundParams(prepared.operation, input.refund.reason),
      { idempotencyKey: prepared.operation.idempotencyKey },
    );
  } catch (cause: unknown) {
    const failure = stripeFailureSchema.safeParse(cause);
    await db
      .update(commerceOperation)
      .set({
        status: "REQUIRES_ACTION",
        failureCode: failure.success
          ? (failure.data.code ?? failure.data.type ?? "STRIPE_REFUND_ERROR")
          : "STRIPE_REFUND_ERROR",
        failureMessage:
          "Stripe did not confirm the refund. Retry this operation before creating another refund.",
        updatedAt: new Date(),
      })
      .where(eq(commerceOperation.id, prepared.operation.id));

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Stripe did not confirm the refund. Retry the same refund request.",
      cause,
    });
  }

  const operation = await attachProviderRefund({
    operationId: prepared.operation.id,
    providerRefundId: providerRefund.id,
    providerStatus: providerRefund.status,
  });
  return refundOutput(operation);
}

async function prepareRefundOperation(input: {
  scope: RefundScope;
  refund: RequestRefundInput;
}): Promise<{ operation: RefundOperation; original: OriginalPayment }> {
  return db.transaction(async (tx) => {
    const idempotencyKey = refundIdempotencyKey(
      input.scope.organizationId,
      input.refund.requestId,
    );
    const [existing] = await tx
      .select()
      .from(commerceOperation)
      .where(eq(commerceOperation.idempotencyKey, idempotencyKey))
      .limit(1)
      .for("update");

    const originalConditions = [
      eq(commerceLedgerEntry.id, input.refund.ledgerEntryId),
      eq(commerceLedgerEntry.organizationId, input.scope.organizationId),
      input.scope.locationId
        ? eq(commerceLedgerEntry.locationId, input.scope.locationId)
        : isNull(commerceLedgerEntry.locationId),
    ].filter((condition) => condition !== undefined);
    const [original] = await tx
      .select()
      .from(commerceLedgerEntry)
      .where(and(...originalConditions))
      .limit(1)
      .for("update");

    assertRefundablePayment(original);
    if (existing) {
      assertIdempotentRefund(existing, original, input);
      return { operation: existing, original };
    }

    const exactLocation = original.locationId
      ? eq(commerceLedgerEntry.locationId, original.locationId)
      : isNull(commerceLedgerEntry.locationId);
    const operationLocation = original.locationId
      ? eq(commerceOperation.locationId, original.locationId)
      : isNull(commerceOperation.locationId);
    const [ledgerReservations, operationReservations] = await Promise.all([
      tx
        .select({
          providerRefundId: commerceLedgerEntry.providerObjectId,
          amountMinor: commerceLedgerEntry.amountMinor,
        })
        .from(commerceLedgerEntry)
        .where(
          and(
            eq(commerceLedgerEntry.organizationId, original.organizationId),
            exactLocation,
            eq(commerceLedgerEntry.paymentIntentId, original.paymentIntentId),
            eq(commerceLedgerEntry.kind, "REFUND"),
            inArray(commerceLedgerEntry.status, ["PENDING", "SUCCEEDED"]),
          ),
        ),
      tx
        .select({
          providerRefundId: commerceOperation.providerRefundId,
          amountMinor: commerceOperation.amountMinor,
        })
        .from(commerceOperation)
        .where(
          and(
            eq(commerceOperation.organizationId, original.organizationId),
            operationLocation,
            eq(
              commerceOperation.providerPaymentIntentId,
              original.paymentIntentId,
            ),
            eq(commerceOperation.type, "REFUND"),
            inArray(commerceOperation.status, [
              "CREATED",
              "PROVIDER_PENDING",
              "REQUIRES_ACTION",
            ]),
          ),
        ),
    ]);

    try {
      assertRefundAmountAvailable(
        input.refund.amountMinor,
        calculateRefundAvailability({
          originalAmountMinor: original.amountMinor,
          ledgerReservations,
          operationReservations,
        }),
      );
    } catch (cause: unknown) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          cause instanceof Error
            ? cause.message
            : "The refund amount is not available.",
        cause,
      });
    }

    const [operation] = await tx
      .insert(commerceOperation)
      .values({
        id: randomUUID(),
        organizationId: original.organizationId,
        locationId: original.locationId,
        clientId: original.clientId,
        type: "REFUND",
        status: "CREATED",
        provider: "STRIPE",
        stripeConnectionId: original.stripeConnectionId,
        providerAccountId: original.providerAccountId,
        idempotencyKey,
        amountMinor: input.refund.amountMinor,
        currency: original.currency,
        currencyExponent: original.currencyExponent,
        invoiceId: original.invoiceId,
        bookingId: original.bookingId,
        studioBookingId: original.studioBookingId,
        membershipId: original.membershipId,
        studioPaymentId: original.studioPaymentId,
        providerPaymentIntentId: original.paymentIntentId,
        requestedBy: input.scope.requestedBy,
        metadata: {
          originalLedgerEntryId: original.id,
          reason: input.refund.reason,
        },
        updatedAt: new Date(),
      })
      .returning();
    if (!operation) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "The refund operation could not be created.",
      });
    }
    return { operation, original };
  });
}

async function assertRefundStripeAccountBinding(
  operation: RefundOperation,
): Promise<void> {
  if (!operation.stripeConnectionId || !operation.providerAccountId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This payment has no workspace Stripe account binding.",
    });
  }

  const connection = await db.query.stripeConnection.findFirst({
    where: and(
      eq(stripeConnection.id, operation.stripeConnectionId),
      eq(stripeConnection.organizationId, operation.organizationId),
      operation.locationId
        ? eq(stripeConnection.locationId, operation.locationId)
        : isNull(stripeConnection.locationId),
      eq(stripeConnection.stripeAccountId, operation.providerAccountId),
    ),
    columns: { accountType: true },
  });
  if (!connection || connection.accountType.toLowerCase() !== "express") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The payment's scoped Stripe Express account is unavailable.",
    });
  }
}

function assertRefundablePayment(
  payment: OriginalPayment | undefined,
): asserts payment is OriginalPayment & { paymentIntentId: string } {
  if (!payment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The payment was not found in this workspace.",
    });
  }
  if (
    payment.provider !== "STRIPE" ||
    payment.kind !== "PAYMENT" ||
    !["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payment.status) ||
    !payment.paymentIntentId
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This ledger entry is not an available Stripe payment.",
    });
  }
}

function assertIdempotentRefund(
  operation: RefundOperation,
  original: OriginalPayment & { paymentIntentId: string },
  input: { scope: RefundScope; refund: RequestRefundInput },
): void {
  const metadata = refundMetadataSchema.safeParse(operation.metadata);
  if (
    operation.type !== "REFUND" ||
    operation.organizationId !== input.scope.organizationId ||
    operation.locationId !== original.locationId ||
    operation.stripeConnectionId !== original.stripeConnectionId ||
    operation.providerPaymentIntentId !== original.paymentIntentId ||
    operation.amountMinor !== input.refund.amountMinor ||
    operation.currency !== original.currency ||
    !metadata.success ||
    metadata.data.originalLedgerEntryId !== original.id ||
    metadata.data.reason !== input.refund.reason
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This refund request ID was already used for another refund.",
    });
  }
}

function buildStripeRefundParams(
  operation: RefundOperation,
  reason: RequestRefundInput["reason"],
): Stripe.RefundCreateParams {
  if (!operation.providerPaymentIntentId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The original payment does not have a Stripe payment reference.",
    });
  }
  if (!operation.stripeConnectionId || !operation.providerAccountId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The original payment has no historical Stripe account binding.",
    });
  }
  return {
    payment_intent: operation.providerPaymentIntentId,
    amount: operation.amountMinor,
    reason,
    metadata: {
      commerceOperationId: operation.id,
      stripeConnectionId: operation.stripeConnectionId,
      organizationId: operation.organizationId,
      ...(operation.locationId ? { locationId: operation.locationId } : {}),
    },
    reverse_transfer: true,
    refund_application_fee: true,
  };
}

async function attachProviderRefund(input: {
  operationId: string;
  providerRefundId: string;
  providerStatus: string | null;
}): Promise<RefundOperation> {
  const status = input.providerStatus === "failed" ? "FAILED" : "PROVIDER_PENDING";
  const [updated] = await db
    .update(commerceOperation)
    .set({
      providerRefundId: input.providerRefundId,
      status,
      failureCode: status === "FAILED" ? "STRIPE_REFUND_FAILED" : null,
      failureMessage:
        status === "FAILED" ? "Stripe reported that the refund failed." : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(commerceOperation.id, input.operationId),
        inArray(commerceOperation.status, [
          "CREATED",
          "PROVIDER_PENDING",
          "REQUIRES_ACTION",
        ]),
        or(
          isNull(commerceOperation.providerRefundId),
          eq(commerceOperation.providerRefundId, input.providerRefundId),
        ),
      ),
    )
    .returning();
  if (updated) return updated;

  const existing = await db.query.commerceOperation.findFirst({
    where: eq(commerceOperation.id, input.operationId),
  });
  if (!existing || existing.providerRefundId !== input.providerRefundId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The Stripe refund reference could not be attached safely.",
    });
  }
  return existing;
}

function refundIdempotencyKey(
  organizationId: string,
  requestId: string,
): string {
  return `refund:${organizationId}:${requestId}`;
}

function refundOutput(operation: RefundOperation): RequestRefundOutput {
  return {
    operationId: operation.id,
    providerRefundId: operation.providerRefundId,
    status: operation.status,
  };
}
