import "server-only";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import {
  commerceLedgerEntry,
  commerceTenderAllocation,
} from "@/db/schema";
import { commerceLedgerIdempotencyKey } from "@/features/commerce/lib/ledger-key";
import { assertMinorUnits, normalizeCurrency } from "@/features/commerce/lib/money";

import { PermanentStripeEventError } from "./stripe/stripe-event-contract";
import type { CommerceTransaction } from "./stripe/stripe-event-receipt";

type LedgerKind = typeof commerceLedgerEntry.$inferInsert.kind;
type LedgerStatus = typeof commerceLedgerEntry.$inferInsert.status;
type TenderType = typeof commerceTenderAllocation.$inferInsert.type;

export type TenderAllocationInput = {
  type: TenderType;
  amountMinor: number;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
};

export type CommerceLedgerInput = {
  organizationId: string;
  locationId: string | null;
  operationId?: string | null;
  provider: string;
  stripeConnectionId?: string | null;
  instructorId?: string | null;
  providerAccountId?: string | null;
  providerObjectId: string;
  providerObjectType: string;
  kind: LedgerKind;
  status: LedgerStatus;
  paymentIntentId?: string | null;
  chargeId?: string | null;
  checkoutSessionId?: string | null;
  amountMinor: number;
  feeMinor?: number | null;
  netMinor?: number | null;
  currency: string;
  currencyExponent: number;
  clientId?: string | null;
  membershipId?: string | null;
  bookingId?: string | null;
  studioBookingId?: string | null;
  invoiceId?: string | null;
  studioPaymentId?: string | null;
  invoicePaymentId?: string | null;
  stripeEventId?: string | null;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
  tenders?: TenderAllocationInput[];
};

export type CommerceLedgerWriteResult = {
  entry: typeof commerceLedgerEntry.$inferSelect;
  created: boolean;
};

export async function writeCommerceLedgerEntry(
  tx: CommerceTransaction,
  input: CommerceLedgerInput,
): Promise<CommerceLedgerWriteResult> {
  const currency = normalizeCurrency(input.currency);
  const idempotencyKey = commerceLedgerIdempotencyKey(input);
  assertMinorUnits(input.amountMinor);
  assertTenderTotal(input.amountMinor, input.tenders);
  if (
    input.provider.toUpperCase() === "STRIPE" &&
    input.kind !== "PAYOUT" &&
    (!input.stripeConnectionId || !input.providerAccountId)
  ) {
    throw new PermanentStripeEventError(
      "STRIPE_ACCOUNT_UNBOUND",
      "Stripe ledger entries require an immutable workspace account binding",
    );
  }
  if (
    input.provider.toUpperCase() === "STRIPE" &&
    input.kind === "PAYOUT" &&
    (!input.instructorId || !input.providerAccountId)
  ) {
    throw new PermanentStripeEventError(
      "STRIPE_INSTRUCTOR_ACCOUNT_UNBOUND",
      "Stripe payout entries require an immutable instructor account binding",
    );
  }
  if (input.feeMinor !== null && input.feeMinor !== undefined) {
    assertMinorUnits(input.feeMinor);
  }

  const [created] = await tx
    .insert(commerceLedgerEntry)
    .values({
      id: randomUUID(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      operationId: input.operationId,
      provider: input.provider,
      stripeConnectionId: input.stripeConnectionId,
      instructorId: input.instructorId,
      providerAccountId: input.providerAccountId,
      idempotencyKey,
      providerObjectId: input.providerObjectId,
      providerObjectType: input.providerObjectType,
      kind: input.kind,
      status: input.status,
      paymentIntentId: input.paymentIntentId,
      chargeId: input.chargeId,
      checkoutSessionId: input.checkoutSessionId,
      amountMinor: input.amountMinor,
      feeMinor: input.feeMinor,
      netMinor: input.netMinor,
      currency,
      currencyExponent: input.currencyExponent,
      clientId: input.clientId,
      membershipId: input.membershipId,
      bookingId: input.bookingId,
      studioBookingId: input.studioBookingId,
      invoiceId: input.invoiceId,
      studioPaymentId: input.studioPaymentId,
      invoicePaymentId: input.invoicePaymentId,
      stripeEventId: input.stripeEventId,
      occurredAt: input.occurredAt,
      metadata: input.metadata ?? {},
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: commerceLedgerEntry.idempotencyKey })
    .returning();

  if (created) {
    if (input.tenders && input.tenders.length > 0) {
      await tx.insert(commerceTenderAllocation).values(
        input.tenders.map((tender) => {
          assertMinorUnits(tender.amountMinor);
          return {
            id: randomUUID(),
            organizationId: input.organizationId,
            locationId: input.locationId,
            ledgerEntryId: created.id,
            type: tender.type,
            amountMinor: tender.amountMinor,
            currency,
            currencyExponent: input.currencyExponent,
            sourceId: tender.sourceId,
            metadata: tender.metadata ?? {},
          };
        }),
      );
    }

    return { entry: created, created: true };
  }

  const existing = await tx.query.commerceLedgerEntry.findFirst({
    where: eq(commerceLedgerEntry.idempotencyKey, idempotencyKey),
  });
  if (!existing) {
    throw new Error("Commerce ledger conflict could not be resolved");
  }

  if (
    existing.organizationId !== input.organizationId ||
    existing.locationId !== input.locationId ||
    existing.stripeConnectionId !== (input.stripeConnectionId ?? null) ||
    existing.instructorId !== (input.instructorId ?? null) ||
    existing.providerAccountId !== (input.providerAccountId ?? null) ||
    existing.amountMinor !== input.amountMinor ||
    existing.currency !== currency ||
    existing.kind !== input.kind
  ) {
    throw new PermanentStripeEventError(
      "LEDGER_IDEMPOTENCY_CONFLICT",
      "A provider object was already recorded with different commerce values",
    );
  }

  return { entry: existing, created: false };
}

export function assertTenderTotal(
  amountMinor: number,
  tenders: TenderAllocationInput[] | undefined,
): void {
  if (!tenders || tenders.length === 0) return;

  let allocatedMinor = 0;
  for (const tender of tenders) {
    assertMinorUnits(tender.amountMinor);
    allocatedMinor += tender.amountMinor;
    if (!Number.isSafeInteger(allocatedMinor)) {
      throw new PermanentStripeEventError(
        "TENDER_TOTAL_INVALID",
        "Commerce tender allocations exceed the supported range",
      );
    }
  }

  if (allocatedMinor !== amountMinor) {
    throw new PermanentStripeEventError(
      "TENDER_TOTAL_MISMATCH",
      "Commerce tender allocations must equal the ledger amount",
    );
  }
}
