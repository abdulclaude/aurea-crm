import "server-only";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import {
  clientAccountBalance,
  clientAccountCreditTransaction,
  giftCard,
} from "@/db/schema";
import {
  decimalToMinorUnits,
  minorUnitsToDecimal,
  normalizeCurrency,
} from "@/features/commerce/lib/money";

import type { TenderAllocationInput } from "../ledger-writer";
import { PermanentStripeEventError } from "./stripe-event-contract";
import type { CommerceTransaction } from "./stripe-event-receipt";

export type CheckoutInternalTenders = {
  giftCardId: string | null;
  giftCardAmountMinor: number;
  accountBalanceId: string | null;
  accountCreditAmountMinor: number;
};

export function parseCheckoutInternalTenders(input: {
  metadata: Record<string, string>;
  currencyExponent: number;
}): CheckoutInternalTenders {
  const giftCardId = nonEmpty(input.metadata.giftCardId);
  const accountBalanceId = nonEmpty(input.metadata.accountBalanceId);
  const giftCardAmountMinor = parseOptionalMoney(
    input.metadata.giftCardAmount,
    input.currencyExponent,
  );
  const accountCreditAmountMinor = parseOptionalMoney(
    input.metadata.accountCreditAmount,
    input.currencyExponent,
  );

  if ((giftCardId === null) !== (giftCardAmountMinor === 0)) {
    throw new PermanentStripeEventError(
      "GIFT_CARD_TENDER_INVALID",
      "Gift card checkout metadata is incomplete",
    );
  }
  if ((accountBalanceId === null) !== (accountCreditAmountMinor === 0)) {
    throw new PermanentStripeEventError(
      "ACCOUNT_CREDIT_TENDER_INVALID",
      "Account credit checkout metadata is incomplete",
    );
  }

  return {
    giftCardId,
    giftCardAmountMinor,
    accountBalanceId,
    accountCreditAmountMinor,
  };
}

export function tenderAllocations(input: {
  stripeAmountMinor: number;
  internal: CheckoutInternalTenders;
}): TenderAllocationInput[] {
  const tenders: TenderAllocationInput[] = [];
  if (input.stripeAmountMinor > 0) {
    tenders.push({ type: "STRIPE", amountMinor: input.stripeAmountMinor });
  }
  if (input.internal.giftCardId && input.internal.giftCardAmountMinor > 0) {
    tenders.push({
      type: "GIFT_CARD",
      amountMinor: input.internal.giftCardAmountMinor,
      sourceId: input.internal.giftCardId,
    });
  }
  if (
    input.internal.accountBalanceId &&
    input.internal.accountCreditAmountMinor > 0
  ) {
    tenders.push({
      type: "ACCOUNT_CREDIT",
      amountMinor: input.internal.accountCreditAmountMinor,
      sourceId: input.internal.accountBalanceId,
    });
  }
  return tenders;
}

export function totalTenderMinor(input: {
  stripeAmountMinor: number;
  internal: CheckoutInternalTenders;
}): number {
  const total =
    input.stripeAmountMinor +
    input.internal.giftCardAmountMinor +
    input.internal.accountCreditAmountMinor;
  if (!Number.isSafeInteger(total)) {
    throw new PermanentStripeEventError(
      "TENDER_TOTAL_INVALID",
      "Checkout tender total exceeds the supported range",
    );
  }
  return total;
}

export async function redeemInternalTenders(input: {
  tx: CommerceTransaction;
  organizationId: string;
  locationId: string | null;
  clientId: string;
  currency: string;
  currencyExponent: number;
  paymentId: string;
  pricingOptionId: string | null;
  tenders: CheckoutInternalTenders;
}): Promise<void> {
  const currency = normalizeCurrency(input.currency);
  if (input.tenders.giftCardId) {
    const [card] = await input.tx
      .select()
      .from(giftCard)
      .where(eq(giftCard.id, input.tenders.giftCardId))
      .for("update");
    if (
      !card ||
      card.organizationId !== input.organizationId ||
      (card.locationId !== null && card.locationId !== input.locationId) ||
      normalizeCurrency(card.currency) !== currency ||
      !card.isActive ||
      (card.expiresAt !== null && card.expiresAt <= new Date())
    ) {
      throw new PermanentStripeEventError(
        "GIFT_CARD_SCOPE_INVALID",
        "Gift card is unavailable for this checkout scope",
      );
    }

    const availableMinor = decimalToMinorUnits(
      card.remainingBalance,
      input.currencyExponent,
    );
    if (availableMinor < input.tenders.giftCardAmountMinor) {
      throw new PermanentStripeEventError(
        "GIFT_CARD_BALANCE_INSUFFICIENT",
        "Gift card balance no longer covers the checkout allocation",
      );
    }
    const remainingMinor = availableMinor - input.tenders.giftCardAmountMinor;
    await input.tx
      .update(giftCard)
      .set({
        remainingBalance: minorUnitsToDecimal(
          remainingMinor,
          input.currencyExponent,
        ),
        isActive: remainingMinor > 0,
        redeemedAt: remainingMinor === 0 ? new Date() : null,
        redeemedByClientId: input.clientId,
        updatedAt: new Date(),
      })
      .where(eq(giftCard.id, card.id));
  }

  if (input.tenders.accountBalanceId) {
    const [balance] = await input.tx
      .select()
      .from(clientAccountBalance)
      .where(eq(clientAccountBalance.id, input.tenders.accountBalanceId))
      .for("update");
    if (
      !balance ||
      balance.organizationId !== input.organizationId ||
      balance.locationId !== input.locationId ||
      balance.clientId !== input.clientId ||
      normalizeCurrency(balance.currency) !== currency
    ) {
      throw new PermanentStripeEventError(
        "ACCOUNT_CREDIT_SCOPE_INVALID",
        "Account credit is unavailable for this checkout scope",
      );
    }

    const availableMinor = decimalToMinorUnits(
      balance.balance,
      input.currencyExponent,
    );
    if (availableMinor < input.tenders.accountCreditAmountMinor) {
      throw new PermanentStripeEventError(
        "ACCOUNT_CREDIT_BALANCE_INSUFFICIENT",
        "Account credit balance no longer covers the checkout allocation",
      );
    }
    const remainingMinor = availableMinor - input.tenders.accountCreditAmountMinor;
    const now = new Date();
    await input.tx
      .update(clientAccountBalance)
      .set({
        balance: minorUnitsToDecimal(remainingMinor, input.currencyExponent),
        updatedAt: now,
      })
      .where(eq(clientAccountBalance.id, balance.id));
    await input.tx.insert(clientAccountCreditTransaction).values({
      id: randomUUID(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: input.clientId,
      balanceId: balance.id,
      paymentId: input.paymentId,
      pricingOptionId: input.pricingOptionId,
      type: "REDEMPTION",
      amount: minorUnitsToDecimal(
        -input.tenders.accountCreditAmountMinor,
        input.currencyExponent,
      ),
      currency,
      description: "Account credit redemption",
      metadata: {},
      updatedAt: now,
    });
  }
}

function parseOptionalMoney(value: string | undefined, exponent: number): number {
  if (!value?.trim()) return 0;
  const amount = decimalToMinorUnits(value, exponent);
  if (amount <= 0) {
    throw new PermanentStripeEventError(
      "TENDER_AMOUNT_INVALID",
      "Checkout tender allocations must be greater than zero",
    );
  }
  return amount;
}

function nonEmpty(value: string | undefined): string | null {
  return value?.trim() ? value : null;
}
