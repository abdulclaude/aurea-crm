import "server-only";

import { eq } from "drizzle-orm";

import {
  commerceLedgerEntry,
  instructor,
} from "@/db/schema";
import {
  connectAccountStatus,
  connectPayoutLedgerStatus,
  stripeConnectAccountSchema,
  stripeConnectPayoutSchema,
} from "@/features/commerce/lib/stripe-connect-event-contract";
import { currencyExponent } from "@/features/commerce/lib/money";

import { writeCommerceLedgerEntry } from "../ledger-writer";
import {
  PermanentStripeEventError,
  type StripeEventEnvelope,
} from "./stripe-event-contract";
import type {
  CommerceTransaction,
  StripeEventHandlerResult,
  StripeEventProcessor,
} from "./stripe-event-receipt";

type InstructorScope = {
  id: string;
  organizationId: string;
  locationId: string | null;
};

export const processStripeInstructorConnectEvent: StripeEventProcessor = async ({
  tx,
  event,
  receiptId,
}) => {
  switch (event.type) {
    case "account.updated":
      return applyAccountUpdate(tx, event);
    case "payout.created":
    case "payout.updated":
    case "payout.paid":
    case "payout.failed":
    case "payout.canceled":
      return applyConnectedAccountPayout(tx, event, receiptId);
    default:
      return { outcome: "IGNORED" };
  }
};

async function applyAccountUpdate(
  tx: CommerceTransaction,
  event: StripeEventEnvelope,
): Promise<StripeEventHandlerResult> {
  const parsed = stripeConnectAccountSchema.safeParse(event.dataObject);
  if (!parsed.success) {
    throw new PermanentStripeEventError(
      "STRIPE_CONNECT_ACCOUNT_INVALID",
      "Stripe Connect account event has an invalid object contract",
    );
  }
  if (!event.accountId || event.accountId !== parsed.data.id) {
    throw new PermanentStripeEventError(
      "STRIPE_CONNECT_ACCOUNT_MISMATCH",
      "Stripe Connect account event does not match its signed account envelope",
    );
  }
  const scope = await findInstructorScope(tx, parsed.data.id);
  if (!scope) return { outcome: "IGNORED" };

  const state = connectAccountStatus({
    chargesEnabled: parsed.data.charges_enabled ?? false,
    payoutsEnabled: parsed.data.payouts_enabled ?? false,
    detailsSubmitted: parsed.data.details_submitted ?? false,
  });
  await tx
    .update(instructor)
    .set({
      stripeOnboardingComplete: state.onboardingComplete,
      stripeAccountStatus: state.accountStatus,
      updatedAt: new Date(),
    })
    .where(eq(instructor.id, scope.id));

  return processedScope(scope);
}

async function applyConnectedAccountPayout(
  tx: CommerceTransaction,
  event: StripeEventEnvelope,
  receiptId: string,
): Promise<StripeEventHandlerResult> {
  if (!event.accountId) {
    throw new PermanentStripeEventError(
      "STRIPE_CONNECT_ACCOUNT_MISSING",
      "Connected-account payout event is missing its Stripe account",
    );
  }
  const parsed = stripeConnectPayoutSchema.safeParse(event.dataObject);
  if (!parsed.success) {
    throw new PermanentStripeEventError(
      "STRIPE_CONNECT_PAYOUT_INVALID",
      "Stripe Connect payout event has an invalid object contract",
    );
  }
  const scope = await findInstructorScope(tx, event.accountId);
  if (!scope) return { outcome: "IGNORED" };

  const status = connectPayoutLedgerStatus(parsed.data.status);
  const ledger = await writeCommerceLedgerEntry(tx, {
    organizationId: scope.organizationId,
    locationId: scope.locationId,
    provider: "STRIPE",
    instructorId: scope.id,
    providerAccountId: event.accountId,
    providerObjectId: parsed.data.id,
    providerObjectType: "payout",
    kind: "PAYOUT",
    status,
    amountMinor: parsed.data.amount,
    currency: parsed.data.currency,
    currencyExponent: currencyExponent(parsed.data.currency),
    stripeEventId: receiptId,
    occurredAt: new Date(event.created * 1_000),
    metadata: { instructorId: scope.id },
  });
  if (!ledger.created && ledger.entry.status !== status) {
    await tx
      .update(commerceLedgerEntry)
      .set({ status, stripeEventId: receiptId, updatedAt: new Date() })
      .where(eq(commerceLedgerEntry.id, ledger.entry.id));
  }

  return processedScope(scope);
}

async function findInstructorScope(
  tx: CommerceTransaction,
  stripeAccountId: string,
): Promise<InstructorScope | null> {
  const rows = await tx
    .select({
      id: instructor.id,
      organizationId: instructor.organizationId,
      locationId: instructor.locationId,
    })
    .from(instructor)
    .where(eq(instructor.stripeAccountId, stripeAccountId))
    .limit(2);
  if (rows.length > 1) {
    throw new PermanentStripeEventError(
      "STRIPE_CONNECT_ACCOUNT_CONFLICT",
      "Stripe Connect account is assigned to multiple instructors",
    );
  }
  return rows[0] ?? null;
}

function processedScope(scope: InstructorScope): StripeEventHandlerResult {
  return {
    outcome: "PROCESSED",
    organizationId: scope.organizationId,
    locationId: scope.locationId,
    instructorId: scope.id,
  };
}
