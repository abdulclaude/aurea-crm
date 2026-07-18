import "server-only";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  cancellationCharge,
  client,
  commerceOperation,
  stripeConnection,
} from "@/db/schema";
import {
  currencyExponent,
  decimalToMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";

import { exactCancellationLocation } from "./cancellation-access";
import type { CancellationCollectionReservation } from "./cancellation-collection-types";

export async function reserveCancellationCollection(
  chargeId: string,
): Promise<CancellationCollectionReservation> {
  return db.transaction(async (tx) => {
    const [charge] = await tx
      .select()
      .from(cancellationCharge)
      .where(eq(cancellationCharge.id, chargeId))
      .limit(1)
      .for("update");
    if (!charge) throw new Error("Cancellation charge not found");

    if (["SUCCEEDED", "WAIVED", "NO_PAYMENT_DUE"].includes(charge.status)) {
      return { chargeId, terminalStatus: charge.status };
    }

    const [customer] = await tx
      .select({ stripeCustomerId: client.stripeCustomerId })
      .from(client)
      .where(
        and(
          eq(client.id, charge.clientId),
          eq(client.organizationId, charge.organizationId),
          exactCancellationLocation(client.locationId, charge.locationId),
        ),
      )
      .limit(1);
    if (!customer)
      throw new Error("Cancellation charge customer scope is invalid");

    const [connection] = await tx
      .select({
        id: stripeConnection.id,
        stripeAccountId: stripeConnection.stripeAccountId,
        applicationFeePercent: stripeConnection.applicationFeePercent,
        applicationFeeFixed: stripeConnection.applicationFeeFixed,
      })
      .from(stripeConnection)
      .where(
        and(
          eq(stripeConnection.organizationId, charge.organizationId),
          exactCancellationLocation(
            stripeConnection.locationId,
            charge.locationId,
          ),
          eq(stripeConnection.accountType, "express"),
          eq(stripeConnection.isActive, true),
          eq(stripeConnection.chargesEnabled, true),
        ),
      )
      .limit(1);
    if (!connection) {
      await tx
        .update(cancellationCharge)
        .set({
          status: "FAILED",
          failureCode: "STRIPE_CONNECTION_UNAVAILABLE",
          failureMessage:
            "Connect an active Stripe Express account before collecting this fee.",
          updatedAt: new Date(),
        })
        .where(eq(cancellationCharge.id, charge.id));
      return { chargeId, terminalStatus: "FAILED" };
    }

    const currency = normalizeCurrency(charge.currency);
    const exponent = currencyExponent(currency);
    if (exponent > 2) {
      await tx
        .update(cancellationCharge)
        .set({
          status: "FAILED",
          failureCode: "CURRENCY_PRECISION_UNSUPPORTED",
          failureMessage:
            "This fee currency uses more precision than cancellation fee storage supports.",
          updatedAt: new Date(),
        })
        .where(eq(cancellationCharge.id, charge.id));
      return { chargeId, terminalStatus: "FAILED" };
    }
    const amountMinor = decimalToMinorUnits(charge.amount, exponent);
    if (amountMinor <= 0) {
      await tx
        .update(cancellationCharge)
        .set({
          status: "NO_PAYMENT_DUE",
          processedAt: new Date(),
          failureCode: null,
          failureMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(cancellationCharge.id, charge.id));
      return { chargeId, terminalStatus: "NO_PAYMENT_DUE" };
    }

    let operation = await findReusableOperation(tx, charge, {
      connectionId: connection.id,
      providerAccountId: connection.stripeAccountId,
      amountMinor,
      currency,
    });
    let attempt = charge.collectionAttempt;
    if (
      operation?.status === "PROVIDER_PENDING" &&
      operation.providerPaymentIntentId
    ) {
      await tx
        .update(cancellationCharge)
        .set({
          status: "PROCESSING",
          stripePaymentIntentId: operation.providerPaymentIntentId,
          updatedAt: new Date(),
        })
        .where(eq(cancellationCharge.id, charge.id));
      return { chargeId, terminalStatus: "PROCESSING" };
    }
    if (operation?.status !== "CREATED" || operation.providerPaymentIntentId) {
      operation = undefined;
    }

    if (!operation) {
      attempt += 1;
      const [created] = await tx
        .insert(commerceOperation)
        .values({
          id: randomUUID(),
          organizationId: charge.organizationId,
          locationId: charge.locationId,
          clientId: charge.clientId,
          type: "PAYMENT",
          status: "CREATED",
          provider: "STRIPE",
          stripeConnectionId: connection.id,
          providerAccountId: connection.stripeAccountId,
          idempotencyKey: `cancellation-charge:${charge.id}:attempt:${attempt}`,
          amountMinor,
          currency,
          currencyExponent: exponent,
          studioBookingId: charge.bookingId,
          metadata: {
            cancellationChargeId: charge.id,
            collectionAttempt: attempt,
          },
          updatedAt: new Date(),
        })
        .returning();
      if (!created)
        throw new Error("Cancellation payment operation was not created");
      operation = created;
    }

    await tx
      .update(cancellationCharge)
      .set({
        status: "PROCESSING",
        stripeConnectionId: connection.id,
        commerceOperationId: operation.id,
        stripePaymentIntentId: null,
        collectionAttempt: attempt,
        failureCode: null,
        failureMessage: null,
        processedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(cancellationCharge.id, charge.id));

    return {
      chargeId,
      operationId: operation.id,
      attempt,
      amountMinor,
      currency,
      currencyExponent: exponent,
      stripeCustomerId: customer.stripeCustomerId,
      stripeConnectionId: connection.id,
      providerAccountId: connection.stripeAccountId,
      applicationFeePercent: connection.applicationFeePercent,
      applicationFeeFixed: connection.applicationFeeFixed,
      organizationId: charge.organizationId,
      locationId: charge.locationId,
      clientId: charge.clientId,
      bookingId: charge.bookingId,
    };
  });
}

async function findReusableOperation(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  charge: typeof cancellationCharge.$inferSelect,
  expected: {
    connectionId: string;
    providerAccountId: string;
    amountMinor: number;
    currency: string;
  },
) {
  if (
    !["PENDING", "PROCESSING"].includes(charge.status) ||
    !charge.commerceOperationId
  ) {
    return undefined;
  }
  const [operation] = await tx
    .select()
    .from(commerceOperation)
    .where(
      and(
        eq(commerceOperation.id, charge.commerceOperationId),
        eq(commerceOperation.organizationId, charge.organizationId),
        exactCancellationLocation(
          commerceOperation.locationId,
          charge.locationId,
        ),
        eq(commerceOperation.clientId, charge.clientId),
        eq(commerceOperation.studioBookingId, charge.bookingId),
        eq(commerceOperation.type, "PAYMENT"),
        eq(commerceOperation.provider, "STRIPE"),
        eq(commerceOperation.stripeConnectionId, expected.connectionId),
        eq(commerceOperation.providerAccountId, expected.providerAccountId),
        eq(commerceOperation.amountMinor, expected.amountMinor),
        eq(commerceOperation.currency, expected.currency),
      ),
    )
    .limit(1);
  return operation;
}
