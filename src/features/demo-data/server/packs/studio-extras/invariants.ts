import type { DemoSeedContext } from "@/features/demo-data/server/types";
import type {
  OperationalFixtures,
  StudioExtrasFixturePlan,
  StudioExtrasDependencies,
} from "@/features/demo-data/server/packs/studio-extras/types";
import {
  eventWidgetConfigSchema,
  instructorWidgetConfigSchema,
  introOfferWidgetConfigSchema,
  membershipWidgetConfigSchema,
  onDemandWidgetConfigSchema,
  referralWidgetConfigSchema,
  scheduleWidgetConfigSchema,
} from "@/features/studio/widgets/contracts";
import {
  getPublishedPricingSnapshot,
  publishedPricingSourceIsCurrent,
} from "@/features/publications/public/pricing-snapshot";

export function assertStudioExtrasFixturePlan(
  context: DemoSeedContext,
  dependencies: StudioExtrasDependencies,
  plan: StudioExtrasFixturePlan,
): void {
  const qa = context.profile === "QA_EXHAUSTIVE";
  const expected = {
    promos: qa ? 8 : 4,
    gifts: qa ? 40 : 12,
    balances: qa ? 100 : 24,
    signatures: qa ? 220 : 45,
    layouts: qa ? 5 : 3,
    widgets: qa ? 12 : 7,
    widgetTargets: qa ? 12 : 7,
    pricingTargets: 1,
    pricingVersions: 1,
    pricingRules: qa ? 8 : 4,
    paymentPlans: qa ? 6 : 3,
    policies: qa ? 3 : 2,
    channels: qa ? 4 : 2,
    access: qa ? 4 : 2,
    listings: qa ? 5 : 2,
    metrics: qa ? 300 : 60,
    workouts: qa ? 18 : 6,
    soapNotes: qa ? 100 : 20,
    payouts: qa ? 70 : 24,
    videos: qa ? 18 : 8,
  };
  const actual = {
    promos: plan.promoCodes.length,
    gifts: plan.giftCards.length,
    balances: plan.accountBalances.length,
    signatures: plan.waiverSignatures.length,
    layouts: plan.roomLayouts.length,
    widgets: plan.widgets.length,
    widgetTargets: plan.widgetPublicationTargets.length,
    pricingTargets: plan.pricingPublicationTargets.length,
    pricingVersions: plan.pricingPublicationVersions.length,
    pricingRules: plan.pricingRules.length,
    paymentPlans: plan.paymentPlans.length,
    policies: plan.cancellationPolicies.length,
    channels: plan.channels.length,
    access: plan.accessIntegrations.length,
    listings: plan.marketplaceListings.length,
    metrics: plan.performanceMetrics.length,
    workouts: plan.workoutPrograms.length,
    soapNotes: plan.soapNotes.length,
    payouts: plan.instructorPayouts.length,
    videos: plan.videoOnDemandAssets.length,
  };
  for (const [name, count] of Object.entries(expected)) {
    const clientBound = ["balances", "signatures", "metrics", "soapNotes"].includes(name);
    if (actual[name as keyof typeof actual] !== Math.min(count, clientBound ? dependencies.clients.length : count)) {
      throw new Error(`Demo studio extras ${name} count is incorrect`);
    }
  }

  const locationRows = [
    ...plan.promoCodes,
    ...plan.accountBalances,
    ...plan.accountTransactions,
    ...plan.giftCards,
    ...plan.pricingRules,
    ...plan.paymentPlans,
    ...plan.cancellationPolicies,
    ...plan.waiverTemplates,
    ...plan.channels,
    ...plan.accessIntegrations,
    ...plan.marketplaceListings,
    ...plan.performanceMetrics,
    ...plan.workoutPrograms,
    ...plan.soapNotes,
    ...plan.instructorPayouts,
    ...plan.videoOnDemandAssets,
  ];
  if (
    locationRows.some(
      (row) =>
        row.organizationId !== context.organizationId ||
        row.locationId !== context.locationId,
    )
  ) {
    throw new Error("Demo studio extras crossed organization or location scope");
  }
  const pricingTarget = plan.pricingPublicationTargets[0];
  const pricingVersion = plan.pricingPublicationVersions[0];
  const pricingSnapshot = getPublishedPricingSnapshot(pricingVersion?.snapshot);
  const pricingOption = dependencies.catalog.pricingOptions.find(
    ({ id }) => id === pricingTarget?.sourceId,
  );
  if (
    !pricingTarget ||
    !pricingVersion ||
    !pricingOption ||
    pricingTarget.organizationId !== context.organizationId ||
    pricingTarget.locationId !== context.locationId ||
    pricingTarget.kind !== "PRICING" ||
    pricingTarget.status !== "PAUSED" ||
    pricingTarget.publishedVersionId !== pricingVersion.id ||
    pricingVersion.targetId !== pricingTarget.id ||
    pricingTarget.domainHost !== null ||
    pricingTarget.domainStatus !== "NOT_CONFIGURED" ||
    pricingTarget.sslStatus !== "NOT_CONFIGURED" ||
    !pricingSnapshot ||
    pricingSnapshot.policy.allowDirectPurchase ||
    pricingSnapshot.option.directPurchaseEnabled ||
    pricingSnapshot.option.buyPagePath !== null ||
    !publishedPricingSourceIsCurrent({
      snapshot: pricingSnapshot,
      sourceId: pricingOption.id,
      sourceUpdatedAt: pricingOption.updatedAt,
    })
  ) {
    throw new Error(
      "Demo intro pricing publication must be exact-scoped, paused, current, and checkout-disabled",
    );
  }
  if (
    plan.widgets.some(
      (row) =>
        row.organizationId !== context.organizationId ||
        row.locationId !== context.locationId,
    )
  ) {
    throw new Error("Demo widgets crossed organization or location scope");
  }
  const widgetIds = new Set(plan.widgets.map(({ id }) => id));
  if (
    plan.widgetPublicationTargets.some(
      (row) =>
        row.organizationId !== context.organizationId ||
        row.locationId !== context.locationId ||
        row.kind !== "WIDGET" ||
        row.status !== "DRAFT" ||
        row.publishedVersionId !== null ||
        row.publishedAt != null ||
        row.domainHost !== null ||
        row.domainStatus !== "NOT_CONFIGURED" ||
        row.sslStatus !== "NOT_CONFIGURED" ||
        row.domainCheckedAt != null ||
        row.domainError != null ||
        !isSafeDemoWidgetChannel(row.channelConfig) ||
        !isDisabledDemoConsent(row.consentConfig) ||
        !row.sourceId ||
        !widgetIds.has(row.sourceId) ||
        row.sourceKey !==
          `widget:${row.sourceId}:location:${context.locationId}`,
    )
  ) {
    throw new Error(
      "Demo widget publication targets must remain exact-scoped unpublished drafts",
    );
  }
  if (
    plan.paymentPlans.some((row) => row.provider !== "INTERNAL") ||
    plan.giftCards.some((row) => row.stripePaymentIntentId) ||
    plan.cancellationPolicies.some((row) => row.chargeCard || row.sendNotification) ||
    plan.channels.some(
      (row) =>
        row.credentials ||
        row.externalAccountId ||
        row.enabledAt ||
        row.status === "ACTIVE" ||
        row.status === "PENDING_REVIEW",
    ) ||
    plan.accessIntegrations.some(
      (row) => row.credentials || row.status === "ACTIVE" || row.status === "PENDING_REVIEW",
    ) ||
    plan.marketplaceListings.some((row) => row.status === "PUBLISHED")
    || plan.instructorPayouts.some((row) => row.stripeTransferId)
  ) {
    throw new Error("Demo extras must not bind providers, charge cards, or send notifications");
  }
  if (
    plan.performanceMetrics.some(({ source }) => source !== "MANUAL") ||
    plan.workoutPrograms.some(({ isPublished }) => isPublished)
  ) {
    throw new Error("Demo member records must remain manual and unpublished");
  }

  const accountTotals = new Map<string, number>();
  for (const transaction of plan.accountTransactions) {
    accountTotals.set(
      transaction.balanceId,
      (accountTotals.get(transaction.balanceId) ?? 0) + Number(transaction.amount),
    );
  }
  for (const balance of plan.accountBalances) {
    if (accountTotals.get(balance.id) !== Number(balance.balance)) {
      throw new Error(`Demo account balance ${balance.id} does not reconcile`);
    }
  }
  if (
    plan.giftCards.some(
      (card) =>
        Number(card.remainingBalance) < 0 ||
        Number(card.remainingBalance) > Number(card.initialValue),
    )
  ) {
    throw new Error("Demo gift-card liability is invalid");
  }

  const templateIds = new Set(plan.waiverTemplates.map(({ id }) => id));
  const clientIds = new Set(dependencies.clients.map(({ id }) => id));
  if (
    plan.waiverSignatures.some(
      (row) =>
        !templateIds.has(row.templateId) ||
        !clientIds.has(row.clientId) ||
        !row.signatureData.startsWith("DEMO_SIGNATURE_"),
    )
  ) {
    throw new Error("Demo waiver signatures are not clearly synthetic and scoped");
  }
  const defaultPolicyCount = plan.cancellationPolicies.filter(({ isDefault }) => isDefault).length;
  if (defaultPolicyCount !== 1) throw new Error("Demo extras require exactly one default cancellation policy");

  const layoutIds = new Set(plan.roomLayouts.map(({ id }) => id));
  const coordinates = new Set<string>();
  for (const item of plan.spots) {
    const key = `${item.layoutId}:${item.row}:${item.col}`;
    if (!layoutIds.has(item.layoutId) || coordinates.has(key)) {
      throw new Error("Demo room spots contain invalid or duplicate coordinates");
    }
    coordinates.add(key);
  }
  if (
    plan.widgets.some(
      (row) =>
        !/^c[a-f0-9]{23}$/.test(row.id) ||
        (row.type === "SCHEDULE"
          ? !scheduleWidgetConfigSchema.safeParse(row.config).success
          : row.type === "INSTRUCTORS"
            ? !instructorWidgetConfigSchema.safeParse(row.config).success
            : row.type === "MEMBERSHIP"
              ? !membershipWidgetConfigSchema.safeParse(row.config).success
              : row.type === "INTRO_OFFER"
                ? !introOfferWidgetConfigSchema.safeParse(row.config).success
              : row.type === "EVENT"
                ? !eventWidgetConfigSchema.safeParse(row.config).success
                : row.type === "ON_DEMAND"
                  ? !onDemandWidgetConfigSchema.safeParse(row.config).success
                  : row.type === "REFERRAL"
                    ? !referralWidgetConfigSchema.safeParse(row.config).success
                    : true),
    )
  ) {
    throw new Error("Demo widgets must use supported typed contracts and CUID ids");
  }
  const publicFreeVideos = plan.videoOnDemandAssets.filter(
    (row) =>
      row.accessLevel === "PUBLIC" &&
      row.isPublished &&
      row.publishedAt &&
      (row.price == null || Number(row.price) === 0),
  );
  if (
    publicFreeVideos.length < (qa ? 10 : 5) ||
    plan.videoOnDemandAssets.every((row) => row.accessLevel === "PUBLIC")
  ) {
    throw new Error("Demo on-demand data must cover public-free and restricted assets");
  }
}

function isSafeDemoWidgetChannel(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    value.kind === "WIDGET" &&
    Array.isArray(value.allowedFrameOrigins) &&
    value.allowedFrameOrigins.length === 1 &&
    value.allowedFrameOrigins[0] === "http://localhost:3000"
  );
}

function isDisabledDemoConsent(value: unknown): boolean {
  return isRecord(value) && value.mode === "DISABLED";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertOperationalFixtures(fixtures: OperationalFixtures): void {
  if (new Set(fixtures.spotBookings.map(({ bookingId }) => bookingId)).size !== fixtures.spotBookings.length) {
    throw new Error("A demo booking cannot own more than one spot");
  }
  if (
    fixtures.cancellationCharges.some(
      ({
        stripeChargeId,
        stripeConnectionId,
        stripePaymentIntentId,
        commerceOperationId,
      }) =>
        stripeChargeId ||
        stripeConnectionId ||
        stripePaymentIntentId ||
        commerceOperationId,
    )
  ) {
    throw new Error("Demo cancellation charges must not bind to Stripe");
  }
  if (
    fixtures.substitutions.some(
      (item) => item.status === "ACCEPTED" && (!item.acceptedAt || !item.substituteId),
    )
  ) {
    throw new Error("Accepted demo substitutions must identify the substitute and acceptance time");
  }
}
