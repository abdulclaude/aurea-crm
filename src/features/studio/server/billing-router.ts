import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";

import { db } from "@/db";
import {
  client,
  clientAccountBalance,
  clientAccountCreditTransaction,
  giftCard,
  membershipPlan,
  organization,
  pricingOption,
  promoCode,
  stripeConnection,
  studioMembership,
  studioPayment,
} from "@/db/schema";
import { getStripePlatformClient } from "@/lib/stripe";
import { buildDestinationChargePaymentData } from "@/features/stripe-connect/lib/destination-charge";
import {
  attachStripeCheckoutToOperation,
  createOrReuseCheckoutOperation,
} from "@/features/commerce/server/operations";
import {
  currencyExponent,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import {
  baseProcedure,
  protectedProcedure,
  createTRPCRouter,
} from "@/trpc/init";
import { requireCapability } from "@/features/permissions/server/authorization";
import type { Capability } from "@/features/permissions/capabilities";
import {
  getPublicationControlBySource,
  getPublishedPublicationChannel,
} from "@/features/publications/public/resolver";
import {
  getPublishedPricingSnapshot,
  publishedPricingSourceIsCurrent,
} from "@/features/publications/public/pricing-snapshot";

const BILLING_INTERVAL_MAP = {
  WEEKLY: { interval: "week" as const, interval_count: 1 },
  MONTHLY: { interval: "month" as const, interval_count: 1 },
  QUARTERLY: { interval: "month" as const, interval_count: 3 },
  ANNUALLY: { interval: "year" as const, interval_count: 1 },
  ONE_TIME: null,
};

function moneyToMinorUnits(price: unknown, currency: string): number {
  if (typeof price !== "string" && typeof price !== "number") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The configured price is invalid.",
    });
  }
  try {
    return decimalToMinorUnits(String(price), currencyExponent(currency));
  } catch {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The configured price cannot be represented in its currency.",
    });
  }
}

function requireOrganization(orgId: string | null): string {
  if (!orgId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organisation",
    });
  return orgId;
}

function stripeObjectId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : (value?.id ?? null);
}

const checkoutBaseInputSchema = z.object({
  checkoutRequestId: z.string().uuid(),
  clientId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  promoCode: z.string().optional(),
  giftCardCode: z.string().optional(),
  accountCreditAmount: z.number().positive().optional(),
});

type CheckoutBaseInput = z.infer<typeof checkoutBaseInputSchema>;
type CheckoutContext = {
  orgId: string | null;
  locationId: string | null;
  requestedBy: string | null;
};

async function requireBillingCapability(
  ctx: {
    orgId: string | null;
    locationId: string | null;
    auth: { user: { id: string } };
  },
  capability: Capability,
): Promise<string> {
  const organizationId = requireOrganization(ctx.orgId);
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId,
      locationId: ctx.locationId,
    },
    capability,
    resource: { organizationId, locationId: ctx.locationId },
  });
  return organizationId;
}

async function ensureStripeCustomer({
  targetClient,
  orgId,
}: {
  targetClient: Pick<
    typeof client.$inferSelect,
    "id" | "email" | "name" | "stripeCustomerId"
  >;
  orgId: string;
}): Promise<string> {
  if (targetClient.stripeCustomerId) return targetClient.stripeCustomerId;

  const stripe = getStripePlatformClient();
  const customer = await stripe.customers.create(
    {
      email: targetClient.email ?? undefined,
      name: targetClient.name,
      metadata: { clientId: targetClient.id, organizationId: orgId },
    },
    { idempotencyKey: `customer_${targetClient.id}` },
  );

  await db
    .update(client)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(client.id, targetClient.id));

  return customer.id;
}

async function findStudioConnection({
  orgId,
  locationId,
}: {
  orgId: string;
  locationId: string | null;
}): Promise<{
  id: string;
  stripeAccountId: string;
  accountType: string;
  applicationFeePercent: string | null;
  applicationFeeFixed: string | null;
  chargesEnabled: boolean;
} | null> {
  return (
    (await db.query.stripeConnection.findFirst({
      where: and(
        eq(stripeConnection.organizationId, orgId),
        locationId
          ? eq(stripeConnection.locationId, locationId)
          : isNull(stripeConnection.locationId),
        eq(stripeConnection.isActive, true),
      ),
      columns: {
        id: true,
        stripeAccountId: true,
        accountType: true,
        applicationFeePercent: true,
        applicationFeeFixed: true,
        chargesEnabled: true,
      },
    })) ?? null
  );
}

type StudioStripeConnection = NonNullable<
  Awaited<ReturnType<typeof findStudioConnection>>
>;

async function requireStudioConnection(input: {
  orgId: string;
  locationId: string | null;
}): Promise<StudioStripeConnection> {
  const connection = await findStudioConnection(input);

  if (
    !connection ||
    !connection.chargesEnabled ||
    connection.accountType !== "express"
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Complete Stripe Express onboarding for this workspace before taking payments.",
    });
  }

  return connection;
}

function percentageApplicationFeeAmount(
  amountInPence: number,
  configuredPercent: string | null,
): number | undefined {
  const fee = percentageOfMinorUnits(
    amountInPence,
    parsePercentageBasisPoints(configuredPercent),
  );
  if (fee > 0 && fee >= amountInPence) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The Stripe application fee must be lower than the charge.",
    });
  }

  return fee > 0 ? fee : undefined;
}

function connectionApplicationFeeAmount(
  amountInPence: number,
  currency: string,
  connection: StudioStripeConnection,
): number | undefined {
  const percentBasisPoints = parsePercentageBasisPoints(
    connection.applicationFeePercent,
  );
  let fixedInPence: number;
  try {
    fixedInPence = decimalToMinorUnits(
      connection.applicationFeeFixed ?? "0",
      currencyExponent(currency),
    );
  } catch {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The Stripe application fee configuration is invalid.",
    });
  }
  if (fixedInPence < 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The Stripe application fee configuration is invalid.",
    });
  }

  const fee =
    percentageOfMinorUnits(amountInPence, percentBasisPoints) + fixedInPence;
  if (fee > 0 && fee >= amountInPence) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The Stripe application fee must be lower than the charge.",
    });
  }

  return fee > 0 ? fee : undefined;
}

function validatedApplicationFeePercent(
  configuredPercent: string | null,
): number | undefined {
  const basisPoints = parsePercentageBasisPoints(configuredPercent);
  return basisPoints > 0 ? basisPoints / 100 : undefined;
}

function parsePercentageBasisPoints(
  value: string | null,
  message = "The Stripe application fee percentage is invalid.",
): number {
  try {
    const basisPoints = decimalToMinorUnits(value ?? "0", 2);
    if (basisPoints < 0 || basisPoints > 10_000)
      throw new Error("out of range");
    return basisPoints;
  } catch {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message,
    });
  }
}

function percentageOfMinorUnits(
  amountMinor: number,
  basisPoints: number,
): number {
  const whole = Math.trunc(amountMinor / 10_000) * basisPoints;
  const remainder = Math.round(((amountMinor % 10_000) * basisPoints) / 10_000);
  const total = whole + remainder;
  if (!Number.isSafeInteger(total)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The Stripe application fee exceeds the supported range.",
    });
  }
  return total;
}

async function enforcePricingOptionPurchaseLimits({
  orgId,
  locationId,
  clientId,
  pricingOptionId,
  maxPurchases,
  maxPurchasesPerClient,
}: {
  orgId: string;
  locationId: string | null;
  clientId: string;
  pricingOptionId: string;
  maxPurchases: number | null;
  maxPurchasesPerClient: number | null;
}) {
  if (!maxPurchases && !maxPurchasesPerClient) return;

  const baseConditions = [
    eq(studioPayment.organizationId, orgId),
    locationId
      ? eq(studioPayment.locationId, locationId)
      : isNull(studioPayment.locationId),
    eq(studioPayment.status, "SUCCEEDED"),
    sql`${studioPayment.metadata}->>'pricingOptionId' = ${pricingOptionId}`,
  ];

  if (maxPurchases) {
    const [result] = await db
      .select({ total: count() })
      .from(studioPayment)
      .where(and(...baseConditions));
    if ((result?.total ?? 0) >= maxPurchases) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This pricing option has reached its purchase limit.",
      });
    }
  }

  if (maxPurchasesPerClient) {
    const [result] = await db
      .select({ total: count() })
      .from(studioPayment)
      .where(and(...baseConditions, eq(studioPayment.clientId, clientId)));
    if ((result?.total ?? 0) >= maxPurchasesPerClient) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "This client has reached the purchase limit for this pricing option.",
      });
    }
  }
}

async function createCheckoutForMembershipPlan({
  ctx,
  input,
  planId,
  pricingOptionId,
}: {
  ctx: CheckoutContext;
  input: CheckoutBaseInput;
  planId: string;
  pricingOptionId?: string;
}): Promise<{ sessionId: string; url: string | null; operationId: string }> {
  const orgId = requireOrganization(ctx.orgId);

  const [plan, targetClient] = await Promise.all([
    db.query.membershipPlan.findFirst({
      where: and(
        eq(membershipPlan.id, planId),
        eq(membershipPlan.organizationId, orgId),
        ctx.locationId
          ? eq(membershipPlan.locationId, ctx.locationId)
          : isNull(membershipPlan.locationId),
        eq(membershipPlan.isActive, true),
      ),
    }),
    db.query.client.findFirst({
      where: and(
        eq(client.id, input.clientId),
        eq(client.organizationId, orgId),
      ),
      columns: { id: true, email: true, name: true, stripeCustomerId: true },
    }),
  ]);

  if (!plan)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Membership plan not found",
    });
  if (!targetClient)
    throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
  if (!plan.stripePriceId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Plan not synced with Stripe. Run syncPlanWithStripe first.",
    });
  }

  if (pricingOptionId) {
    const option = await db.query.pricingOption.findFirst({
      where: and(
        eq(pricingOption.id, pricingOptionId),
        eq(pricingOption.organizationId, orgId),
        ctx.locationId
          ? eq(pricingOption.locationId, ctx.locationId)
          : isNull(pricingOption.locationId),
        eq(pricingOption.isActive, true),
      ),
      columns: {
        id: true,
        maxPurchases: true,
        maxPurchasesPerClient: true,
      },
    });
    if (!option) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Pricing option not found",
      });
    }
    await enforcePricingOptionPurchaseLimits({
      orgId,
      locationId: ctx.locationId,
      clientId: targetClient.id,
      pricingOptionId: option.id,
      maxPurchases: option.maxPurchases,
      maxPurchasesPerClient: option.maxPurchasesPerClient,
    });
  }

  const studioConnection = await requireStudioConnection({
    orgId,
    locationId: ctx.locationId,
  });
  if (plan.stripeConnectionId !== studioConnection.id) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Sync this membership plan with the current Stripe account.",
    });
  }
  const stripe = getStripePlatformClient();

  const customerId = await ensureStripeCustomer({ targetClient, orgId });

  const checkoutCurrency = normalizeCurrency(plan.currency ?? "GBP");
  const checkoutCurrencyExponent = currencyExponent(checkoutCurrency);
  const subtotalPence = moneyToMinorUnits(plan.price, checkoutCurrency);
  let remainingPence = subtotalPence;
  const checkoutDiscounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
  let promoCodeId: string | undefined;
  if (input.promoCode) {
    const promo = await db.query.promoCode.findFirst({
      where: and(
        eq(promoCode.organizationId, orgId),
        eq(promoCode.code, input.promoCode.toUpperCase()),
        eq(promoCode.isActive, true),
        ctx.locationId
          ? or(
              isNull(promoCode.locationId),
              eq(promoCode.locationId, ctx.locationId),
            )
          : isNull(promoCode.locationId),
      ),
    });
    if (!promo) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid or expired promo code",
      });
    }
    if (
      promo.maxRedemptions !== null &&
      promo.redemptionCount >= promo.maxRedemptions
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Promo code has reached its redemption limit",
      });
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Promo code has expired",
      });
    }
    const applicablePlanIds = promo.applicablePlanIds ?? [];
    if (applicablePlanIds.length > 0 && !applicablePlanIds.includes(plan.id)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Promo code is not valid for this membership plan",
      });
    }
    const applicablePricingOptionIds = promo.applicablePricingOptionIds ?? [];
    if (
      applicablePricingOptionIds.length > 0 &&
      (!pricingOptionId ||
        !applicablePricingOptionIds.includes(pricingOptionId))
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Promo code is not valid for this pricing option",
      });
    }

    const discountPence =
      promo.discountType === "PERCENT"
        ? percentageOfMinorUnits(
            subtotalPence,
            parsePercentageBasisPoints(
              String(promo.discountValue),
              "The promotion percentage is invalid.",
            ),
          )
        : moneyToMinorUnits(promo.discountValue, checkoutCurrency);
    const cappedDiscountPence = Math.min(discountPence, remainingPence);
    if (cappedDiscountPence > 0) {
      const coupon = await stripe.coupons.create(
        promo.discountType === "PERCENT"
          ? {
              duration: "once",
              name: `Promo ${promo.code}`,
              percent_off: Number(promo.discountValue),
              metadata: { promoCodeId: promo.id, organizationId: orgId },
            }
          : {
              amount_off: cappedDiscountPence,
              currency: (plan.currency ?? "GBP").toLowerCase(),
              duration: "once",
              name: `Promo ${promo.code}`,
              metadata: { promoCodeId: promo.id, organizationId: orgId },
            },
        {
          idempotencyKey: `coupon_promo_${promo.id}_${plan.id}_${subtotalPence}`,
        },
      );
      checkoutDiscounts.push({ coupon: coupon.id });
      remainingPence = Math.max(0, remainingPence - cappedDiscountPence);
    }
    promoCodeId = promo.id;
  }

  let giftCardId: string | undefined;
  let giftCardAmountPence = 0;
  if (input.giftCardCode) {
    const card = await db.query.giftCard.findFirst({
      where: and(
        eq(giftCard.organizationId, orgId),
        eq(giftCard.code, input.giftCardCode.toUpperCase()),
        eq(giftCard.isActive, true),
        ctx.locationId
          ? or(
              isNull(giftCard.locationId),
              eq(giftCard.locationId, ctx.locationId),
            )
          : isNull(giftCard.locationId),
      ),
      columns: {
        id: true,
        code: true,
        currency: true,
        remainingBalance: true,
        expiresAt: true,
      },
    });
    if (!card) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Gift card not found",
      });
    }
    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Gift card has expired",
      });
    }
    if (normalizeCurrency(card.currency) !== checkoutCurrency) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Gift card currency does not match this membership plan.",
      });
    }
    giftCardAmountPence = Math.min(
      moneyToMinorUnits(card.remainingBalance, checkoutCurrency),
      remainingPence,
    );
    if (giftCardAmountPence > 0) {
      const coupon = await stripe.coupons.create(
        {
          amount_off: giftCardAmountPence,
          currency: (plan.currency ?? card.currency ?? "GBP").toLowerCase(),
          duration: "once",
          name: `Gift card ${card.code}`,
          metadata: { giftCardId: card.id, organizationId: orgId },
        },
        {
          idempotencyKey: `coupon_gift_${card.id}_${plan.id}_${giftCardAmountPence}`,
        },
      );
      checkoutDiscounts.push({ coupon: coupon.id });
      remainingPence = Math.max(0, remainingPence - giftCardAmountPence);
      giftCardId = card.id;
    }
  }

  let accountBalanceId: string | undefined;
  let accountCreditAmountPence = 0;
  if (input.accountCreditAmount) {
    const balance = await db.query.clientAccountBalance.findFirst({
      where: and(
        eq(clientAccountBalance.organizationId, orgId),
        eq(clientAccountBalance.clientId, targetClient.id),
        ctx.locationId
          ? eq(clientAccountBalance.locationId, ctx.locationId)
          : isNull(clientAccountBalance.locationId),
      ),
      columns: { id: true, balance: true, currency: true },
    });

    if (!balance || Number(balance.balance) <= 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Client has no account credit available.",
      });
    }

    accountCreditAmountPence = Math.min(
      moneyToMinorUnits(input.accountCreditAmount, checkoutCurrency),
      moneyToMinorUnits(balance.balance, checkoutCurrency),
      remainingPence,
    );

    if (normalizeCurrency(balance.currency) !== checkoutCurrency) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Account credit currency does not match this membership plan.",
      });
    }

    if (accountCreditAmountPence > 0) {
      const coupon = await stripe.coupons.create(
        {
          amount_off: accountCreditAmountPence,
          currency: (plan.currency ?? balance.currency ?? "GBP").toLowerCase(),
          duration: "once",
          name: "Account credit",
          metadata: { accountBalanceId: balance.id, organizationId: orgId },
        },
        {
          idempotencyKey: `coupon_account_credit_${balance.id}_${plan.id}_${accountCreditAmountPence}`,
        },
      );
      checkoutDiscounts.push({ coupon: coupon.id });
      remainingPence = Math.max(0, remainingPence - accountCreditAmountPence);
      accountBalanceId = balance.id;
    }
  }

  const intervalConfig = BILLING_INTERVAL_MAP[plan.billingInterval];
  const mode = intervalConfig
    ? ("subscription" as const)
    : ("payment" as const);

  const operation = await createOrReuseCheckoutOperation({
    organizationId: orgId,
    locationId: ctx.locationId,
    clientId: targetClient.id,
    stripeConnectionId: studioConnection.id,
    providerAccountId: studioConnection.stripeAccountId,
    idempotencyKey: `stripe:membership:${orgId}:${input.checkoutRequestId}`,
    amountMinor: remainingPence,
    currency: checkoutCurrency,
    currencyExponent: checkoutCurrencyExponent,
    requestedBy: ctx.requestedBy,
    metadata: {
      checkoutKind: "MEMBERSHIP",
      planId: plan.id,
      pricingOptionId: pricingOptionId ?? null,
    },
  });

  const checkoutMetadata = {
    commerceOperationId: operation.id,
    stripeConnectionId: studioConnection.id,
    planId: plan.id,
    clientId: targetClient.id,
    organizationId: orgId,
    locationId: ctx.locationId ?? "",
    ...(pricingOptionId ? { pricingOptionId } : {}),
    ...(promoCodeId ? { promoCodeId } : {}),
    ...(giftCardId
      ? {
          giftCardId,
          giftCardAmount: minorUnitsToDecimal(
            giftCardAmountPence,
            checkoutCurrencyExponent,
          ),
        }
      : {}),
    ...(accountBalanceId
      ? {
          accountBalanceId,
          accountCreditAmount: minorUnitsToDecimal(
            accountCreditAmountPence,
            checkoutCurrencyExponent,
          ),
        }
      : {}),
  };
  const subscriptionFeePercent =
    mode === "subscription"
      ? validatedApplicationFeePercent(plan.platformFeePercent)
      : undefined;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: checkoutMetadata,
    ...(checkoutDiscounts.length > 0 ? { discounts: checkoutDiscounts } : {}),
    ...(mode === "subscription" && {
      subscription_data: {
        metadata: checkoutMetadata,
        transfer_data: {
          destination: studioConnection.stripeAccountId,
        },
        ...(subscriptionFeePercent !== undefined
          ? {
              application_fee_percent: subscriptionFeePercent,
            }
          : {}),
      },
    }),
    ...(mode === "payment" && {
      payment_intent_data: buildDestinationChargePaymentData({
        destinationAccountId: studioConnection.stripeAccountId,
        metadata: checkoutMetadata,
        applicationFeeAmount: percentageApplicationFeeAmount(
          remainingPence,
          plan.platformFeePercent,
        ),
      }),
    }),
  };

  const session = await stripe.checkout.sessions.create(sessionParams, {
    idempotencyKey: `aurea_checkout_${operation.id}`,
  });

  await attachStripeCheckoutToOperation({
    operationId: operation.id,
    checkoutSessionId: session.id,
    paymentIntentId: stripeObjectId(session.payment_intent),
  });

  return { sessionId: session.id, url: session.url, operationId: operation.id };
}

async function createCheckoutForAccountCreditPricingOption({
  ctx,
  input,
  optionId,
}: {
  ctx: CheckoutContext;
  input: CheckoutBaseInput;
  optionId: string;
}): Promise<{ sessionId: string; url: string | null; operationId: string }> {
  const orgId = requireOrganization(ctx.orgId);

  if (input.promoCode || input.giftCardCode || input.accountCreditAmount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Discounts cannot be applied when buying account credit.",
    });
  }

  const [option, targetClient] = await Promise.all([
    db.query.pricingOption.findFirst({
      where: and(
        eq(pricingOption.id, optionId),
        eq(pricingOption.organizationId, orgId),
        ctx.locationId
          ? eq(pricingOption.locationId, ctx.locationId)
          : isNull(pricingOption.locationId),
        eq(pricingOption.isActive, true),
        eq(pricingOption.showInPos, true),
        eq(pricingOption.type, "ACCOUNT_CREDIT"),
      ),
    }),
    db.query.client.findFirst({
      where: and(
        eq(client.id, input.clientId),
        eq(client.organizationId, orgId),
      ),
      columns: { id: true, email: true, name: true, stripeCustomerId: true },
    }),
  ]);

  if (!option)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Account credit option not found",
    });
  if (!targetClient)
    throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

  await enforcePricingOptionPurchaseLimits({
    orgId,
    locationId: ctx.locationId,
    clientId: targetClient.id,
    pricingOptionId: option.id,
    maxPurchases: option.maxPurchases,
    maxPurchasesPerClient: option.maxPurchasesPerClient,
  });

  const studioConnection = await requireStudioConnection({
    orgId,
    locationId: ctx.locationId,
  });
  const stripe = getStripePlatformClient();
  const customerId = await ensureStripeCustomer({ targetClient, orgId });
  const checkoutCurrency = normalizeCurrency(option.currency);
  const checkoutCurrencyExponent = currencyExponent(checkoutCurrency);
  const amountInPence = moneyToMinorUnits(option.price, checkoutCurrency);
  const operation = await createOrReuseCheckoutOperation({
    organizationId: orgId,
    locationId: ctx.locationId,
    clientId: targetClient.id,
    stripeConnectionId: studioConnection.id,
    providerAccountId: studioConnection.stripeAccountId,
    idempotencyKey: `stripe:account-credit:${orgId}:${input.checkoutRequestId}`,
    amountMinor: amountInPence,
    currency: checkoutCurrency,
    currencyExponent: checkoutCurrencyExponent,
    requestedBy: ctx.requestedBy,
    metadata: {
      checkoutKind: "ACCOUNT_CREDIT",
      pricingOptionId: option.id,
    },
  });

  const checkoutMetadata = {
    commerceOperationId: operation.id,
    stripeConnectionId: studioConnection.id,
    purchaseType: "ACCOUNT_CREDIT",
    pricingOptionId: option.id,
    clientId: targetClient.id,
    organizationId: orgId,
    locationId: ctx.locationId ?? "",
    accountCreditAmount: option.price,
  };

  const session = await stripe.checkout.sessions.create(
    {
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: option.currency.toLowerCase(),
            unit_amount: amountInPence,
            product_data: {
              name: option.name,
              description: option.description ?? undefined,
              metadata: {
                pricingOptionId: option.id,
                organizationId: orgId,
                purchaseType: "ACCOUNT_CREDIT",
              },
            },
          },
          quantity: 1,
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: checkoutMetadata,
      payment_intent_data: buildDestinationChargePaymentData({
        destinationAccountId: studioConnection.stripeAccountId,
        metadata: checkoutMetadata,
        applicationFeeAmount: connectionApplicationFeeAmount(
          amountInPence,
          checkoutCurrency,
          studioConnection,
        ),
      }),
    },
    {
      idempotencyKey: `aurea_checkout_${operation.id}`,
    },
  );

  await attachStripeCheckoutToOperation({
    operationId: operation.id,
    checkoutSessionId: session.id,
    paymentIntentId: stripeObjectId(session.payment_intent),
  });

  return { sessionId: session.id, url: session.url, operationId: operation.id };
}

async function syncMembershipPlanWithStripe({
  orgId,
  locationId,
  planId,
  pricingOptionId,
}: {
  orgId: string;
  locationId: string | null;
  planId: string;
  pricingOptionId?: string;
}): Promise<{ stripeProductId: string; stripePriceId: string }> {
  const plan = await db.query.membershipPlan.findFirst({
    where: and(
      eq(membershipPlan.id, planId),
      eq(membershipPlan.organizationId, orgId),
      locationId
        ? eq(membershipPlan.locationId, locationId)
        : isNull(membershipPlan.locationId),
    ),
  });
  if (!plan)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Membership plan not found",
    });

  const studioConnection = await requireStudioConnection({ orgId, locationId });
  const stripe = getStripePlatformClient();
  const metadata = {
    planId: plan.id,
    organizationId: orgId,
    stripeConnectionId: studioConnection.id,
    ...(pricingOptionId ? { pricingOptionId } : {}),
  };

  let productId = plan.stripeProductId;

  if (productId) {
    await stripe.products.update(productId, {
      name: plan.name,
      description: plan.description ?? undefined,
      metadata,
    });
  } else {
    const product = await stripe.products.create(
      {
        name: plan.name,
        description: plan.description ?? undefined,
        metadata,
      },
      { idempotencyKey: `product_${plan.id}` },
    );
    productId = product.id;
  }

  const amountInPence = moneyToMinorUnits(plan.price, plan.currency);
  const intervalConfig = BILLING_INTERVAL_MAP[plan.billingInterval];
  const priceData: Stripe.PriceCreateParams = {
    product: productId,
    unit_amount: amountInPence,
    currency: (plan.currency ?? "GBP").toLowerCase(),
    metadata,
  };

  if (intervalConfig) {
    priceData.recurring = {
      interval: intervalConfig.interval,
      interval_count: intervalConfig.interval_count,
    };
  }

  const price = await stripe.prices.create(priceData, {
    idempotencyKey: `price_${pricingOptionId ?? plan.id}_${amountInPence}_${plan.billingInterval}`,
  });

  if (plan.stripePriceId && plan.stripePriceId !== price.id) {
    await stripe.prices.update(plan.stripePriceId, { active: false });
  }

  await db
    .update(membershipPlan)
    .set({
      stripeProductId: productId,
      stripePriceId: price.id,
      stripeConnectionId: studioConnection.id,
      updatedAt: new Date(),
    })
    .where(eq(membershipPlan.id, plan.id));

  return { stripeProductId: productId, stripePriceId: price.id };
}

export const studioBillingRouter = createTRPCRouter({
  createPublicPricingOptionCheckout: baseProcedure
    .input(
      z.object({
        checkoutRequestId: z.string().uuid(),
        orgSlug: z.string().min(1),
        pricingSlug: z.string().min(1),
        publicationTargetSlug: z.string().min(1).max(120).optional(),
        name: z.string().trim().min(1).max(200),
        email: z.string().trim().email(),
        phone: z.string().trim().max(40).optional(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
        promoCode: z.string().optional(),
        giftCardCode: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const org = await db.query.organization.findFirst({
        where: eq(organization.slug, input.orgSlug),
        columns: { id: true },
      });
      if (!org)
        throw new TRPCError({ code: "NOT_FOUND", message: "Studio not found" });

      const option = await db.query.pricingOption.findFirst({
        where: and(
          eq(pricingOption.organizationId, org.id),
          eq(pricingOption.slug, input.pricingSlug),
          eq(pricingOption.isActive, true),
          eq(pricingOption.isPublic, true),
          eq(pricingOption.directPurchaseEnabled, true),
        ),
        columns: {
          id: true,
          locationId: true,
          membershipPlanId: true,
          type: true,
          updatedAt: true,
        },
      });
      if (!option)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing option not found",
        });

      if (input.publicationTargetSlug) {
        const target = await getPublishedPublicationChannel({
          organizationSlug: input.orgSlug,
          targetSlug: input.publicationTargetSlug,
          kind: "PRICING",
          sourceId: option.id,
        });
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This published offer is unavailable.",
          });
        }
        const published = getPublishedPricingSnapshot(target.snapshot);
        if (
          !published ||
          !publishedPricingSourceIsCurrent({
            snapshot: published,
            sourceId: option.id,
            sourceUpdatedAt: option.updatedAt,
          })
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "This offer changed after publication. Republish it before accepting payment.",
          });
        }
        if (!published.policy.allowDirectPurchase) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Direct purchase is disabled for this published offer.",
          });
        }
      } else {
        const managedTarget = await getPublicationControlBySource({
          organizationId: org.id,
          locationId: option.locationId,
          kind: "PRICING",
          sourceKey: `pricing:${option.id}`,
        });
        if (managedTarget) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Use the published offer URL for this pricing option.",
          });
        }
      }

      let targetClient = await db.query.client.findFirst({
        where: and(
          eq(client.organizationId, org.id),
          option.locationId
            ? eq(client.locationId, option.locationId)
            : isNull(client.locationId),
          eq(client.email, input.email.toLowerCase()),
        ),
        columns: { id: true },
      });

      if (!targetClient) {
        const now = new Date();
        const [createdClient] = await db
          .insert(client)
          .values({
            id: createId(),
            organizationId: org.id,
            locationId: option.locationId,
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone || null,
            type: "CUSTOMER",
            acquisitionStage: "ACTIVE",
            acquiredAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: client.id });
        targetClient = createdClient;
      }

      const checkoutInput: CheckoutBaseInput = {
        checkoutRequestId: input.checkoutRequestId,
        clientId: targetClient.id,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        promoCode: input.promoCode,
        giftCardCode: input.giftCardCode,
      };

      if (option.type === "ACCOUNT_CREDIT") {
        return createCheckoutForAccountCreditPricingOption({
          ctx: {
            orgId: org.id,
            locationId: option.locationId,
            requestedBy: null,
          },
          input: checkoutInput,
          optionId: option.id,
        });
      }

      if (!option.membershipPlanId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Pricing option is not linked to checkout yet.",
        });
      }

      return createCheckoutForMembershipPlan({
        ctx: {
          orgId: org.id,
          locationId: option.locationId,
          requestedBy: null,
        },
        input: checkoutInput,
        planId: option.membershipPlanId,
        pricingOptionId: option.id,
      });
    }),

  createPublicGiftCardCheckout: baseProcedure
    .input(
      z.object({
        checkoutRequestId: z.string().uuid(),
        orgSlug: z.string().min(1),
        publicationTargetSlug: z.string().min(1).max(120).optional(),
        amount: z
          .string()
          .trim()
          .min(1)
          .max(32)
          .regex(/^\d+(?:\.\d+)?$/, "Amount must be a decimal value"),
        currency: z.string().trim().length(3).default("GBP"),
        purchaserName: z.string().trim().min(1).max(200),
        purchaserEmail: z.string().trim().email(),
        recipientName: z.string().trim().max(200).optional(),
        recipientEmail: z.string().trim().email().optional(),
        message: z.string().trim().max(500).optional(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }),
    )
    .mutation(async ({ input }) => {
      const org = await db.query.organization.findFirst({
        where: eq(organization.slug, input.orgSlug),
        columns: { id: true, name: true },
      });
      if (!org)
        throw new TRPCError({ code: "NOT_FOUND", message: "Studio not found" });

      if (input.publicationTargetSlug) {
        const target = await getPublishedPublicationChannel({
          organizationSlug: input.orgSlug,
          targetSlug: input.publicationTargetSlug,
          kind: "GIFT_CARDS",
          sourceId: org.id,
        });
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This published gift-card page is unavailable.",
          });
        }
      } else {
        const managedTarget = await getPublicationControlBySource({
          organizationId: org.id,
          locationId: null,
          kind: "GIFT_CARDS",
          sourceKey: `gift-cards:${org.id}`,
        });
        if (managedTarget) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Use the published gift-card URL for this studio.",
          });
        }
      }

      const checkoutCurrency = normalizeCurrency(input.currency);
      const checkoutCurrencyExponent = currencyExponent(checkoutCurrency);
      const amountInPence = moneyToMinorUnits(input.amount, checkoutCurrency);
      if (amountInPence <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Gift card amount must be greater than zero.",
        });
      }
      const giftCardAmount = minorUnitsToDecimal(
        amountInPence,
        checkoutCurrencyExponent,
      );
      const studioConnection = await requireStudioConnection({
        orgId: org.id,
        locationId: null,
      });
      const stripe = getStripePlatformClient();

      let targetClient = await db.query.client.findFirst({
        where: and(
          eq(client.organizationId, org.id),
          isNull(client.locationId),
          eq(client.email, input.purchaserEmail.toLowerCase()),
        ),
        columns: { id: true, email: true, name: true, stripeCustomerId: true },
      });

      if (!targetClient) {
        const now = new Date();
        const [createdClient] = await db
          .insert(client)
          .values({
            id: createId(),
            organizationId: org.id,
            locationId: null,
            name: input.purchaserName,
            email: input.purchaserEmail.toLowerCase(),
            type: "CUSTOMER",
            acquisitionStage: "ACTIVE",
            acquiredAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning({
            id: client.id,
            email: client.email,
            name: client.name,
            stripeCustomerId: client.stripeCustomerId,
          });
        targetClient = createdClient;
      }

      const customerId = await ensureStripeCustomer({
        targetClient,
        orgId: org.id,
      });
      const operation = await createOrReuseCheckoutOperation({
        organizationId: org.id,
        locationId: null,
        clientId: targetClient.id,
        stripeConnectionId: studioConnection.id,
        providerAccountId: studioConnection.stripeAccountId,
        idempotencyKey: `stripe:gift-card:${org.id}:${input.checkoutRequestId}`,
        amountMinor: amountInPence,
        currency: checkoutCurrency,
        currencyExponent: checkoutCurrencyExponent,
        requestedBy: null,
        metadata: { checkoutKind: "GIFT_CARD" },
      });
      const metadata = {
        commerceOperationId: operation.id,
        stripeConnectionId: studioConnection.id,
        purchaseType: "GIFT_CARD",
        organizationId: org.id,
        locationId: "",
        clientId: targetClient.id,
        giftCardAmount,
        purchaserName: input.purchaserName,
        purchaserEmail: input.purchaserEmail.toLowerCase(),
        recipientName: input.recipientName ?? "",
        recipientEmail: input.recipientEmail?.toLowerCase() ?? "",
        message: input.message ?? "",
      };

      const session = await stripe.checkout.sessions.create(
        {
          customer: customerId,
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: checkoutCurrency.toLowerCase(),
                unit_amount: amountInPence,
                product_data: {
                  name: `${org.name} gift card`,
                  metadata: {
                    organizationId: org.id,
                    purchaseType: "GIFT_CARD",
                  },
                },
              },
              quantity: 1,
            },
          ],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata,
          payment_intent_data: buildDestinationChargePaymentData({
            destinationAccountId: studioConnection.stripeAccountId,
            metadata,
            applicationFeeAmount: connectionApplicationFeeAmount(
              amountInPence,
              checkoutCurrency,
              studioConnection,
            ),
          }),
        },
        { idempotencyKey: `aurea_checkout_${operation.id}` },
      );

      await attachStripeCheckoutToOperation({
        operationId: operation.id,
        checkoutSessionId: session.id,
        paymentIntentId: stripeObjectId(session.payment_intent),
      });

      return {
        sessionId: session.id,
        url: session.url,
        operationId: operation.id,
      };
    }),

  syncPlanWithStripe: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireBillingCapability(ctx, "provider.manage");

      return syncMembershipPlanWithStripe({
        orgId,
        locationId: ctx.locationId,
        planId: input.planId,
      });
    }),

  syncPricingOptionWithStripe: protectedProcedure
    .input(z.object({ pricingOptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireBillingCapability(ctx, "provider.manage");

      const option = await db.query.pricingOption.findFirst({
        where: and(
          eq(pricingOption.id, input.pricingOptionId),
          eq(pricingOption.organizationId, orgId),
          ctx.locationId
            ? eq(pricingOption.locationId, ctx.locationId)
            : isNull(pricingOption.locationId),
          eq(pricingOption.isActive, true),
        ),
        columns: { id: true, membershipPlanId: true, type: true },
      });

      if (!option)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing option not found",
        });
      if (option.type === "ACCOUNT_CREDIT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Account credit uses direct checkout and does not need Stripe sync.",
        });
      }
      if (!option.membershipPlanId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This pricing option is not checkout-backed yet.",
        });
      }

      return syncMembershipPlanWithStripe({
        orgId,
        locationId: ctx.locationId,
        planId: option.membershipPlanId,
        pricingOptionId: option.id,
      });
    }),

  createMembershipCheckout: protectedProcedure
    .input(checkoutBaseInputSchema.extend({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireBillingCapability(ctx, "commerce.checkout.create");
      return createCheckoutForMembershipPlan({
        ctx: {
          orgId: ctx.orgId,
          locationId: ctx.locationId,
          requestedBy: ctx.auth.user.id,
        },
        input,
        planId: input.planId,
      });
    }),

  createPricingOptionCheckout: protectedProcedure
    .input(checkoutBaseInputSchema.extend({ pricingOptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireBillingCapability(
        ctx,
        "commerce.checkout.create",
      );

      const option = await db.query.pricingOption.findFirst({
        where: and(
          eq(pricingOption.id, input.pricingOptionId),
          eq(pricingOption.organizationId, orgId),
          ctx.locationId
            ? eq(pricingOption.locationId, ctx.locationId)
            : isNull(pricingOption.locationId),
          eq(pricingOption.isActive, true),
          eq(pricingOption.showInPos, true),
        ),
        columns: {
          id: true,
          membershipPlanId: true,
          type: true,
        },
      });

      if (!option) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing option not found",
        });
      }
      if (option.type === "ACCOUNT_CREDIT") {
        return createCheckoutForAccountCreditPricingOption({
          ctx: {
            orgId: ctx.orgId,
            locationId: ctx.locationId,
            requestedBy: ctx.auth.user.id,
          },
          input,
          optionId: option.id,
        });
      }
      if (!option.membershipPlanId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Pricing option is not linked to a checkout-backed membership plan yet.",
        });
      }

      return createCheckoutForMembershipPlan({
        ctx: {
          orgId: ctx.orgId,
          locationId: ctx.locationId,
          requestedBy: ctx.auth.user.id,
        },
        input,
        planId: option.membershipPlanId,
        pricingOptionId: option.id,
      });
    }),

  getClientAccountCreditBalance: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const targetClient = await db.query.client.findFirst({
        where: and(
          eq(client.id, input.clientId),
          eq(client.organizationId, orgId),
        ),
        columns: { id: true },
      });
      if (!targetClient)
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const balance = await db.query.clientAccountBalance.findFirst({
        where: and(
          eq(clientAccountBalance.organizationId, orgId),
          eq(clientAccountBalance.clientId, input.clientId),
          ctx.locationId
            ? eq(clientAccountBalance.locationId, ctx.locationId)
            : isNull(clientAccountBalance.locationId),
        ),
        columns: { id: true, balance: true, currency: true, updatedAt: true },
      });

      return {
        id: balance?.id ?? null,
        balance: Number(balance?.balance ?? 0),
        currency: balance?.currency ?? "GBP",
        updatedAt: balance?.updatedAt ?? null,
      };
    }),

  getClientAccountCreditLedger: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const targetClient = await db.query.client.findFirst({
        where: and(
          eq(client.id, input.clientId),
          eq(client.organizationId, orgId),
        ),
        columns: { id: true, name: true, email: true },
      });
      if (!targetClient)
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const locationCondition = ctx.locationId
        ? eq(clientAccountBalance.locationId, ctx.locationId)
        : isNull(clientAccountBalance.locationId);
      const transactionLocationCondition = ctx.locationId
        ? eq(clientAccountCreditTransaction.locationId, ctx.locationId)
        : isNull(clientAccountCreditTransaction.locationId);

      const [balance, transactions] = await Promise.all([
        db.query.clientAccountBalance.findFirst({
          where: and(
            eq(clientAccountBalance.organizationId, orgId),
            eq(clientAccountBalance.clientId, input.clientId),
            locationCondition,
          ),
          columns: { id: true, balance: true, currency: true, updatedAt: true },
        }),
        db.query.clientAccountCreditTransaction.findMany({
          where: and(
            eq(clientAccountCreditTransaction.organizationId, orgId),
            eq(clientAccountCreditTransaction.clientId, input.clientId),
            transactionLocationCondition,
          ),
          columns: {
            id: true,
            amount: true,
            currency: true,
            type: true,
            description: true,
            paymentId: true,
            pricingOptionId: true,
            createdAt: true,
          },
          orderBy: desc(clientAccountCreditTransaction.createdAt),
          limit: input.limit,
        }),
      ]);

      return {
        client: targetClient,
        balance: {
          id: balance?.id ?? null,
          balance: Number(balance?.balance ?? 0),
          currency: balance?.currency ?? "GBP",
          updatedAt: balance?.updatedAt ?? null,
        },
        transactions: transactions.map((transaction) => ({
          ...transaction,
          amount: Number(transaction.amount),
        })),
      };
    }),

  listAccountCreditBalances: protectedProcedure
    .input(
      z.object({
        search: z.string().trim().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const conditions: SQL[] = [
        eq(clientAccountBalance.organizationId, orgId),
        ctx.locationId
          ? eq(clientAccountBalance.locationId, ctx.locationId)
          : isNull(clientAccountBalance.locationId),
      ];
      if (input.search) {
        conditions.push(
          or(
            ilike(client.name, `%${input.search}%`),
            ilike(client.email, `%${input.search}%`),
          )!,
        );
      }

      const rows = await db
        .select({
          id: clientAccountBalance.id,
          balance: clientAccountBalance.balance,
          currency: clientAccountBalance.currency,
          updatedAt: clientAccountBalance.updatedAt,
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.email,
        })
        .from(clientAccountBalance)
        .innerJoin(client, eq(client.id, clientAccountBalance.clientId))
        .where(and(...conditions))
        .orderBy(desc(clientAccountBalance.updatedAt))
        .limit(input.limit);

      return rows.map((row) => ({ ...row, balance: Number(row.balance) }));
    }),

  adjustClientAccountCredit: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        amountPence: z.number().int().positive().max(1_000_000),
        direction: z.enum(["CREDIT", "DEBIT"]),
        reason: z.string().trim().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireBillingCapability(ctx, "commerce.manage");

      return db.transaction(async (tx) => {
        const targetClient = await tx.query.client.findFirst({
          where: and(
            eq(client.id, input.clientId),
            eq(client.organizationId, orgId),
          ),
          columns: { id: true },
        });
        if (!targetClient)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });

        const existing = await tx.query.clientAccountBalance.findFirst({
          where: and(
            eq(clientAccountBalance.organizationId, orgId),
            eq(clientAccountBalance.clientId, input.clientId),
            ctx.locationId
              ? eq(clientAccountBalance.locationId, ctx.locationId)
              : isNull(clientAccountBalance.locationId),
          ),
          columns: { id: true, balance: true, currency: true },
        });

        const balanceCurrency = normalizeCurrency(existing?.currency ?? "GBP");
        const balanceExponent = currencyExponent(balanceCurrency);
        const amount = minorUnitsToDecimal(input.amountPence, balanceExponent);
        const signedMinor =
          input.direction === "CREDIT" ? input.amountPence : -input.amountPence;
        const signedAmount = minorUnitsToDecimal(signedMinor, balanceExponent);
        const currentMinor = existing
          ? decimalToMinorUnits(existing.balance, balanceExponent)
          : 0;

        if (input.direction === "DEBIT" && currentMinor < input.amountPence) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Debit exceeds the client's available account credit.",
          });
        }

        const now = new Date();
        const balanceId = existing?.id ?? createId();
        if (existing) {
          await tx
            .update(clientAccountBalance)
            .set({
              balance: minorUnitsToDecimal(
                currentMinor + signedMinor,
                balanceExponent,
              ),
              updatedAt: now,
            })
            .where(eq(clientAccountBalance.id, existing.id));
        } else {
          await tx.insert(clientAccountBalance).values({
            id: balanceId,
            organizationId: orgId,
            locationId: ctx.locationId,
            clientId: input.clientId,
            balance: amount,
            currency: balanceCurrency,
            metadata: { source: "manual_adjustment" },
            createdAt: now,
            updatedAt: now,
          });
        }

        await tx.insert(clientAccountCreditTransaction).values({
          id: createId(),
          organizationId: orgId,
          locationId: ctx.locationId,
          clientId: input.clientId,
          balanceId,
          type: "ADJUSTMENT",
          amount: signedAmount,
          currency: balanceCurrency,
          description: input.reason,
          metadata: { direction: input.direction },
          createdAt: now,
          updatedAt: now,
        });

        return { balanceId };
      });
    }),

  cancelMembership: protectedProcedure
    .input(
      z.object({
        membershipId: z.string(),
        cancelAtPeriodEnd: z.boolean().default(true),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireBillingCapability(ctx, "commerce.manage");

      const membership = await db.query.studioMembership.findFirst({
        where: and(
          eq(studioMembership.id, input.membershipId),
          eq(studioMembership.organizationId, orgId),
          ctx.locationId
            ? eq(studioMembership.locationId, ctx.locationId)
            : isNull(studioMembership.locationId),
        ),
      });
      if (!membership)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });

      if (membership.stripeSubscriptionId) {
        if (!membership.stripeConnectionId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This membership has no historical Stripe account binding.",
          });
        }
        const connection = await db.query.stripeConnection.findFirst({
          where: and(
            eq(stripeConnection.id, membership.stripeConnectionId),
            eq(stripeConnection.organizationId, orgId),
            membership.locationId
              ? eq(stripeConnection.locationId, membership.locationId)
              : isNull(stripeConnection.locationId),
          ),
          columns: { accountType: true },
        });
        if (!connection || connection.accountType.toLowerCase() !== "express") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The membership's scoped Stripe account is unavailable.",
          });
        }
        const stripe = getStripePlatformClient();
        if (input.cancelAtPeriodEnd) {
          await stripe.subscriptions.update(membership.stripeSubscriptionId, {
            cancel_at_period_end: true,
          });
        } else {
          await stripe.subscriptions.cancel(membership.stripeSubscriptionId);
        }
      }

      const updateData: Partial<typeof studioMembership.$inferInsert> = {
        cancelReason: input.reason,
        status: input.cancelAtPeriodEnd ? "ACTIVE" : "CANCELLED",
        updatedAt: new Date(),
      };
      if (!input.cancelAtPeriodEnd) updateData.cancelledAt = new Date();

      await db
        .update(studioMembership)
        .set(updateData)
        .where(eq(studioMembership.id, membership.id));

      return { success: true };
    }),

  getPayments: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const cursorPayment = input.cursor
        ? await db.query.studioPayment.findFirst({
            where: and(
              eq(studioPayment.id, input.cursor),
              eq(studioPayment.organizationId, orgId),
            ),
            columns: { createdAt: true },
          })
        : null;

      const conditions: SQL[] = [
        eq(studioPayment.organizationId, orgId),
        isNull(studioPayment.deletedAt),
      ];
      if (ctx.locationId)
        conditions.push(eq(studioPayment.locationId, ctx.locationId));
      if (input.clientId)
        conditions.push(eq(studioPayment.clientId, input.clientId));
      if (cursorPayment)
        conditions.push(lt(studioPayment.createdAt, cursorPayment.createdAt));

      const payments = await db.query.studioPayment.findMany({
        where: and(...conditions),
        with: {
          client: { columns: { id: true, name: true, email: true } },
          studioMembership: { columns: { id: true, name: true } },
          promoCode: { columns: { id: true, code: true } },
        },
        orderBy: desc(studioPayment.createdAt),
        limit: input.limit + 1,
      });

      let nextCursor: string | undefined;
      if (payments.length > input.limit) {
        nextCursor = payments.pop()?.id;
      }

      return {
        payments: payments.map((payment) => ({
          ...payment,
          membership: payment.studioMembership,
        })),
        nextCursor,
      };
    }),
});
