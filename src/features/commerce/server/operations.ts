import "server-only";

import { randomUUID } from "crypto";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { commerceOperation, stripeConnection } from "@/db/schema";
import {
  assertMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";

import { PermanentStripeEventError } from "./stripe/stripe-event-contract";
import type { CommerceTransaction } from "./stripe/stripe-event-receipt";

type OperationInsert = typeof commerceOperation.$inferInsert;

export type CheckoutOperationInput = {
  organizationId: string;
  locationId: string | null;
  clientId?: string | null;
  stripeConnectionId: string;
  providerAccountId: string;
  idempotencyKey: string;
  amountMinor: number;
  currency: string;
  currencyExponent: number;
  invoiceId?: string | null;
  bookingId?: string | null;
  studioBookingId?: string | null;
  membershipId?: string | null;
  requestedBy?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
};

export async function createOrReuseCheckoutOperation(
  input: CheckoutOperationInput,
): Promise<typeof commerceOperation.$inferSelect> {
  assertMinorUnits(input.amountMinor);
  await assertCheckoutStripeConnection(input);
  const currency = normalizeCurrency(input.currency);
  const [created] = await db
    .insert(commerceOperation)
    .values({
      id: randomUUID(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: input.clientId,
      type: "CHECKOUT",
      status: "CREATED",
      provider: "STRIPE",
      stripeConnectionId: input.stripeConnectionId,
      providerAccountId: input.providerAccountId,
      idempotencyKey: input.idempotencyKey,
      amountMinor: input.amountMinor,
      currency,
      currencyExponent: input.currencyExponent,
      invoiceId: input.invoiceId,
      bookingId: input.bookingId,
      studioBookingId: input.studioBookingId,
      membershipId: input.membershipId,
      requestedBy: input.requestedBy,
      expiresAt: input.expiresAt,
      metadata: input.metadata ?? {},
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: commerceOperation.idempotencyKey })
    .returning();

  if (created) return created;

  const activeBookingCheckout =
    input.bookingId || input.studioBookingId
      ? and(
          input.bookingId
            ? eq(commerceOperation.bookingId, input.bookingId)
            : input.studioBookingId
              ? eq(commerceOperation.studioBookingId, input.studioBookingId)
              : undefined,
          eq(commerceOperation.type, "CHECKOUT"),
          inArray(commerceOperation.status, [
            "CREATED",
            "PROVIDER_PENDING",
            "REQUIRES_ACTION",
          ]),
        )
      : undefined;
  const existing = await db.query.commerceOperation.findFirst({
    where: activeBookingCheckout
      ? or(
          eq(commerceOperation.idempotencyKey, input.idempotencyKey),
          activeBookingCheckout,
        )
      : eq(commerceOperation.idempotencyKey, input.idempotencyKey),
  });
  if (!existing)
    throw new Error("Commerce operation conflict could not be resolved");

  assertOperationMatches(existing, {
    organizationId: input.organizationId,
    locationId: input.locationId,
    stripeConnectionId: input.stripeConnectionId,
    providerAccountId: input.providerAccountId,
    amountMinor: input.amountMinor,
    currency,
    type: "CHECKOUT",
    bookingId: input.bookingId,
    studioBookingId: input.studioBookingId,
  });
  return existing;
}

async function assertCheckoutStripeConnection(
  input: CheckoutOperationInput,
): Promise<void> {
  const connection = await db.query.stripeConnection.findFirst({
    where: and(
      eq(stripeConnection.id, input.stripeConnectionId),
      eq(stripeConnection.organizationId, input.organizationId),
      input.locationId
        ? eq(stripeConnection.locationId, input.locationId)
        : isNull(stripeConnection.locationId),
      eq(stripeConnection.stripeAccountId, input.providerAccountId),
      eq(stripeConnection.isActive, true),
      eq(stripeConnection.chargesEnabled, true),
    ),
    columns: { accountType: true },
  });
  if (!connection || connection.accountType.toLowerCase() !== "express") {
    throw new PermanentStripeEventError(
      "STRIPE_ACCOUNT_SCOPE_MISMATCH",
      "Checkout is not bound to an active Stripe Express account in this workspace",
    );
  }
}

export async function attachStripeCheckoutToOperation(input: {
  operationId: string;
  checkoutSessionId: string;
  paymentIntentId?: string | null;
  checkoutUrl?: string;
}): Promise<void> {
  const [updated] = await db
    .update(commerceOperation)
    .set({
      status: "PROVIDER_PENDING",
      providerCheckoutSessionId: input.checkoutSessionId,
      providerPaymentIntentId: input.paymentIntentId,
      metadata: input.checkoutUrl
        ? sql`coalesce(${commerceOperation.metadata}, '{}'::jsonb) || jsonb_build_object('checkoutUrl', ${input.checkoutUrl})`
        : sql`coalesce(${commerceOperation.metadata}, '{}'::jsonb)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(commerceOperation.id, input.operationId),
        or(
          isNull(commerceOperation.providerCheckoutSessionId),
          eq(
            commerceOperation.providerCheckoutSessionId,
            input.checkoutSessionId,
          ),
        ),
        input.paymentIntentId
          ? or(
              isNull(commerceOperation.providerPaymentIntentId),
              eq(
                commerceOperation.providerPaymentIntentId,
                input.paymentIntentId,
              ),
            )
          : undefined,
      ),
    )
    .returning({ id: commerceOperation.id });
  if (!updated) {
    throw new PermanentStripeEventError(
      "OPERATION_PROVIDER_REFERENCE_CONFLICT",
      "Commerce operation is missing or attached to a different Stripe checkout",
    );
  }
}

export async function failCommerceOperation(input: {
  operationId: string;
  code: string;
  message: string;
}): Promise<void> {
  await db
    .update(commerceOperation)
    .set({
      status: "FAILED",
      failureCode: input.code,
      failureMessage: input.message,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(commerceOperation.id, input.operationId));
}

export async function resolveOperationForStripeEvent(input: {
  tx: CommerceTransaction;
  operationId?: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
}): Promise<typeof commerceOperation.$inferSelect | null> {
  const conditions = [
    input.operationId ? eq(commerceOperation.id, input.operationId) : undefined,
    input.checkoutSessionId
      ? eq(commerceOperation.providerCheckoutSessionId, input.checkoutSessionId)
      : undefined,
    input.paymentIntentId
      ? eq(commerceOperation.providerPaymentIntentId, input.paymentIntentId)
      : undefined,
  ].filter((condition) => condition !== undefined);

  if (conditions.length === 0) return null;

  const [operation] = await input.tx
    .select()
    .from(commerceOperation)
    .where(or(...conditions))
    .limit(1)
    .for("update");

  if (
    operation &&
    ((input.operationId && operation.id !== input.operationId) ||
      (input.checkoutSessionId &&
        operation.providerCheckoutSessionId &&
        operation.providerCheckoutSessionId !== input.checkoutSessionId) ||
      (input.paymentIntentId &&
        operation.providerPaymentIntentId &&
        operation.providerPaymentIntentId !== input.paymentIntentId))
  ) {
    throw new PermanentStripeEventError(
      "OPERATION_PROVIDER_REFERENCE_CONFLICT",
      "Stripe provider references resolve to different commerce operations",
    );
  }

  if (
    operation &&
    input.paymentIntentId &&
    !operation.providerPaymentIntentId
  ) {
    const [updated] = await input.tx
      .update(commerceOperation)
      .set({
        providerPaymentIntentId: input.paymentIntentId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commerceOperation.id, operation.id),
          isNull(commerceOperation.providerPaymentIntentId),
        ),
      )
      .returning();
    if (!updated) {
      throw new PermanentStripeEventError(
        "OPERATION_PROVIDER_REFERENCE_CONFLICT",
        "Stripe payment intent could not be attached to its commerce operation",
      );
    }
    return updated;
  }

  return operation ?? null;
}

export async function resolveRefundOperationForStripeEvent(input: {
  tx: CommerceTransaction;
  operationId?: string | null;
  providerRefundId: string;
}): Promise<typeof commerceOperation.$inferSelect | null> {
  const condition = input.operationId
    ? eq(commerceOperation.id, input.operationId)
    : eq(commerceOperation.providerRefundId, input.providerRefundId);
  const [operation] = await input.tx
    .select()
    .from(commerceOperation)
    .where(condition)
    .limit(1)
    .for("update");
  if (!operation) {
    if (input.operationId) {
      throw new PermanentStripeEventError(
        "REFUND_OPERATION_NOT_FOUND",
        "Stripe refund metadata references an unknown commerce operation",
      );
    }
    return null;
  }

  if (
    operation.type !== "REFUND" ||
    (operation.providerRefundId &&
      operation.providerRefundId !== input.providerRefundId)
  ) {
    throw new PermanentStripeEventError(
      "REFUND_OPERATION_REFERENCE_CONFLICT",
      "Stripe refund metadata resolves to a different commerce operation",
    );
  }

  if (operation.providerRefundId) return operation;
  const [updated] = await input.tx
    .update(commerceOperation)
    .set({
      providerRefundId: input.providerRefundId,
      status: "PROVIDER_PENDING",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(commerceOperation.id, operation.id),
        isNull(commerceOperation.providerRefundId),
      ),
    )
    .returning();
  if (!updated) {
    throw new PermanentStripeEventError(
      "REFUND_OPERATION_REFERENCE_CONFLICT",
      "Stripe refund could not be attached to its commerce operation",
    );
  }
  return updated;
}

export async function completeCommerceOperation(
  tx: CommerceTransaction,
  operationId: string,
  status: "SUCCEEDED" | "FAILED" | "CANCELLED",
  failure?: { code: string; message: string },
): Promise<void> {
  const allowedStatus =
    status === "SUCCEEDED"
      ? eq(commerceOperation.id, operationId)
      : and(
          eq(commerceOperation.id, operationId),
          inArray(commerceOperation.status, [
            "CREATED",
            "PROVIDER_PENDING",
            "REQUIRES_ACTION",
          ]),
        );
  await tx
    .update(commerceOperation)
    .set({
      status,
      completedAt: new Date(),
      failureCode: failure?.code ?? null,
      failureMessage: failure?.message ?? null,
      updatedAt: new Date(),
    })
    .where(allowedStatus);
}

function assertOperationMatches(
  operation: typeof commerceOperation.$inferSelect,
  expected: Pick<
    OperationInsert,
    | "organizationId"
    | "locationId"
    | "stripeConnectionId"
    | "providerAccountId"
    | "amountMinor"
    | "currency"
    | "type"
    | "bookingId"
    | "studioBookingId"
  >,
): void {
  if (
    operation.organizationId !== expected.organizationId ||
    operation.locationId !== expected.locationId ||
    operation.stripeConnectionId !== expected.stripeConnectionId ||
    operation.providerAccountId !== expected.providerAccountId ||
    operation.amountMinor !== expected.amountMinor ||
    operation.currency !== expected.currency ||
    operation.type !== expected.type ||
    operation.bookingId !== expected.bookingId ||
    operation.studioBookingId !== expected.studioBookingId
  ) {
    throw new PermanentStripeEventError(
      "OPERATION_IDEMPOTENCY_CONFLICT",
      "The checkout operation key was reused for different commerce values",
    );
  }
}
