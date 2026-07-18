import "server-only";

import { randomUUID } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";

import {
  classCredit,
  client,
  clientAccountBalance,
  clientAccountCreditTransaction,
  commerceLedgerEntry,
  commerceOperation,
  giftCard,
  membershipPlan,
  pricingOption,
  promoCode,
  studioBooking,
  studioClass,
  studioMembership,
  studioPayment,
} from "@/db/schema";
import {
  decimalToMinorUnits,
  minorUnitsToDecimal,
  normalizeCurrency,
} from "@/features/commerce/lib/money";

import { writeCommerceLedgerEntry } from "../ledger-writer";
import { completeCommerceOperation } from "../operations";
import {
  openPaymentRecoveryCase,
  resolvePaymentRecoveryCases,
} from "../recovery/payment-recovery-case-service";
import type { ResolvedCheckout } from "./resolve-checkout-scope";
import { PermanentStripeEventError } from "./stripe-event-contract";
import type { CommerceTransaction } from "./stripe-event-receipt";
import {
  parseCheckoutInternalTenders,
  redeemInternalTenders,
  tenderAllocations,
  totalTenderMinor,
} from "./studio-tender-service";

type ApplyCheckoutInput = {
  tx: CommerceTransaction;
  checkout: ResolvedCheckout;
  receiptId: string;
  occurredAt: Date;
};

export async function applyStudioCheckout(
  input: ApplyCheckoutInput,
): Promise<void> {
  switch (input.checkout.kind) {
    case "MEMBERSHIP":
      await applyMembershipCheckout(input);
      return;
    case "GIFT_CARD":
      await applyGiftCardCheckout(input);
      return;
    case "ACCOUNT_CREDIT":
      await applyAccountCreditCheckout(input);
      return;
    case "CLASS_BOOKING":
      await applyClassBookingCheckout(input);
      return;
    default:
      throw new PermanentStripeEventError(
        "STUDIO_CHECKOUT_KIND_INVALID",
        "Checkout is not a supported studio purchase",
      );
  }
}

async function applyClassBookingCheckout(
  input: ApplyCheckoutInput,
): Promise<void> {
  const { checkout, tx } = input;
  if (
    !checkout.studioBookingId ||
    !checkout.clientId ||
    !checkout.paymentIntentId ||
    checkout.amountMinor <= 0
  ) {
    throw missingReference("Class booking checkout");
  }
  const [selected] = await tx
    .select({
      id: studioBooking.id,
      clientId: studioBooking.clientId,
      status: studioBooking.status,
      paymentStatus: studioBooking.paymentStatus,
      amount: studioBooking.amount,
      currency: studioBooking.currency,
      holdExpiresAt: studioBooking.holdExpiresAt,
      classId: studioBooking.classId,
      organizationId: studioClass.organizationId,
      locationId: studioClass.locationId,
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioBooking.classId, studioClass.id))
    .where(eq(studioBooking.id, checkout.studioBookingId))
    .limit(1)
    .for("update");
  if (
    !selected ||
    selected.organizationId !== checkout.organizationId ||
    selected.locationId !== checkout.locationId ||
    selected.clientId !== checkout.clientId ||
    !selected.amount ||
    normalizeCurrency(selected.currency ?? "") !== checkout.currency ||
    decimalToMinorUnits(selected.amount, checkout.currencyExponent) !==
      checkout.amountMinor
  ) {
    throw new PermanentStripeEventError(
      "CLASS_BOOKING_SCOPE_MISMATCH",
      "Class booking does not match the resolved checkout scope and amount",
    );
  }

  const ledger = await writeCommerceLedgerEntry(tx, {
    ...ledgerBase(input),
    providerObjectId: checkout.paymentIntentId,
    providerObjectType: "payment_intent",
    kind: "PAYMENT",
    status: "SUCCEEDED",
    paymentIntentId: checkout.paymentIntentId,
    amountMinor: checkout.amountMinor,
    clientId: checkout.clientId,
    studioBookingId: selected.id,
    tenders: [{ type: "STRIPE", amountMinor: checkout.amountMinor }],
    metadata: { classId: selected.classId },
  });
  let paymentId = ledger.entry.studioPaymentId;
  if (ledger.created) {
    paymentId = randomUUID();
    await tx.insert(studioPayment).values({
      id: paymentId,
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
      clientId: checkout.clientId,
      stripePaymentIntentId: checkout.paymentIntentId,
      stripeCustomerId: checkout.customerId,
      stripeConnectionId: checkout.stripeConnectionId,
      paymentMethod: "STRIPE",
      amount: minorUnitsToDecimal(
        checkout.amountMinor,
        checkout.currencyExponent,
      ),
      currency: checkout.currency,
      status: "SUCCEEDED",
      type: "DROP_IN",
      description: "Class booking payment",
      metadata: {
        commerceOperationId: checkout.operationId,
        studioBookingId: selected.id,
        classId: selected.classId,
      },
      updatedAt: new Date(),
    });
    await linkLedgerProjection(
      tx,
      ledger.entry.id,
      checkout.operationId,
      paymentId,
    );
  }

  const late =
    selected.status !== "BOOKED" ||
    (selected.holdExpiresAt !== null &&
      input.occurredAt > selected.holdExpiresAt);
  await tx
    .update(studioBooking)
    .set({
      paymentId,
      paymentStatus: "PAID",
      paymentFailureAt: null,
      holdExpiresAt: null,
      confirmedAt: late ? null : input.occurredAt,
      metadata: late
        ? sql`coalesce(${studioBooking.metadata}, '{}'::jsonb) || jsonb_build_object('latePaymentReceiptId', ${input.receiptId})`
        : sql`coalesce(${studioBooking.metadata}, '{}'::jsonb) || jsonb_build_object('classBookedWorkflowPending', true, 'paidWorkflowPending', true, 'paymentReceiptId', ${input.receiptId})`,
      updatedAt: new Date(),
    })
    .where(eq(studioBooking.id, selected.id));
  await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
  if (late) {
    await openPaymentRecoveryCase({
      tx,
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
      clientId: selected.clientId,
      target: "BOOKING",
      caseKey: `class-booking:${selected.id}:late-payment:${checkout.paymentIntentId}`,
      studioBookingId: selected.id,
      sourceEventId: input.receiptId,
      sourceEventAt: input.occurredAt,
      attemptKey: `stripe:${input.receiptId}:class-booking-late-payment`,
      amountMinor: checkout.amountMinor,
      currency: checkout.currency,
      currencyExponent: checkout.currencyExponent,
      studioPaymentId: paymentId,
      commerceOperationId: checkout.operationId,
      provider: "STRIPE",
      providerAccountRef: checkout.providerAccountId,
      stripeConnectionId: checkout.stripeConnectionId,
      providerObjectId: checkout.paymentIntentId,
      errorCode: "LATE_CLASS_BOOKING_PAYMENT",
      errorMessage:
        "Payment succeeded after the class booking hold was released; operator review is required.",
      operatorReviewOnly: true,
      metadata: { requiresRefundReview: true },
    });
  } else {
    await resolvePaymentRecoveryCases({
      tx,
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
      target: "BOOKING",
      resource: { studioBookingId: selected.id },
      sourceEventId: input.receiptId,
      occurredAt: input.occurredAt,
      attemptKey: `stripe:${input.receiptId}:class-booking-recovered`,
      provider: "STRIPE",
      providerAccountRef: checkout.providerAccountId,
      stripeConnectionId: checkout.stripeConnectionId,
      providerObjectId: checkout.paymentIntentId,
    });
  }
}

async function applyMembershipCheckout(
  input: ApplyCheckoutInput,
): Promise<void> {
  const { checkout, tx } = input;
  if (!checkout.clientId || !checkout.planId) {
    throw missingReference("Membership checkout");
  }

  const [operation] = await tx
    .select({ membershipId: commerceOperation.membershipId })
    .from(commerceOperation)
    .where(eq(commerceOperation.id, checkout.operationId))
    .for("update");
  if (operation?.membershipId) {
    await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
    return;
  }

  const [plan, targetClient] = await Promise.all([
    tx.query.membershipPlan.findFirst({
      where: eq(membershipPlan.id, checkout.planId),
    }),
    tx.query.client.findFirst({
      where: eq(client.id, checkout.clientId),
      columns: { id: true, organizationId: true, locationId: true },
    }),
  ]);
  if (
    !plan ||
    plan.organizationId !== checkout.organizationId ||
    !locationAllows(plan.locationId, checkout.locationId) ||
    plan.stripeConnectionId !== checkout.stripeConnectionId ||
    !targetClient ||
    targetClient.organizationId !== checkout.organizationId ||
    !locationAllows(targetClient.locationId, checkout.locationId)
  ) {
    throw new PermanentStripeEventError(
      "MEMBERSHIP_SCOPE_MISMATCH",
      "Membership checkout resources do not share the resolved tenant scope",
    );
  }
  if (normalizeCurrency(plan.currency) !== checkout.currency) {
    throw new PermanentStripeEventError(
      "MEMBERSHIP_CURRENCY_MISMATCH",
      "Membership plan currency does not match the Stripe checkout",
    );
  }

  const option = checkout.pricingOptionId
    ? await tx.query.pricingOption.findFirst({
        where: and(
          eq(pricingOption.id, checkout.pricingOptionId),
          eq(pricingOption.organizationId, checkout.organizationId),
        ),
      })
    : null;
  if (
    checkout.pricingOptionId &&
    (!option ||
      option.membershipPlanId !== plan.id ||
      !locationAllows(option.locationId, checkout.locationId) ||
      normalizeCurrency(option.currency) !== checkout.currency)
  ) {
    throw new PermanentStripeEventError(
      "PRICING_OPTION_SCOPE_MISMATCH",
      "Pricing option does not match the resolved membership checkout",
    );
  }

  const internal = parseCheckoutInternalTenders({
    metadata: checkout.metadata,
    currencyExponent: checkout.currencyExponent,
  });
  const saleMinor = totalTenderMinor({
    stripeAmountMinor: checkout.amountMinor,
    internal,
  });
  const baseMinor = decimalToMinorUnits(
    option?.price ?? plan.price,
    checkout.currencyExponent,
  );
  if (saleMinor > baseMinor) {
    throw new PermanentStripeEventError(
      "MEMBERSHIP_TENDER_OVERPAYMENT",
      "Membership tender allocations exceed the configured price",
    );
  }

  const membershipId = randomUUID();
  const metadata = {
    ...(checkout.pricingOptionId
      ? { pricingOptionId: checkout.pricingOptionId }
      : {}),
    commerce: {
      operationId: checkout.operationId,
      currencyExponent: checkout.currencyExponent,
      baseAmountMinor: baseMinor,
      promoCodeId: checkout.metadata.promoCodeId || null,
      pricingOptionId: checkout.pricingOptionId,
      pendingTenders: checkout.subscriptionId ? internal : null,
    },
    purchaseReceiptId: input.receiptId,
  };
  await tx.insert(studioMembership).values({
    id: membershipId,
    clientId: checkout.clientId,
    organizationId: checkout.organizationId,
    locationId: checkout.locationId,
    stripeConnectionId: checkout.stripeConnectionId,
    planId: plan.id,
    name: plan.name,
    type: plan.type,
    status: "ACTIVE",
    startDate: input.occurredAt,
    endDate: plan.durationDays
      ? new Date(input.occurredAt.getTime() + plan.durationDays * 86_400_000)
      : null,
    totalClasses: plan.classCredits,
    usedClasses: 0,
    price: minorUnitsToDecimal(baseMinor, checkout.currencyExponent),
    currency: checkout.currency,
    metadata,
    stripeSubscriptionId: checkout.subscriptionId,
    autoRenew: plan.billingInterval !== "ONE_TIME",
    updatedAt: new Date(),
  });
  await tx
    .update(commerceOperation)
    .set({ membershipId, updatedAt: new Date() })
    .where(eq(commerceOperation.id, checkout.operationId));

  if (checkout.metadata.promoCodeId) {
    const [promotion] = await tx
      .select()
      .from(promoCode)
      .where(eq(promoCode.id, checkout.metadata.promoCodeId))
      .for("update");
    if (
      !promotion ||
      promotion.organizationId !== checkout.organizationId ||
      !locationAllows(promotion.locationId, checkout.locationId) ||
      !promotion.isActive ||
      (promotion.expiresAt !== null &&
        promotion.expiresAt <= input.occurredAt) ||
      (promotion.maxRedemptions !== null &&
        promotion.redemptionCount >= promotion.maxRedemptions)
    ) {
      throw new PermanentStripeEventError(
        "PROMOTION_REDEMPTION_INVALID",
        "Promotion is no longer valid for this checkout",
      );
    }
    await tx
      .update(promoCode)
      .set({
        redemptionCount: sql`${promoCode.redemptionCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(promoCode.id, checkout.metadata.promoCodeId));
  }

  if (!checkout.subscriptionId) {
    const paymentId = await recordStudioSale({
      ...input,
      membershipId,
      saleMinor,
      baseMinor,
      paymentType: "MEMBERSHIP",
      description: `Membership: ${plan.name}`,
      internal,
    });
    await redeemInternalTenders({
      tx,
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
      clientId: checkout.clientId,
      currency: checkout.currency,
      currencyExponent: checkout.currencyExponent,
      paymentId,
      pricingOptionId: checkout.pricingOptionId,
      tenders: internal,
    });
  }

  if (plan.classCredits && plan.billingInterval === "ONE_TIME") {
    await tx.insert(classCredit).values({
      id: randomUUID(),
      membershipId,
      clientId: checkout.clientId,
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
      totalCredits: plan.classCredits,
      usedCredits: 0,
      metadata: { commerceOperationId: checkout.operationId },
      updatedAt: new Date(),
    });
  }
  await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
}

async function applyGiftCardCheckout(input: ApplyCheckoutInput): Promise<void> {
  const { checkout, tx } = input;
  if (
    !checkout.clientId ||
    !checkout.paymentIntentId ||
    checkout.amountMinor <= 0
  ) {
    throw missingReference("Gift card checkout");
  }
  await requireClientScope(tx, checkout);

  const ledger = await writeCommerceLedgerEntry(tx, {
    ...ledgerBase(input),
    providerObjectId: checkout.paymentIntentId,
    providerObjectType: "payment_intent",
    kind: "CREDIT",
    status: "SUCCEEDED",
    paymentIntentId: checkout.paymentIntentId,
    amountMinor: checkout.amountMinor,
    clientId: checkout.clientId,
    tenders: [{ type: "STRIPE", amountMinor: checkout.amountMinor }],
    metadata: { liabilityType: "GIFT_CARD" },
  });
  if (!ledger.created) {
    await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
    return;
  }

  const code = await uniqueGiftCardCode(tx, checkout.organizationId);
  const [card] = await tx
    .insert(giftCard)
    .values({
      id: randomUUID(),
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
      code,
      initialValue: minorUnitsToDecimal(
        checkout.amountMinor,
        checkout.currencyExponent,
      ),
      remainingBalance: minorUnitsToDecimal(
        checkout.amountMinor,
        checkout.currencyExponent,
      ),
      currency: checkout.currency,
      purchasedByClientId: checkout.clientId,
      stripePaymentIntentId: checkout.paymentIntentId,
      notes: giftCardNote(checkout.metadata),
      updatedAt: new Date(),
    })
    .returning({ id: giftCard.id, code: giftCard.code });
  const paymentId = await insertStudioPayment({
    tx,
    checkout,
    amountMinor: checkout.amountMinor,
    type: "GIFT_CARD",
    description: `Gift card sale: ${card.code}`,
    metadata: { giftCardId: card.id, liability: true },
  });
  await linkLedgerProjection(
    tx,
    ledger.entry.id,
    checkout.operationId,
    paymentId,
  );
  await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
}

async function applyAccountCreditCheckout(
  input: ApplyCheckoutInput,
): Promise<void> {
  const { checkout, tx } = input;
  if (
    !checkout.clientId ||
    !checkout.paymentIntentId ||
    !checkout.pricingOptionId ||
    checkout.amountMinor <= 0
  ) {
    throw missingReference("Account credit checkout");
  }
  await requireClientScope(tx, checkout);
  const option = await tx.query.pricingOption.findFirst({
    where: and(
      eq(pricingOption.id, checkout.pricingOptionId),
      eq(pricingOption.organizationId, checkout.organizationId),
      eq(pricingOption.type, "ACCOUNT_CREDIT"),
    ),
  });
  if (
    !option ||
    !locationAllows(option.locationId, checkout.locationId) ||
    normalizeCurrency(option.currency) !== checkout.currency ||
    decimalToMinorUnits(option.price, checkout.currencyExponent) !==
      checkout.amountMinor
  ) {
    throw new PermanentStripeEventError(
      "ACCOUNT_CREDIT_OPTION_MISMATCH",
      "Account credit purchase does not match its configured pricing option",
    );
  }

  const ledger = await writeCommerceLedgerEntry(tx, {
    ...ledgerBase(input),
    providerObjectId: checkout.paymentIntentId,
    providerObjectType: "payment_intent",
    kind: "CREDIT",
    status: "SUCCEEDED",
    paymentIntentId: checkout.paymentIntentId,
    amountMinor: checkout.amountMinor,
    clientId: checkout.clientId,
    tenders: [{ type: "STRIPE", amountMinor: checkout.amountMinor }],
    metadata: { liabilityType: "ACCOUNT_CREDIT" },
  });
  if (!ledger.created) {
    await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
    return;
  }

  const paymentId = await insertStudioPayment({
    tx,
    checkout,
    amountMinor: checkout.amountMinor,
    type: "ACCOUNT_CREDIT",
    description: "Account credit purchase",
    metadata: { pricingOptionId: option.id, liability: true },
  });
  const balanceId = await creditAccountBalance({
    tx,
    checkout,
    paymentId,
    pricingOptionId: option.id,
  });
  await linkLedgerProjection(
    tx,
    ledger.entry.id,
    checkout.operationId,
    paymentId,
  );
  await tx
    .update(commerceLedgerEntry)
    .set({ metadata: { liabilityType: "ACCOUNT_CREDIT", balanceId } })
    .where(eq(commerceLedgerEntry.id, ledger.entry.id));
  await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
}

async function recordStudioSale(
  input: ApplyCheckoutInput & {
    membershipId: string;
    saleMinor: number;
    baseMinor: number;
    paymentType: "MEMBERSHIP";
    description: string;
    internal: ReturnType<typeof parseCheckoutInternalTenders>;
  },
): Promise<string> {
  const ledger = await writeCommerceLedgerEntry(input.tx, {
    ...ledgerBase(input),
    providerObjectId: input.checkout.checkoutSessionId,
    providerObjectType: "checkout.session",
    kind: "PAYMENT",
    status: "SUCCEEDED",
    paymentIntentId: input.checkout.paymentIntentId,
    amountMinor: input.saleMinor,
    clientId: input.checkout.clientId,
    membershipId: input.membershipId,
    tenders: tenderAllocations({
      stripeAmountMinor: input.checkout.amountMinor,
      internal: input.internal,
    }),
  });
  if (!ledger.created && ledger.entry.studioPaymentId) {
    return ledger.entry.studioPaymentId;
  }

  const paymentId = await insertStudioPayment({
    tx: input.tx,
    checkout: input.checkout,
    membershipId: input.membershipId,
    amountMinor: input.saleMinor,
    type: input.paymentType,
    description: input.description,
    discountMinor: input.baseMinor - input.saleMinor,
    metadata: { pricingOptionId: input.checkout.pricingOptionId },
  });
  await linkLedgerProjection(
    input.tx,
    ledger.entry.id,
    input.checkout.operationId,
    paymentId,
  );
  return paymentId;
}

async function insertStudioPayment(input: {
  tx: CommerceTransaction;
  checkout: ResolvedCheckout;
  membershipId?: string;
  amountMinor: number;
  type: "MEMBERSHIP" | "GIFT_CARD" | "ACCOUNT_CREDIT";
  description: string;
  discountMinor?: number;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const paymentId = randomUUID();
  await input.tx.insert(studioPayment).values({
    id: paymentId,
    organizationId: input.checkout.organizationId,
    locationId: input.checkout.locationId,
    clientId: input.checkout.clientId,
    membershipId: input.membershipId,
    stripePaymentIntentId: input.checkout.paymentIntentId,
    stripeCustomerId: input.checkout.customerId,
    stripeConnectionId: input.checkout.stripeConnectionId,
    paymentMethod: input.checkout.paymentIntentId
      ? "STRIPE"
      : "INTERNAL_CREDIT",
    amount: minorUnitsToDecimal(
      input.amountMinor,
      input.checkout.currencyExponent,
    ),
    currency: input.checkout.currency,
    status: "SUCCEEDED",
    type: input.type,
    description: input.description,
    promoCodeId: input.checkout.metadata.promoCodeId || null,
    discountAmount:
      input.discountMinor === undefined
        ? null
        : minorUnitsToDecimal(
            input.discountMinor,
            input.checkout.currencyExponent,
          ),
    metadata: {
      ...input.metadata,
      commerceOperationId: input.checkout.operationId,
    },
    updatedAt: new Date(),
  });
  return paymentId;
}

async function creditAccountBalance(input: {
  tx: CommerceTransaction;
  checkout: ResolvedCheckout;
  paymentId: string;
  pricingOptionId: string;
}): Promise<string> {
  if (!input.checkout.clientId)
    throw missingReference("Account credit purchase");
  const scopeWhere = and(
    eq(clientAccountBalance.organizationId, input.checkout.organizationId),
    eq(clientAccountBalance.clientId, input.checkout.clientId),
    input.checkout.locationId
      ? eq(clientAccountBalance.locationId, input.checkout.locationId)
      : isNull(clientAccountBalance.locationId),
  );
  let [balance] = await input.tx
    .select()
    .from(clientAccountBalance)
    .where(scopeWhere)
    .for("update");
  if (!balance) {
    await input.tx
      .insert(clientAccountBalance)
      .values({
        id: randomUUID(),
        organizationId: input.checkout.organizationId,
        locationId: input.checkout.locationId,
        clientId: input.checkout.clientId,
        balance: "0.00",
        currency: input.checkout.currency,
        metadata: {},
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
    [balance] = await input.tx
      .select()
      .from(clientAccountBalance)
      .where(scopeWhere)
      .for("update");
  }
  if (
    !balance ||
    normalizeCurrency(balance.currency) !== input.checkout.currency
  ) {
    throw new PermanentStripeEventError(
      "ACCOUNT_CREDIT_BALANCE_INVALID",
      "Account credit balance could not be created in the checkout currency",
    );
  }

  const nextMinor =
    decimalToMinorUnits(balance.balance, input.checkout.currencyExponent) +
    input.checkout.amountMinor;
  await input.tx
    .update(clientAccountBalance)
    .set({
      balance: minorUnitsToDecimal(nextMinor, input.checkout.currencyExponent),
      updatedAt: new Date(),
    })
    .where(eq(clientAccountBalance.id, balance.id));
  await input.tx.insert(clientAccountCreditTransaction).values({
    id: randomUUID(),
    organizationId: input.checkout.organizationId,
    locationId: input.checkout.locationId,
    clientId: input.checkout.clientId,
    balanceId: balance.id,
    paymentId: input.paymentId,
    pricingOptionId: input.pricingOptionId,
    type: "PURCHASE",
    amount: minorUnitsToDecimal(
      input.checkout.amountMinor,
      input.checkout.currencyExponent,
    ),
    currency: input.checkout.currency,
    description: "Account credit purchase",
    metadata: { commerceOperationId: input.checkout.operationId },
    updatedAt: new Date(),
  });
  return balance.id;
}

async function requireClientScope(
  tx: CommerceTransaction,
  checkout: ResolvedCheckout,
): Promise<void> {
  if (!checkout.clientId) throw missingReference("Studio checkout");
  const selected = await tx.query.client.findFirst({
    where: eq(client.id, checkout.clientId),
    columns: { organizationId: true, locationId: true },
  });
  if (
    !selected ||
    selected.organizationId !== checkout.organizationId ||
    !locationAllows(selected.locationId, checkout.locationId)
  ) {
    throw new PermanentStripeEventError(
      "CLIENT_SCOPE_MISMATCH",
      "Checkout client does not belong to the resolved tenant scope",
    );
  }
}

function ledgerBase(input: ApplyCheckoutInput) {
  return {
    organizationId: input.checkout.organizationId,
    locationId: input.checkout.locationId,
    operationId: input.checkout.operationId,
    provider: "STRIPE",
    stripeConnectionId: input.checkout.stripeConnectionId,
    providerAccountId: input.checkout.providerAccountId,
    checkoutSessionId: input.checkout.checkoutSessionId,
    currency: input.checkout.currency,
    currencyExponent: input.checkout.currencyExponent,
    stripeEventId: input.receiptId,
    occurredAt: input.occurredAt,
  };
}

async function linkLedgerProjection(
  tx: CommerceTransaction,
  ledgerId: string,
  operationId: string,
  paymentId: string,
): Promise<void> {
  await tx
    .update(commerceLedgerEntry)
    .set({ studioPaymentId: paymentId, updatedAt: new Date() })
    .where(eq(commerceLedgerEntry.id, ledgerId));
  await tx
    .update(commerceOperation)
    .set({ studioPaymentId: paymentId, updatedAt: new Date() })
    .where(eq(commerceOperation.id, operationId));
}

async function uniqueGiftCardCode(
  tx: CommerceTransaction,
  organizationId: string,
): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
    const existing = await tx.query.giftCard.findFirst({
      where: and(
        eq(giftCard.organizationId, organizationId),
        eq(giftCard.code, code),
      ),
      columns: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Unable to allocate a unique gift card code");
}

function giftCardNote(metadata: Record<string, string>): string | null {
  const recipient = metadata.recipientName || metadata.recipientEmail;
  if (!recipient && !metadata.message) return null;
  const recipientText = recipient
    ? `Recipient: ${metadata.recipientName || "Unspecified"} (${metadata.recipientEmail || "no email"})`
    : null;
  return [recipientText, metadata.message || null].filter(Boolean).join(". ");
}

function locationAllows(
  resource: string | null,
  checkout: string | null,
): boolean {
  return resource === null || resource === checkout;
}

function missingReference(subject: string): PermanentStripeEventError {
  return new PermanentStripeEventError(
    "STUDIO_PAYMENT_REFERENCE_MISSING",
    `${subject} is missing a required trusted payment reference`,
  );
}
