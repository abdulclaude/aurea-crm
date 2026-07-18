import "server-only";

import type Stripe from "stripe";
import { and, eq, isNull, notInArray, or } from "drizzle-orm";

import { db } from "@/db";
import { cancellationCharge, commerceOperation } from "@/db/schema";
import { paymentIntentNeedsCustomerAction } from "@/features/studio/lib/cancellation-charge-rules";

import type {
  CancellationChargeStatus,
  CancellationCollectionDetails,
  CancellationCollectionResult,
} from "./cancellation-collection-types";

export async function recordCancellationPaymentIntent(
  details: CancellationCollectionDetails,
  paymentIntent: Stripe.PaymentIntent,
): Promise<CancellationCollectionResult> {
  const requiresPaymentMethod = paymentIntentNeedsCustomerAction(
    paymentIntent.status,
  );
  const chargeStatus: CancellationChargeStatus = requiresPaymentMethod
    ? "REQUIRES_PAYMENT_METHOD"
    : "PROCESSING";

  await db.transaction(async (tx) => {
    const [operation] = await tx
      .update(commerceOperation)
      .set({
        providerPaymentIntentId: paymentIntent.id,
        status: requiresPaymentMethod ? "REQUIRES_ACTION" : "PROVIDER_PENDING",
        failureCode: requiresPaymentMethod ? "PAYMENT_METHOD_REQUIRED" : null,
        failureMessage: requiresPaymentMethod
          ? "The saved payment method requires customer action."
          : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commerceOperation.id, details.operationId),
          or(
            isNull(commerceOperation.providerPaymentIntentId),
            eq(commerceOperation.providerPaymentIntentId, paymentIntent.id),
          ),
          notInArray(commerceOperation.status, [
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
          ]),
        ),
      )
      .returning({ id: commerceOperation.id });
    if (!operation) return;

    await tx
      .update(cancellationCharge)
      .set({
        status: chargeStatus,
        stripePaymentIntentId: paymentIntent.id,
        failureCode: requiresPaymentMethod ? "PAYMENT_METHOD_REQUIRED" : null,
        failureMessage: requiresPaymentMethod
          ? "The saved payment method requires customer action."
          : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cancellationCharge.id, details.chargeId),
          eq(cancellationCharge.commerceOperationId, details.operationId),
          notInArray(cancellationCharge.status, [
            "SUCCEEDED",
            "WAIVED",
            "NO_PAYMENT_DUE",
          ]),
        ),
      );
  });

  return {
    chargeId: details.chargeId,
    status: chargeStatus,
    paymentIntentId: paymentIntent.id,
  };
}

export async function markCancellationPaymentMethodRequired(
  details: CancellationCollectionDetails,
  code: string,
): Promise<CancellationCollectionResult> {
  await markCancellationCollectionFailure(details, {
    code,
    message: "Add a saved payment method before collecting this fee.",
  });
  return {
    chargeId: details.chargeId,
    status: "REQUIRES_PAYMENT_METHOD",
    paymentIntentId: null,
  };
}

export async function markCancellationCollectionFailure(
  details: CancellationCollectionDetails,
  failure: { code: string; message: string },
  paymentIntentId: string | null = null,
): Promise<void> {
  const terminalFailure =
    Boolean(paymentIntentId) ||
    ![
      "CUSTOMER_NOT_LINKED",
      "CUSTOMER_NOT_FOUND",
      "PAYMENT_METHOD_REQUIRED",
    ].includes(failure.code);
  await db.transaction(async (tx) => {
    const [operation] = await tx
      .update(commerceOperation)
      .set({
        status: terminalFailure ? "FAILED" : "REQUIRES_ACTION",
        providerPaymentIntentId: paymentIntentId,
        failureCode: failure.code,
        failureMessage: failure.message,
        completedAt: terminalFailure ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commerceOperation.id, details.operationId),
          notInArray(commerceOperation.status, ["SUCCEEDED", "CANCELLED"]),
        ),
      )
      .returning({ id: commerceOperation.id });
    if (!operation) return;

    await tx
      .update(cancellationCharge)
      .set({
        status:
          terminalFailure && !paymentIntentId
            ? "FAILED"
            : "REQUIRES_PAYMENT_METHOD",
        stripePaymentIntentId: paymentIntentId,
        failureCode: failure.code,
        failureMessage: failure.message,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cancellationCharge.id, details.chargeId),
          eq(cancellationCharge.commerceOperationId, details.operationId),
          notInArray(cancellationCharge.status, [
            "SUCCEEDED",
            "WAIVED",
            "NO_PAYMENT_DUE",
          ]),
        ),
      );
  });
}

export async function markCancellationCollectionRetryExhausted(
  chargeId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({
        chargeStatus: cancellationCharge.status,
        operationId: commerceOperation.id,
      })
      .from(cancellationCharge)
      .innerJoin(
        commerceOperation,
        eq(commerceOperation.id, cancellationCharge.commerceOperationId),
      )
      .where(eq(cancellationCharge.id, chargeId))
      .limit(1)
      .for("update");
    if (!record || record.chargeStatus !== "PROCESSING") return;

    const failureCode = "COLLECTION_STATUS_UNCERTAIN";
    const failureMessage =
      "Stripe did not return a conclusive collection result. Reconcile this payment before retrying or waiving the fee.";

    await tx
      .update(commerceOperation)
      .set({ failureCode, failureMessage, updatedAt: new Date() })
      .where(eq(commerceOperation.id, record.operationId));
    await tx
      .update(cancellationCharge)
      .set({
        status: "PROCESSING",
        failureCode,
        failureMessage,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cancellationCharge.id, chargeId),
          eq(cancellationCharge.status, "PROCESSING"),
        ),
      );
  });
}
