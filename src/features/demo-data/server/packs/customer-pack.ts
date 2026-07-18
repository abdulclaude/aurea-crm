import "server-only";

import { and, eq } from "drizzle-orm";

import {
  churnRiskScore,
  classCredit,
  client,
  introOffer,
  introOfferRedemption,
  loyaltyBalance,
  loyaltyProgram,
  loyaltyReward,
  loyaltyTransaction,
  referral,
  referralProgram,
  studioMembership,
} from "@/db/schema";
import type { CatalogPackOutput } from "@/features/demo-data/server/packs/catalog-pack";
import {
  demoMetadata,
  deterministicDemoId,
  recordRefs,
  type DemoDataTransaction,
  type DemoPackResult,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";

export type DemoClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
};
export type DemoMembership = {
  id: string;
  clientId: string;
  status:
    | "ACTIVE"
    | "PAST_DUE"
    | "INACTIVE"
    | "CANCELLED"
    | "EXPIRED"
    | "PAUSED";
  price: string | null;
  recoveryScenario: "PAST_DUE" | "RECOVERED" | null;
};
export type CustomerPackOutput = DemoPackResult & {
  clients: DemoClient[];
  memberships: DemoMembership[];
};

const FIRST_NAMES = [
  "Olivia",
  "Liam",
  "Sophia",
  "Noah",
  "Isabella",
  "Mason",
  "Ava",
  "Ethan",
  "Mia",
  "Lucas",
  "Charlotte",
  "Aiden",
  "Amelia",
  "Harper",
  "Elijah",
  "Evelyn",
  "Daniel",
  "Abigail",
  "Grace",
  "Leo",
  "Zoe",
  "Maya",
  "Theo",
  "Layla",
  "Aria",
] as const;
const LAST_NAMES = [
  "Harper",
  "Johnson",
  "Martinez",
  "Williams",
  "Brown",
  "Davis",
  "Garcia",
  "Anderson",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Clark",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "King",
  "Wright",
  "Scott",
  "Green",
  "Baker",
  "Adams",
  "Nelson",
  "Morgan",
] as const;

function daysBefore(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * 86_400_000);
}

export async function seedCustomerPack(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
  catalog: Pick<CatalogPackOutput, "plans" | "classTypes">,
): Promise<CustomerPackOutput> {
  const now = context.referenceDate;
  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const clientTypes = [
    "LEAD",
    "PROSPECT",
    "CUSTOMER",
    "CHURN",
    "CLOSED",
  ] as const;
  const lifecycleStages = [
    "SUBSCRIBER",
    "LEAD",
    "MQL",
    "SQL",
    "OPPORTUNITY",
    "CUSTOMER",
    "EVANGELIST",
  ] as const;
  const acquisitionStages = ["INQUIRY", "TRIAL", "ACTIVE", "LOST"] as const;
  const clients = Array.from(
    { length: context.profileConfig.clientCount },
    (_, index) => {
      const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
      const lastName =
        LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
      const createdAt = daysBefore(now, 5 + ((index * 17) % 780));
      const type = clientTypes[index % clientTypes.length];
      const acquisitionStage =
        acquisitionStages[index % acquisitionStages.length];
      const lifecycleStage = lifecycleStages[index % lifecycleStages.length];
      const lastInteractionAt = daysBefore(now, index % 120);
      return {
        id: deterministicDemoId(context.runId, "client", index),
        ...scope,
        name: `${firstName} ${lastName}${index >= 625 ? ` ${Math.floor(index / 625) + 1}` : ""}`,
        firstName,
        lastName,
        email: `member.${String(index + 1).padStart(4, "0")}.${context.runId.slice(0, 6)}@example.invalid`,
        phone: `+4477008${String(10000 + index).slice(-5)}`,
        country: "United Kingdom",
        city: ["London", "Manchester", "Bristol", "Leeds"][index % 4],
        postalCode: `DE${(index % 9) + 1} ${(index % 8) + 1}MO`,
        score: 25 + ((index * 7) % 74),
        type,
        lifecycleStage,
        acquisitionStage,
        source: [
          "Referral",
          "Organic search",
          "Instagram",
          "Walk-in",
          "Partner",
        ][index % 5],
        tags: [
          type.toLowerCase(),
          acquisitionStage.toLowerCase(),
          index % 7 === 0 ? "high-value" : "standard",
        ],
        lastInteractionAt,
        createdAt,
        updatedAt: lastInteractionAt,
        attendanceCount: 0,
        currentStreak: 0,
        trustedMember: index % 19 === 0,
        waiverSignedAt: type === "CUSTOMER" ? createdAt : null,
        birthMonth: (index % 12) + 1,
        birthDay: (index % 27) + 1,
        acquiredAt:
          acquisitionStage === "ACTIVE"
            ? daysBefore(now, 2 + (index % 500))
            : null,
        trialStartedAt:
          acquisitionStage === "TRIAL"
            ? daysBefore(now, 1 + (index % 90))
            : null,
        emailUnsubscribed: index % 41 === 0,
        emailUnsubscribedAt:
          index % 41 === 0 ? daysBefore(now, index % 60) : null,
        notificationPrefs: { email: index % 41 !== 0, sms: index % 5 !== 0 },
        metadata: demoMetadata(context),
      };
    },
  ) satisfies Array<typeof client.$inferInsert>;
  await tx.insert(client).values(clients);

  const membershipCount = context.profile === "QA_EXHAUSTIVE" ? 420 : 110;
  const statuses = [
    "ACTIVE",
    "ACTIVE",
    "PAST_DUE",
    "ACTIVE",
    "PAUSED",
    "CANCELLED",
    "EXPIRED",
    "INACTIVE",
  ] as const;
  const memberships = Array.from({ length: membershipCount }, (_, index) => {
    const plan = catalog.plans[index % catalog.plans.length];
    const status = statuses[index % statuses.length];
    const startDate = daysBefore(now, 20 + ((index * 13) % 760));
    const classTotal = plan.classCredits;
    const usedClasses =
      classTotal === null
        ? null
        : Math.min(classTotal, index % (classTotal + 1));
    const ended =
      status === "CANCELLED" || status === "EXPIRED" || status === "INACTIVE";
    return {
      id: deterministicDemoId(context.runId, "membership", index),
      ...scope,
      clientId: clients[index % clients.length].id,
      planId: plan.id,
      name: plan.name,
      type: plan.classCredits === null ? "UNLIMITED" : "CLASS_PACK",
      status,
      startDate,
      endDate: ended ? daysBefore(now, 1 + (index % 120)) : null,
      renewalDate:
        status === "ACTIVE" || status === "PAST_DUE"
          ? new Date(now.getTime() + (7 + (index % 28)) * 86_400_000)
          : null,
      totalClasses: classTotal,
      usedClasses,
      price: plan.price,
      currency: context.currency,
      autoRenew: status === "ACTIVE" || status === "PAST_DUE",
      cancelReason: status === "CANCELLED" ? "Schedule changed" : null,
      cancelledAt:
        status === "CANCELLED" ? daysBefore(now, 4 + (index % 90)) : null,
      frozenAt: status === "PAUSED" ? daysBefore(now, 5) : null,
      frozenUntil:
        status === "PAUSED" ? new Date(now.getTime() + 9 * 86_400_000) : null,
      paymentMethod: "Demo manual",
      paymentFailureAt:
        status === "PAST_DUE" ? daysBefore(now, 2 + (index % 3)) : null,
      paymentGraceEndsAt:
        status === "PAST_DUE"
          ? new Date(now.getTime() + (1 + (index % 4)) * 86_400_000)
          : null,
      metadata: demoMetadata(context, {
        recoveryScenario:
          status === "PAST_DUE"
            ? "PAST_DUE"
            : status === "ACTIVE" && index % 8 === 3
              ? "RECOVERED"
              : null,
      }),
      createdAt: startDate,
      updatedAt: now,
    };
  }) satisfies Array<typeof studioMembership.$inferInsert>;
  await tx.insert(studioMembership).values(memberships);

  const credits = memberships.flatMap((membership, index) =>
    membership.totalClasses === null
      ? []
      : [
          {
            id: deterministicDemoId(context.runId, "class-credit", index),
            ...scope,
            membershipId: membership.id,
            clientId: membership.clientId,
            totalCredits: membership.totalClasses,
            usedCredits: membership.usedClasses ?? 0,
            expiresAt: membership.endDate,
            metadata: demoMetadata(context),
            createdAt: membership.createdAt,
            updatedAt: now,
          },
        ],
  ) satisfies Array<typeof classCredit.$inferInsert>;
  if (credits.length > 0) await tx.insert(classCredit).values(credits);

  const offer = {
    id: deterministicDemoId(context.runId, "intro-offer", 0),
    ...scope,
    name: "Three-class welcome",
    description: "Three classes over fourteen days.",
    offerType: "DISCOUNTED_PACK" as const,
    price: "39.00",
    originalPrice: "75.00",
    currency: context.currency,
    durationDays: 14,
    classCredits: 3,
    allowedClassTypes: catalog.classTypes.slice(0, 3).map((item) => item.id),
    maxRedemptions: 500,
    redemptionCount: context.profile === "QA_EXHAUSTIVE" ? 80 : 30,
    isActive: true,
    displayOnWidget: false,
    followUpPlanId: catalog.plans[0].id,
    autoConvert: false,
    createdAt: daysBefore(now, 600),
    updatedAt: now,
  } satisfies typeof introOffer.$inferInsert;
  await tx.insert(introOffer).values(offer);
  const redemptionStatuses = [
    "ACTIVE",
    "EXPIRED",
    "CONVERTED",
    "CANCELLED",
  ] as const;
  const redemptions = Array.from(
    { length: offer.redemptionCount },
    (_, index) => {
      const status = redemptionStatuses[index % redemptionStatuses.length];
      const redeemedAt = daysBefore(now, 3 + ((index * 11) % 400));
      return {
        id: deterministicDemoId(context.runId, "intro-redemption", index),
        offerId: offer.id,
        clientId: clients[(index + 20) % clients.length].id,
        redeemedAt,
        expiresAt: new Date(redeemedAt.getTime() + 14 * 86_400_000),
        classesUsed: index % 4,
        status,
        convertedAt:
          status === "CONVERTED"
            ? new Date(redeemedAt.getTime() + 10 * 86_400_000)
            : null,
        convertedToPlanId: status === "CONVERTED" ? catalog.plans[0].id : null,
      };
    },
  ) satisfies Array<typeof introOfferRedemption.$inferInsert>;
  await tx.insert(introOfferRedemption).values(redemptions);

  const churnScores = clients.map((selectedClient, index) => {
    const score = 8 + ((index * 13) % 92);
    const riskLevel =
      score >= 75
        ? ("CRITICAL" as const)
        : score >= 55
          ? ("HIGH" as const)
          : score >= 30
            ? ("MEDIUM" as const)
            : ("LOW" as const);
    return {
      id: deterministicDemoId(context.runId, "churn-score", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      clientId: selectedClient.id,
      score,
      riskLevel,
      factors: [{ key: "daysSinceVisit", value: index % 120 }],
      suggestedActions: [
        "Review recent attendance",
        "Send a personal check-in",
      ],
      calculatedAt: now,
      expiresAt: new Date(now.getTime() + 7 * 86_400_000),
    };
  }) satisfies Array<typeof churnRiskScore.$inferInsert>;
  await tx.insert(churnRiskScore).values(churnScores);

  const [existingLoyaltyProgram] = await tx
    .select({ id: loyaltyProgram.id })
    .from(loyaltyProgram)
    .where(eq(loyaltyProgram.organizationId, context.organizationId))
    .limit(1);
  const loyalty = {
    id: deterministicDemoId(context.runId, "loyalty-program", 0),
    organizationId: context.organizationId,
    name: "Studio rewards",
    isActive: true,
    pointsPerClass: 10,
    pointsPerReferral: 50,
    pointsPerPurchase: 1,
    purchasePointsUnit: "1.00",
    currency: context.currency,
    createdAt: daysBefore(now, 700),
    updatedAt: now,
  } satisfies typeof loyaltyProgram.$inferInsert;
  const loyaltyProgramRows = existingLoyaltyProgram ? [] : [loyalty];
  if (loyaltyProgramRows.length > 0) {
    await tx.insert(loyaltyProgram).values(loyaltyProgramRows);
  }
  const loyaltyProgramId = existingLoyaltyProgram?.id ?? loyalty.id;
  const loyaltyBalances = clients
    .slice(
      0,
      Math.min(clients.length, context.profile === "QA_EXHAUSTIVE" ? 300 : 100),
    )
    .map((selectedClient, index) => {
      const lifetimePoints = 50 + ((index * 37) % 1_800);
      const tier =
        lifetimePoints >= 1_400
          ? ("PLATINUM" as const)
          : lifetimePoints >= 900
            ? ("GOLD" as const)
            : lifetimePoints >= 400
              ? ("SILVER" as const)
              : ("BRONZE" as const);
      return {
        id: deterministicDemoId(context.runId, "loyalty-balance", index),
        organizationId: context.organizationId,
        clientId: selectedClient.id,
        points: Math.floor(lifetimePoints * 0.62),
        lifetimePoints,
        tier,
        updatedAt: now,
      };
    }) satisfies Array<typeof loyaltyBalance.$inferInsert>;
  await tx.insert(loyaltyBalance).values(loyaltyBalances);
  const loyaltyTransactions = loyaltyBalances.flatMap((balance, index) => [
    {
      id: deterministicDemoId(context.runId, "loyalty-tx", `${index}-earn`),
      organizationId: context.organizationId,
      clientId: balance.clientId,
      points: balance.lifetimePoints,
      type: "EARN_CLASS" as const,
      description: "Points earned from demo attendance",
      createdAt: daysBefore(now, index % 180),
    },
    {
      id: deterministicDemoId(context.runId, "loyalty-tx", `${index}-redeem`),
      organizationId: context.organizationId,
      clientId: balance.clientId,
      points: -(balance.lifetimePoints - balance.points),
      type: "REDEEM" as const,
      description: "Demo reward redemption",
      createdAt: daysBefore(now, index % 90),
    },
  ]) satisfies Array<typeof loyaltyTransaction.$inferInsert>;
  await tx.insert(loyaltyTransaction).values(loyaltyTransactions);
  const rewards = [
    ["Free class", 250, "FREE_CLASS"],
    ["Ten percent off", 400, "DISCOUNT_PERCENT"],
    ["Studio tote", 700, "MERCHANDISE"],
    ["Private session", 1200, "EXPERIENCE"],
  ].map(([name, pointsCost, type], index) => ({
    id: deterministicDemoId(context.runId, "loyalty-reward", index),
    programId: loyaltyProgramId,
    name: String(name),
    description: "Synthetic demo reward",
    pointsCost: Number(pointsCost),
    type: type as
      | "FREE_CLASS"
      | "DISCOUNT_PERCENT"
      | "MERCHANDISE"
      | "EXPERIENCE",
    value: type === "DISCOUNT_PERCENT" ? "10" : null,
    isActive: true,
    stock: type === "MERCHANDISE" ? 20 : null,
    createdAt: now,
    updatedAt: now,
  })) satisfies Array<typeof loyaltyReward.$inferInsert>;
  await tx.insert(loyaltyReward).values(rewards);

  const [existingReferralProgram] = await tx
    .select({ id: referralProgram.id })
    .from(referralProgram)
    .where(
      and(
        eq(referralProgram.organizationId, context.organizationId),
        eq(referralProgram.locationId, context.locationId),
      ),
    )
    .limit(1);
  const referralProgramRow = {
    id: deterministicDemoId(context.runId, "referral-program", 0),
    organizationId: context.organizationId,
    locationId: context.locationId,
    name: "Refer a friend",
    isActive: true,
    referrerRewardValue: "15.00",
    refereeRewardValue: "10.00",
    currency: context.currency,
    maxReferralsPerMember: 20,
    createdAt: now,
    updatedAt: now,
  } satisfies typeof referralProgram.$inferInsert;
  const referralProgramRows = existingReferralProgram
    ? []
    : [referralProgramRow];
  if (referralProgramRows.length > 0) {
    await tx.insert(referralProgram).values(referralProgramRows);
  }
  const referralProgramId =
    existingReferralProgram?.id ?? referralProgramRow.id;
  const referralStatuses = [
    "PENDING",
    "SIGNED_UP",
    "CONVERTED",
    "REWARDED",
    "EXPIRED",
  ] as const;
  const referrals = Array.from(
    { length: context.profile === "QA_EXHAUSTIVE" ? 80 : 24 },
    (_, index) => {
      const status = referralStatuses[index % referralStatuses.length];
      return {
        id: deterministicDemoId(context.runId, "referral", index),
        programId: referralProgramId,
        organizationId: context.organizationId,
        locationId: context.locationId,
        referrerClientId: clients[index % clients.length].id,
        refereeClientId:
          status === "PENDING"
            ? null
            : clients[(index + 40) % clients.length].id,
        refereeEmail:
          clients[(index + 40) % clients.length].email ??
          "demo@example.invalid",
        code: `DEMO-${context.runId.slice(0, 6).toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
        status,
        referrerRewarded: status === "REWARDED",
        refereeRewarded: status === "REWARDED",
        convertedAt:
          status === "CONVERTED" || status === "REWARDED"
            ? daysBefore(now, 3 + index)
            : null,
        expiresAt:
          status === "EXPIRED"
            ? daysBefore(now, 1)
            : new Date(now.getTime() + 60 * 86_400_000),
        createdAt: daysBefore(now, 5 + index * 2),
      };
    },
  ) satisfies Array<typeof referral.$inferInsert>;
  await tx.insert(referral).values(referrals);

  const groups = [
    ["Client", clients],
    ["StudioMembership", memberships],
    ["ClassCredit", credits],
    ["IntroOffer", [offer]],
    ["IntroOfferRedemption", redemptions],
    ["ChurnRiskScore", churnScores],
    ["LoyaltyProgram", loyaltyProgramRows],
    ["LoyaltyBalance", loyaltyBalances],
    ["LoyaltyTransaction", loyaltyTransactions],
    ["LoyaltyReward", rewards],
    ["ReferralProgram", referralProgramRows],
    ["Referral", referrals],
  ] as const;
  return {
    counts: Object.fromEntries(groups.map(([key, rows]) => [key, rows.length])),
    records: groups.flatMap(([key, rows]) => recordRefs(key, rows)),
    clients: clients.map(({ id, name, email, phone }) => ({
      id,
      name,
      email: email ?? "",
      phone: phone ?? "",
    })),
    memberships: memberships.map(
      ({ id, clientId, status, price, metadata }, index) => ({
        id,
        clientId,
        status,
        price: price ?? null,
        recoveryScenario:
          status === "PAST_DUE"
            ? "PAST_DUE"
            : status === "ACTIVE" && index % 8 === 3
              ? "RECOVERED"
              : metadataValue(metadata, "recoveryScenario") === "RECOVERED"
                ? "RECOVERED"
                : null,
      }),
    ),
  };
}

function metadataValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}
