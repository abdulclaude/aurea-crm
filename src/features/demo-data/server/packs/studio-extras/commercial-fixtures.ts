import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import type {
  CommercialFixtures,
  StudioExtrasDependencies,
} from "@/features/demo-data/server/packs/studio-extras/types";

const DAY_MS = 86_400_000;

export function buildCommercialFixtures(
  context: DemoSeedContext,
  dependencies: StudioExtrasDependencies,
): CommercialFixtures {
  const { clients, catalog } = dependencies;
  const qa = context.profile === "QA_EXHAUSTIVE";
  const now = context.referenceDate;
  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const codePrefix = `DEMO-${context.runId.slice(0, 8).toUpperCase()}`;

  const promoCount = qa ? 8 : 4;
  const promoCodes = Array.from({ length: promoCount }, (_, index) => ({
    id: deterministicDemoId(context.runId, "promo-code", index),
    ...scope,
    code: `${codePrefix}-${["WELCOME", "FRIEND", "RESET", "VIP", "SPRING", "LUNCH", "REFER", "PACK"][index]}`,
    discountType: index % 3 === 1 ? ("FIXED" as const) : ("PERCENT" as const),
    discountValue: index % 3 === 1 ? String(5 + index) : String(10 + index * 2),
    maxRedemptions: 25 + index * 20,
    redemptionCount: 0,
    applicablePlanIds: index % 2 === 0 ? [catalog.plans[index % catalog.plans.length].id] : [],
    applicablePricingOptionIds:
      index % 2 === 1
        ? [catalog.pricingOptions[index % catalog.pricingOptions.length].id]
        : [],
    expiresAt:
      index === promoCount - 1
        ? new Date(now.getTime() - 7 * DAY_MS)
        : new Date(now.getTime() + (30 + index * 12) * DAY_MS),
    isActive: index !== promoCount - 1,
    createdAt: new Date(now.getTime() - (90 - index * 5) * DAY_MS),
    updatedAt: now,
  }));

  const balanceCount = Math.min(clients.length, qa ? 100 : 24);
  const accountBalances = clients.slice(0, balanceCount).map((client, index) => {
    const purchased = 40 + (index % 5) * 10;
    const redeemed = 10 + (index % 4) * 5;
    const adjusted = index % 6 === 0 ? 5 : 0;
    return {
      id: deterministicDemoId(context.runId, "account-balance", index),
      ...scope,
      clientId: client.id,
      balance: String(purchased - redeemed + adjusted),
      currency: context.currency,
      metadata: demoMetadata(context),
      createdAt: new Date(now.getTime() - (120 - index) * DAY_MS),
      updatedAt: now,
    };
  });
  const accountTransactions = accountBalances.flatMap((balance, index) => {
    const purchased = 40 + (index % 5) * 10;
    const redeemed = 10 + (index % 4) * 5;
    const adjusted = index % 6 === 0 ? 5 : 0;
    const base = {
      ...scope,
      clientId: balance.clientId,
      balanceId: balance.id,
      currency: context.currency,
      metadata: demoMetadata(context),
      updatedAt: now,
    };
    return [
      {
        id: deterministicDemoId(context.runId, "account-credit-purchase", index),
        ...base,
        type: "PURCHASE" as const,
        amount: String(purchased),
        description: "Demo account credit purchase",
        pricingOptionId: null,
        createdAt: new Date(now.getTime() - (80 - (index % 30)) * DAY_MS),
      },
      {
        id: deterministicDemoId(context.runId, "account-credit-redemption", index),
        ...base,
        type: "REDEMPTION" as const,
        amount: String(-redeemed),
        description: "Demo class purchase using account credit",
        createdAt: new Date(now.getTime() - (20 - (index % 15)) * DAY_MS),
      },
      ...(adjusted > 0
        ? [{
            id: deterministicDemoId(context.runId, "account-credit-adjustment", index),
            ...base,
            type: "ADJUSTMENT" as const,
            amount: String(adjusted),
            description: "Demo service recovery credit",
            createdAt: new Date(now.getTime() - 5 * DAY_MS),
          }]
        : []),
    ];
  });

  const giftCount = qa ? 40 : 12;
  const giftCards = Array.from({ length: giftCount }, (_, index) => {
    const initial = [25, 50, 75, 100][index % 4];
    const state = index % 5;
    const remaining = state === 2 ? 0 : state === 1 ? initial / 2 : initial;
    const redeemed = state === 1 || state === 2;
    return {
      id: deterministicDemoId(context.runId, "gift-card", index),
      ...scope,
      code: `GIFT-${context.runId.slice(0, 6).toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
      initialValue: String(initial),
      remainingBalance: String(remaining),
      currency: context.currency,
      purchasedByClientId: clients[index % clients.length].id,
      redeemedByClientId: redeemed ? clients[(index + 7) % clients.length].id : null,
      isActive: remaining > 0 && state !== 4,
      purchasedAt: new Date(now.getTime() - (15 + index * 4) * DAY_MS),
      redeemedAt: redeemed ? new Date(now.getTime() - (2 + index) * DAY_MS) : null,
      expiresAt: state === 4 ? new Date(now.getTime() - 10 * DAY_MS) : new Date(now.getTime() + 365 * DAY_MS),
      notes: `Synthetic demo gift card for run ${context.runId}`,
      stripePaymentIntentId: null,
      createdAt: new Date(now.getTime() - (15 + index * 4) * DAY_MS),
      updatedAt: now,
    };
  });

  return {
    promoCodes,
    accountBalances,
    accountTransactions,
    giftCards,
    pricingRules: buildPricingRules(context, dependencies),
    paymentPlans: buildPaymentPlans(context, dependencies),
    cancellationPolicies: buildCancellationPolicies(context),
  };
}

function buildPricingRules(context: DemoSeedContext, dependencies: StudioExtrasDependencies) {
  const count = context.profile === "QA_EXHAUSTIVE" ? 8 : 4;
  const now = context.referenceDate;
  return Array.from({ length: count }, (_, index) => ({
    id: deterministicDemoId(context.runId, "dynamic-pricing", index),
    organizationId: context.organizationId,
    locationId: context.locationId,
    name: ["Peak demand", "Off-peak access", "Weekend premium", "New class boost"][index % 4],
    classTypeId: dependencies.catalog.classTypes[index % dependencies.catalog.classTypes.length].id,
    daysOfWeek: index % 2 === 0 ? [1, 2, 3, 4, 5] : [0, 6],
    adjustmentType: index % 2 === 0 ? ("PERCENT" as const) : ("FIXED_AMOUNT" as const),
    adjustmentValue: index % 2 === 0 ? "15" : "-3",
    minPrice: "12",
    maxPrice: "45",
    demandThresholdPercent: index % 2 === 0 ? 75 : 30,
    isActive: index !== count - 1,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildPaymentPlans(context: DemoSeedContext, dependencies: StudioExtrasDependencies) {
  const count = context.profile === "QA_EXHAUSTIVE" ? 6 : 3;
  const now = context.referenceDate;
  return Array.from({ length: count }, (_, index) => ({
    id: deterministicDemoId(context.runId, "payment-plan", index),
    organizationId: context.organizationId,
    locationId: context.locationId,
    membershipPlanId: dependencies.catalog.plans[index % dependencies.catalog.plans.length].id,
    name: `${[3, 6, 12][index % 3]} month internal instalments`,
    provider: "INTERNAL" as const,
    depositAmount: index % 2 === 0 ? "25" : null,
    installmentCount: [3, 6, 12][index % 3],
    interval: index % 3 === 0 ? ("WEEKLY" as const) : ("MONTHLY" as const),
    feeAmount: index % 2 === 1 ? "5" : null,
    feePercent: null,
    isActive: index !== count - 1,
    terms: "Synthetic internal demo schedule. No external finance provider or charge is created.",
    createdAt: now,
    updatedAt: now,
  }));
}

function buildCancellationPolicies(context: DemoSeedContext) {
  const count = context.profile === "QA_EXHAUSTIVE" ? 3 : 2;
  const now = context.referenceDate;
  return Array.from({ length: count }, (_, index) => ({
    id: deterministicDemoId(context.runId, "cancellation-policy", index),
    organizationId: context.organizationId,
    locationId: context.locationId,
    name: ["Standard 12 hour policy", "Flexible members policy", "Strict capacity policy"][index],
    lateCancelWindow: [12, 6, 24][index],
    noShowFeeAmount: [15, 8, 20][index].toString(),
    lateCancelFee: [10, 5, 15][index].toString(),
    currency: context.currency,
    deductCredits: index !== 1,
    creditsDeducted: index === 1 ? 0 : 1,
    chargeCard: false,
    sendNotification: false,
    isDefault: index === 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
}
