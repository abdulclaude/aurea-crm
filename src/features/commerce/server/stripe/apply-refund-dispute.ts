import "server-only";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import {
  booking,
  cancellationCharge,
  commerceLedgerEntry,
  commerceOperation,
  studioPayment,
  studioBooking,
  studioClass,
} from "@/db/schema";
import { normalizeCurrency } from "@/features/commerce/lib/money";
import {
  DISPUTE_ORIGINAL_PAYMENT_STATUSES,
  REFUND_ORIGINAL_PAYMENT_STATUSES,
} from "@/features/commerce/lib/refund-original-policy";

import { writeCommerceLedgerEntry } from "../ledger-writer";
import {
  completeCommerceOperation,
  resolveRefundOperationForStripeEvent,
} from "../operations";
import { PermanentStripeEventError } from "./stripe-event-contract";
import type { CommerceTransaction } from "./stripe-event-receipt";
import { requireHistoricalStripeConnection } from "./stripe-connection-binding";
import {
  expandableId,
  metadataValue,
  type disputeSchema,
  type refundSchema,
} from "./stripe-object-contracts";

type StripeRefund = z.infer<typeof refundSchema>;
type StripeDispute = z.infer<typeof disputeSchema>;
type OriginalLedger = typeof commerceLedgerEntry.$inferSelect;

const refundOperationMetadataSchema = z.object({
  originalLedgerEntryId: z.string().uuid(),
});

export async function applyStripeRefund(input: {
  tx: CommerceTransaction;
  refund: StripeRefund;
  receiptId: string;
  providerAccountId: string | null;
  occurredAt: Date;
}): Promise<{
  organizationId: string;
  locationId: string | null;
  stripeConnectionId: string;
} | null> {
  const paymentIntentId = expandableId(input.refund.payment_intent);
  const chargeId = expandableId(input.refund.charge);
  const original = await findOriginalPayment(input.tx, {
    paymentIntentId,
    chargeId,
    statuses: [...REFUND_ORIGINAL_PAYMENT_STATUSES],
  });
  if (!original) return null;
  const connection = await requireHistoricalStripeConnection({
    tx: input.tx,
    stripeConnectionId: original.stripeConnectionId,
    organizationId: original.organizationId,
    locationId: original.locationId,
    providerAccountId: original.providerAccountId,
    eventAccountId: input.providerAccountId,
    requireExternalSnapshot: true,
  });
  if (normalizeCurrency(input.refund.currency) !== original.currency) {
    throw new PermanentStripeEventError(
      "REFUND_CURRENCY_MISMATCH",
      "Stripe refund currency does not match the original ledger entry",
    );
  }

  const operation = await resolveRefundOperationForStripeEvent({
    tx: input.tx,
    operationId: metadataValue(input.refund.metadata, "commerceOperationId"),
    providerRefundId: input.refund.id,
  });
  if (operation) {
    assertRefundOperationMatches(operation, original, input.refund);
  }

  const status = refundStatus(input.refund.status);
  const refundLedger = await writeCommerceLedgerEntry(input.tx, {
    organizationId: original.organizationId,
    locationId: original.locationId,
    operationId: operation?.id ?? null,
    provider: "STRIPE",
    stripeConnectionId: connection.id,
    providerAccountId: connection.stripeAccountId,
    providerObjectId: input.refund.id,
    providerObjectType: "refund",
    kind: "REFUND",
    status,
    paymentIntentId: paymentIntentId ?? original.paymentIntentId,
    chargeId: chargeId ?? original.chargeId,
    amountMinor: input.refund.amount,
    currency: input.refund.currency,
    currencyExponent: original.currencyExponent,
    clientId: original.clientId,
    membershipId: original.membershipId,
    bookingId: original.bookingId,
    studioBookingId: original.studioBookingId,
    invoiceId: original.invoiceId,
    studioPaymentId: original.studioPaymentId,
    invoicePaymentId: original.invoicePaymentId,
    stripeEventId: input.receiptId,
    occurredAt: input.occurredAt,
    metadata: { originalLedgerEntryId: original.id },
  });
  if (!refundLedger.created && refundLedger.entry.status !== status) {
    await input.tx
      .update(commerceLedgerEntry)
      .set({ status, stripeEventId: input.receiptId, updatedAt: new Date() })
      .where(eq(commerceLedgerEntry.id, refundLedger.entry.id));
  }

  const originalStatus = await updateOriginalRefundState(input.tx, original);
  if (originalStatus === "REFUNDED") {
    await projectFullBookingRefund(input.tx, original);
  }
  await updateCancellationChargeRefundState(
    input.tx,
    original,
    originalStatus,
    input.occurredAt,
  );
  if (operation) {
    if (status === "PENDING") {
      await input.tx
        .update(commerceOperation)
        .set({
          status:
            input.refund.status === "requires_action"
              ? "REQUIRES_ACTION"
              : "PROVIDER_PENDING",
          updatedAt: new Date(),
        })
        .where(eq(commerceOperation.id, operation.id));
    } else {
      await completeCommerceOperation(
        input.tx,
        operation.id,
        status === "SUCCEEDED"
          ? "SUCCEEDED"
          : status === "FAILED"
            ? "FAILED"
            : "CANCELLED",
        status === "FAILED"
          ? {
              code: "STRIPE_REFUND_FAILED",
              message: "Stripe reported that the refund failed",
            }
          : undefined,
      );
    }
  }
  return {
    organizationId: original.organizationId,
    locationId: original.locationId,
    stripeConnectionId: connection.id,
  };
}

async function projectFullBookingRefund(
  tx: CommerceTransaction,
  original: OriginalLedger,
): Promise<void> {
  if (original.bookingId) {
    await tx
      .update(booking)
      .set({ paymentStatus: "REFUNDED", updatedAt: new Date() })
      .where(
        and(
          eq(booking.id, original.bookingId),
          eq(booking.organizationId, original.organizationId),
          original.locationId
            ? eq(booking.locationId, original.locationId)
            : isNull(booking.locationId),
          eq(booking.paymentStatus, "PAID"),
        ),
      );
  }
  if (!original.studioBookingId) return;
  const [scoped] = await tx
    .select({ id: studioBooking.id })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioBooking.classId, studioClass.id))
    .where(
      and(
        eq(studioBooking.id, original.studioBookingId),
        eq(studioClass.organizationId, original.organizationId),
        original.locationId
          ? eq(studioClass.locationId, original.locationId)
          : isNull(studioClass.locationId),
      ),
    )
    .limit(1)
    .for("update");
  if (!scoped) {
    throw new PermanentStripeEventError(
      "REFUND_BOOKING_SCOPE_MISMATCH",
      "Refunded class booking does not belong to the original commerce scope",
    );
  }
  await tx
    .update(studioBooking)
    .set({ paymentStatus: "REFUNDED", updatedAt: new Date() })
    .where(
      and(
        eq(studioBooking.id, scoped.id),
        eq(studioBooking.paymentStatus, "PAID"),
      ),
    );
}

function assertRefundOperationMatches(
  operation: typeof commerceOperation.$inferSelect,
  original: OriginalLedger,
  refund: StripeRefund,
): void {
  const metadata = refundOperationMetadataSchema.safeParse(operation.metadata);
  if (
    operation.organizationId !== original.organizationId ||
    operation.locationId !== original.locationId ||
    operation.stripeConnectionId !== original.stripeConnectionId ||
    operation.providerPaymentIntentId !== original.paymentIntentId ||
    operation.amountMinor !== refund.amount ||
    operation.currency !== normalizeCurrency(refund.currency) ||
    !metadata.success ||
    metadata.data.originalLedgerEntryId !== original.id
  ) {
    throw new PermanentStripeEventError(
      "REFUND_OPERATION_MISMATCH",
      "Stripe refund does not match its commerce operation",
    );
  }
}

export async function applyStripeDispute(input: {
  tx: CommerceTransaction;
  dispute: StripeDispute;
  receiptId: string;
  providerAccountId: string | null;
  occurredAt: Date;
}): Promise<{
  organizationId: string;
  locationId: string | null;
  stripeConnectionId: string;
} | null> {
  const paymentIntentId = expandableId(input.dispute.payment_intent);
  const chargeId = expandableId(input.dispute.charge);
  const original = await findOriginalPayment(input.tx, {
    paymentIntentId,
    chargeId,
    statuses: [...DISPUTE_ORIGINAL_PAYMENT_STATUSES],
  });
  if (!original) return null;
  const connection = await requireHistoricalStripeConnection({
    tx: input.tx,
    stripeConnectionId: original.stripeConnectionId,
    organizationId: original.organizationId,
    locationId: original.locationId,
    providerAccountId: original.providerAccountId,
    eventAccountId: input.providerAccountId,
    requireExternalSnapshot: true,
  });
  if (normalizeCurrency(input.dispute.currency) !== original.currency) {
    throw new PermanentStripeEventError(
      "DISPUTE_CURRENCY_MISMATCH",
      "Stripe dispute currency does not match the original ledger entry",
    );
  }

  const status = disputeStatus(input.dispute.status);
  const disputeLedger = await writeCommerceLedgerEntry(input.tx, {
    organizationId: original.organizationId,
    locationId: original.locationId,
    operationId: original.operationId,
    provider: "STRIPE",
    stripeConnectionId: connection.id,
    providerAccountId: connection.stripeAccountId,
    providerObjectId: input.dispute.id,
    providerObjectType: "dispute",
    kind: "DISPUTE",
    status,
    paymentIntentId: paymentIntentId ?? original.paymentIntentId,
    chargeId: chargeId ?? original.chargeId,
    amountMinor: input.dispute.amount,
    currency: input.dispute.currency,
    currencyExponent: original.currencyExponent,
    clientId: original.clientId,
    membershipId: original.membershipId,
    bookingId: original.bookingId,
    studioBookingId: original.studioBookingId,
    invoiceId: original.invoiceId,
    studioPaymentId: original.studioPaymentId,
    invoicePaymentId: original.invoicePaymentId,
    stripeEventId: input.receiptId,
    occurredAt: input.occurredAt,
    metadata: {
      originalLedgerEntryId: original.id,
      stripeDisputeStatus: input.dispute.status,
    },
  });
  if (!disputeLedger.created && disputeLedger.entry.status !== status) {
    await input.tx
      .update(commerceLedgerEntry)
      .set({
        status,
        stripeEventId: input.receiptId,
        metadata: {
          originalLedgerEntryId: original.id,
          stripeDisputeStatus: input.dispute.status,
        },
        updatedAt: new Date(),
      })
      .where(eq(commerceLedgerEntry.id, disputeLedger.entry.id));
  }
  await input.tx
    .update(commerceLedgerEntry)
    .set({ status, updatedAt: new Date() })
    .where(eq(commerceLedgerEntry.id, original.id));
  const cancellationStatus =
    status === "WON"
      ? await calculateOriginalRefundStatus(input.tx, original)
      : "DISPUTED";
  await updateCancellationChargeDisputeState(
    input.tx,
    original,
    cancellationStatus,
    input.occurredAt,
  );

  return {
    organizationId: original.organizationId,
    locationId: original.locationId,
    stripeConnectionId: connection.id,
  };
}

async function findOriginalPayment(
  tx: CommerceTransaction,
  input: {
    paymentIntentId: string | null;
    chargeId: string | null;
    statuses: Array<typeof commerceLedgerEntry.$inferSelect.status>;
  },
): Promise<OriginalLedger | null> {
  const identities = [
    input.paymentIntentId
      ? eq(commerceLedgerEntry.paymentIntentId, input.paymentIntentId)
      : undefined,
    input.chargeId
      ? eq(commerceLedgerEntry.chargeId, input.chargeId)
      : undefined,
  ].filter((value) => value !== undefined);
  if (identities.length === 0) return null;

  const [original] = await tx
    .select()
    .from(commerceLedgerEntry)
    .where(
      and(
        inArray(commerceLedgerEntry.kind, ["PAYMENT", "CREDIT"]),
        inArray(commerceLedgerEntry.status, input.statuses),
        or(...identities),
      ),
    )
    .limit(1)
    .for("update");
  return original ?? null;
}

async function updateOriginalRefundState(
  tx: CommerceTransaction,
  original: OriginalLedger,
): Promise<"SUCCEEDED" | "PARTIALLY_REFUNDED" | "REFUNDED"> {
  const status = await calculateOriginalRefundStatus(tx, original);
  await tx
    .update(commerceLedgerEntry)
    .set({ status, updatedAt: new Date() })
    .where(eq(commerceLedgerEntry.id, original.id));
  if (status === "REFUNDED" && original.studioPaymentId) {
    await tx
      .update(studioPayment)
      .set({ status: "REFUNDED", updatedAt: new Date() })
      .where(eq(studioPayment.id, original.studioPaymentId));
  }
  return status;
}

async function calculateOriginalRefundStatus(
  tx: CommerceTransaction,
  original: OriginalLedger,
): Promise<"SUCCEEDED" | "PARTIALLY_REFUNDED" | "REFUNDED"> {
  const identity = original.paymentIntentId
    ? eq(commerceLedgerEntry.paymentIntentId, original.paymentIntentId)
    : original.chargeId
      ? eq(commerceLedgerEntry.chargeId, original.chargeId)
      : null;
  if (!identity) return "SUCCEEDED";

  const refunds = await tx
    .select({ amountMinor: commerceLedgerEntry.amountMinor })
    .from(commerceLedgerEntry)
    .where(
      and(
        eq(commerceLedgerEntry.kind, "REFUND"),
        eq(commerceLedgerEntry.status, "SUCCEEDED"),
        eq(commerceLedgerEntry.organizationId, original.organizationId),
        original.locationId
          ? eq(commerceLedgerEntry.locationId, original.locationId)
          : isNull(commerceLedgerEntry.locationId),
        original.providerAccountId
          ? eq(
              commerceLedgerEntry.providerAccountId,
              original.providerAccountId,
            )
          : isNull(commerceLedgerEntry.providerAccountId),
        identity,
      ),
    );
  const refundedMinor = refunds.reduce((sum, row) => {
    const next = sum + row.amountMinor;
    if (!Number.isSafeInteger(next)) {
      throw new PermanentStripeEventError(
        "REFUND_TOTAL_INVALID",
        "Aggregate Stripe refunds exceed the supported range",
      );
    }
    return next;
  }, 0);
  if (refundedMinor > original.amountMinor) {
    throw new PermanentStripeEventError(
      "REFUND_OVERPAYMENT",
      "Aggregate Stripe refunds exceed the original ledger amount",
    );
  }
  return refundedMinor === 0
    ? "SUCCEEDED"
    : refundedMinor === original.amountMinor
      ? "REFUNDED"
      : "PARTIALLY_REFUNDED";
}

async function updateCancellationChargeRefundState(
  tx: CommerceTransaction,
  original: OriginalLedger,
  status: "SUCCEEDED" | "PARTIALLY_REFUNDED" | "REFUNDED",
  occurredAt: Date,
): Promise<void> {
  if (!original.operationId || status === "SUCCEEDED") return;
  await tx
    .update(cancellationCharge)
    .set({ status, processedAt: occurredAt, updatedAt: new Date() })
    .where(
      and(
        eq(cancellationCharge.commerceOperationId, original.operationId),
        eq(cancellationCharge.organizationId, original.organizationId),
        original.locationId
          ? eq(cancellationCharge.locationId, original.locationId)
          : isNull(cancellationCharge.locationId),
        inArray(cancellationCharge.status, [
          "SUCCEEDED",
          "PARTIALLY_REFUNDED",
          "REFUNDED",
        ]),
      ),
    );
}

async function updateCancellationChargeDisputeState(
  tx: CommerceTransaction,
  original: OriginalLedger,
  status: "SUCCEEDED" | "PARTIALLY_REFUNDED" | "REFUNDED" | "DISPUTED",
  occurredAt: Date,
): Promise<void> {
  if (!original.operationId) return;
  await tx
    .update(cancellationCharge)
    .set({ status, processedAt: occurredAt, updatedAt: new Date() })
    .where(
      and(
        eq(cancellationCharge.commerceOperationId, original.operationId),
        eq(cancellationCharge.organizationId, original.organizationId),
        original.locationId
          ? eq(cancellationCharge.locationId, original.locationId)
          : isNull(cancellationCharge.locationId),
        status === "DISPUTED"
          ? inArray(cancellationCharge.status, [
              "SUCCEEDED",
              "PARTIALLY_REFUNDED",
              "DISPUTED",
            ])
          : eq(cancellationCharge.status, "DISPUTED"),
      ),
    );
}

function refundStatus(
  status: string | null | undefined,
): "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" {
  if (status === "succeeded") return "SUCCEEDED";
  if (status === "failed") return "FAILED";
  if (status === "canceled") return "CANCELLED";
  return "PENDING";
}

function disputeStatus(status: string): "DISPUTED" | "WON" | "LOST" {
  if (status === "won" || status === "warning_closed") return "WON";
  if (status === "lost") return "LOST";
  return "DISPUTED";
}
