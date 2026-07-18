import "server-only";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  commerceLedgerEntry,
  studioMembership,
  studioPayment,
} from "@/db/schema";
import { minorUnitsToDecimal } from "@/features/commerce/lib/money";
import {
  openPaymentRecoveryCase,
  resolvePaymentRecoveryCases,
} from "@/features/commerce/server/recovery/payment-recovery-case-service";
import { resolveEffectivePaymentRecoveryPolicy } from "@/features/commerce/server/recovery/payment-recovery-policy";

import { writeCommerceLedgerEntry } from "../ledger-writer";
import { PermanentStripeEventError } from "./stripe-event-contract";
import type { CommerceTransaction } from "./stripe-event-receipt";
import { requireHistoricalStripeConnection } from "./stripe-connection-binding";
import {
  invoiceSubscriptionId,
  type stripeInvoiceSchema,
} from "./stripe-object-contracts";
import {
  redeemInternalTenders,
  tenderAllocations,
  totalTenderMinor,
  type CheckoutInternalTenders,
} from "./studio-tender-service";

type StripeInvoice = z.infer<typeof stripeInvoiceSchema>;

const internalTendersSchema = z.object({
  giftCardId: z.string().nullable(),
  giftCardAmountMinor: z.number().int().nonnegative(),
  accountBalanceId: z.string().nullable(),
  accountCreditAmountMinor: z.number().int().nonnegative(),
});

const membershipCommerceMetadataSchema = z.object({
  operationId: z.string(),
  currencyExponent: z.number().int().min(0).max(6),
  baseAmountMinor: z.number().int().nonnegative(),
  pricingOptionId: z.string().nullable(),
  pendingTenders: internalTendersSchema.nullable(),
});

export async function applyPaidMembershipInvoice(input: {
  tx: CommerceTransaction;
  invoice: StripeInvoice;
  receiptId: string;
  eventAccountId: string | null;
  occurredAt: Date;
}): Promise<{
  organizationId: string;
  locationId: string | null;
  stripeConnectionId: string;
} | null> {
  const subscriptionId = invoiceSubscriptionId(input.invoice);
  if (!subscriptionId) return null;

  const [membership] = await input.tx
    .select()
    .from(studioMembership)
    .where(eq(studioMembership.stripeSubscriptionId, subscriptionId))
    .for("update");
  if (!membership?.organizationId) {
    if (isAureaSubscriptionInvoice(input.invoice)) {
      throw new PermanentStripeEventError(
        "STRIPE_MEMBERSHIP_UNBOUND",
        "Stripe subscription membership projection is not available",
      );
    }
    return null;
  }

  const connection = await requireHistoricalStripeConnection({
    tx: input.tx,
    stripeConnectionId: membership.stripeConnectionId,
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    eventAccountId: input.eventAccountId,
  });

  const commerceMetadata = parseCommerceMetadata(membership.metadata);
  const exponent = commerceMetadata?.currencyExponent ?? 2;
  const internal = commerceMetadata?.pendingTenders ?? emptyInternalTenders();
  const saleMinor = totalTenderMinor({
    stripeAmountMinor: input.invoice.amount_paid,
    internal,
  });
  if (saleMinor === 0) {
    await input.tx
      .update(studioMembership)
      .set({
        status: "ACTIVE",
        paymentFailureAt: null,
        paymentGraceEndsAt: null,
        updatedAt: new Date(),
      })
      .where(eq(studioMembership.id, membership.id));
    await resolvePaymentRecoveryCases({
      tx: input.tx,
      organizationId: membership.organizationId,
      locationId: membership.locationId,
      target: "MEMBERSHIP",
      resource: { membershipId: membership.id },
      sourceEventId: input.receiptId,
      occurredAt: input.occurredAt,
      attemptKey: `stripe:${input.receiptId}:membership-recovered`,
      provider: "STRIPE",
      providerAccountRef: connection.stripeAccountId,
      stripeConnectionId: connection.id,
      providerObjectId: input.invoice.id,
    });
    return {
      organizationId: membership.organizationId,
      locationId: membership.locationId,
      stripeConnectionId: connection.id,
    };
  }

  const paymentIntentId = expandableInvoicePaymentIntent(input.invoice);
  const ledger = await writeCommerceLedgerEntry(input.tx, {
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    operationId: commerceMetadata?.operationId,
    provider: "STRIPE",
    stripeConnectionId: connection.id,
    providerAccountId: connection.stripeAccountId,
    providerObjectId: input.invoice.id,
    providerObjectType: "invoice",
    kind: "PAYMENT",
    status: "SUCCEEDED",
    paymentIntentId,
    amountMinor: saleMinor,
    currency: input.invoice.currency,
    currencyExponent: exponent,
    clientId: membership.clientId,
    membershipId: membership.id,
    stripeEventId: input.receiptId,
    occurredAt: input.occurredAt,
    tenders: tenderAllocations({
      stripeAmountMinor: input.invoice.amount_paid,
      internal,
    }),
    metadata: {
      billingReason: input.invoice.billing_reason ?? null,
      subscriptionId,
    },
  });

  if (ledger.created) {
    const paymentId = randomUUID();
    await input.tx.insert(studioPayment).values({
      id: paymentId,
      organizationId: membership.organizationId,
      locationId: membership.locationId,
      clientId: membership.clientId,
      membershipId: membership.id,
      stripePaymentIntentId: paymentIntentId,
      stripeCustomerId: expandableInvoiceCustomer(input.invoice),
      stripeConnectionId: connection.id,
      paymentMethod: paymentIntentId ? "STRIPE" : "INTERNAL_CREDIT",
      amount: minorUnitsToDecimal(saleMinor, exponent),
      currency: input.invoice.currency,
      status: "SUCCEEDED",
      type: "MEMBERSHIP",
      description:
        input.invoice.billing_reason === "subscription_create"
          ? `Membership: ${membership.name}`
          : "Membership renewal",
      metadata: {
        stripeInvoiceId: input.invoice.id,
        pricingOptionId: commerceMetadata?.pricingOptionId ?? null,
      },
      updatedAt: new Date(),
    });
    await input.tx
      .update(commerceLedgerEntry)
      .set({ studioPaymentId: paymentId, updatedAt: new Date() })
      .where(eq(commerceLedgerEntry.id, ledger.entry.id));

    if (commerceMetadata?.pendingTenders) {
      await redeemInternalTenders({
        tx: input.tx,
        organizationId: membership.organizationId,
        locationId: membership.locationId,
        clientId: membership.clientId,
        currency: input.invoice.currency,
        currencyExponent: exponent,
        paymentId,
        pricingOptionId: commerceMetadata.pricingOptionId,
        tenders: commerceMetadata.pendingTenders,
      });
      await input.tx
        .update(studioMembership)
        .set({
          metadata: clearPendingTenders(membership.metadata),
          updatedAt: new Date(),
        })
        .where(eq(studioMembership.id, membership.id));
    }
  }

  await input.tx
    .update(studioMembership)
    .set({
      status: "ACTIVE",
      paymentFailureAt: null,
      paymentGraceEndsAt: null,
      updatedAt: new Date(),
    })
    .where(eq(studioMembership.id, membership.id));
  await resolvePaymentRecoveryCases({
    tx: input.tx,
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    target: "MEMBERSHIP",
    resource: { membershipId: membership.id },
    sourceEventId: input.receiptId,
    occurredAt: input.occurredAt,
    attemptKey: `stripe:${input.receiptId}:membership-recovered`,
    provider: "STRIPE",
    providerAccountRef: connection.stripeAccountId,
    stripeConnectionId: connection.id,
    providerObjectId: input.invoice.id,
  });

  return {
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    stripeConnectionId: connection.id,
  };
}

export async function applyFailedMembershipInvoice(input: {
  tx: CommerceTransaction;
  invoice: StripeInvoice;
  receiptId: string;
  eventAccountId: string | null;
  occurredAt: Date;
}): Promise<{
  organizationId: string;
  locationId: string | null;
  stripeConnectionId: string;
} | null> {
  const subscriptionId = invoiceSubscriptionId(input.invoice);
  if (!subscriptionId) return null;
  const [membership] = await input.tx
    .select()
    .from(studioMembership)
    .where(eq(studioMembership.stripeSubscriptionId, subscriptionId))
    .for("update");
  if (!membership?.organizationId) {
    if (isAureaSubscriptionInvoice(input.invoice)) {
      throw new PermanentStripeEventError(
        "STRIPE_MEMBERSHIP_UNBOUND",
        "Stripe subscription membership projection is not available",
      );
    }
    return null;
  }

  const connection = await requireHistoricalStripeConnection({
    tx: input.tx,
    stripeConnectionId: membership.stripeConnectionId,
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    eventAccountId: input.eventAccountId,
  });

  const metadata = parseCommerceMetadata(membership.metadata);
  const amountMinor = input.invoice.amount_due ?? 0;
  const attemptNumber = input.invoice.attempt_count ?? 1;
  const ledger = await writeCommerceLedgerEntry(input.tx, {
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    operationId: metadata?.operationId,
    provider: "STRIPE",
    stripeConnectionId: connection.id,
    providerAccountId: connection.stripeAccountId,
    providerObjectId: `${input.invoice.id}:payment_failed:${attemptNumber}`,
    providerObjectType: "invoice",
    kind: "PAYMENT",
    status: "FAILED",
    paymentIntentId: expandableInvoicePaymentIntent(input.invoice),
    amountMinor,
    currency: input.invoice.currency,
    currencyExponent: metadata?.currencyExponent ?? 2,
    clientId: membership.clientId,
    membershipId: membership.id,
    stripeEventId: input.receiptId,
    occurredAt: input.occurredAt,
    metadata: {
      subscriptionId,
      stripeInvoiceId: input.invoice.id,
      attemptNumber,
      nextPaymentAttempt: input.invoice.next_payment_attempt ?? null,
    },
  });

  let failedPaymentId: string | null = null;
  if (ledger.created) {
    failedPaymentId = randomUUID();
    await input.tx.insert(studioPayment).values({
      id: failedPaymentId,
      organizationId: membership.organizationId,
      locationId: membership.locationId,
      clientId: membership.clientId,
      membershipId: membership.id,
      externalId: `${input.invoice.id}:attempt:${attemptNumber}`,
      stripeCustomerId: expandableInvoiceCustomer(input.invoice),
      stripeConnectionId: connection.id,
      paymentMethod: "STRIPE",
      amount: minorUnitsToDecimal(
        amountMinor,
        metadata?.currencyExponent ?? 2,
      ),
      currency: input.invoice.currency,
      status: "FAILED",
      type: "MEMBERSHIP",
      description: "Membership renewal payment failed",
      metadata: {
        stripeInvoiceId: input.invoice.id,
        stripePaymentIntentId: expandableInvoicePaymentIntent(input.invoice),
        attemptNumber,
        nextPaymentAttempt: input.invoice.next_payment_attempt ?? null,
        stripeEventId: input.receiptId,
      },
      createdAt: input.occurredAt,
      updatedAt: new Date(),
    });
    await input.tx
      .update(commerceLedgerEntry)
      .set({ studioPaymentId: failedPaymentId, updatedAt: new Date() })
      .where(eq(commerceLedgerEntry.id, ledger.entry.id));
  } else {
    failedPaymentId = ledger.entry.studioPaymentId;
  }

  const policy = await resolveEffectivePaymentRecoveryPolicy({
    tx: input.tx,
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    target: "MEMBERSHIP",
  });
  const graceDays = policy?.mode === "ENABLED" ? policy.gracePeriodDays : 0;
  const graceEndsAt = new Date(input.occurredAt.getTime() + graceDays * 86_400_000);
  await input.tx
    .update(studioMembership)
    .set({
      status: "PAST_DUE",
      paymentFailureAt: input.occurredAt,
      paymentGraceEndsAt: graceEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(studioMembership.id, membership.id));

  await openPaymentRecoveryCase({
    tx: input.tx,
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    clientId: membership.clientId,
    target: "MEMBERSHIP",
    caseKey: `membership:${membership.id}`,
    membershipId: membership.id,
    studioPaymentId: failedPaymentId,
    commerceOperationId: metadata?.operationId,
    sourceEventId: input.receiptId,
    sourceEventAt: input.occurredAt,
    attemptKey: `stripe:${input.receiptId}:membership-failure`,
    amountMinor,
    currency: input.invoice.currency,
    currencyExponent: metadata?.currencyExponent ?? 2,
    provider: "STRIPE",
    providerAccountRef: connection.stripeAccountId,
    stripeConnectionId: connection.id,
    providerObjectId: input.invoice.id,
    errorCode: "STRIPE_INVOICE_PAYMENT_FAILED",
    errorMessage: "Stripe reported a failed membership invoice payment",
    metadata: {
      attemptNumber,
      nextPaymentAttempt: input.invoice.next_payment_attempt ?? null,
    },
  });

  return {
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    stripeConnectionId: connection.id,
  };
}

function parseCommerceMetadata(
  value: unknown,
): z.infer<typeof membershipCommerceMetadataSchema> | null {
  if (!isRecord(value)) return null;
  const parsed = membershipCommerceMetadataSchema.safeParse(value.commerce);
  return parsed.success ? parsed.data : null;
}

function clearPendingTenders(value: unknown): Record<string, unknown> {
  const record = isRecord(value) ? value : {};
  const commerce = isRecord(record.commerce) ? record.commerce : {};
  return { ...record, commerce: { ...commerce, pendingTenders: null } };
}

function emptyInternalTenders(): CheckoutInternalTenders {
  return {
    giftCardId: null,
    giftCardAmountMinor: 0,
    accountBalanceId: null,
    accountCreditAmountMinor: 0,
  };
}

function expandableInvoicePaymentIntent(invoice: StripeInvoice): string | null {
  const value = invoice.payment_intent;
  if (typeof value === "string") return value;
  return value && typeof value === "object" ? value.id : null;
}

function expandableInvoiceCustomer(invoice: StripeInvoice): string | null {
  const value = invoice.customer;
  if (typeof value === "string") return value;
  return value && typeof value === "object" ? value.id : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAureaSubscriptionInvoice(invoice: StripeInvoice): boolean {
  const metadata = invoice.parent?.subscription_details?.metadata;
  return Boolean(
    metadata?.commerceOperationId ||
      metadata?.organizationId ||
      metadata?.planId,
  );
}
