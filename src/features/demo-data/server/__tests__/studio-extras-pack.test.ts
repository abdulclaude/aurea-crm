import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_DATA_PROFILE_CONFIG } from "@/features/demo-data/contracts";
import {
  assertOperationalFixtures,
  assertStudioExtrasFixturePlan,
  buildOperationalFixtures,
  buildStudioExtrasFixturePlan,
  type OperationalBooking,
  type OperationalClass,
  type StudioExtrasDependencies,
} from "@/features/demo-data/server/packs/studio-extras-pack";
import {
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import {
  eventWidgetConfigSchema,
  introOfferWidgetConfigSchema,
  membershipWidgetConfigSchema,
  onDemandWidgetConfigSchema,
  referralWidgetConfigSchema,
} from "@/features/studio/widgets/contracts";

const referenceDate = new Date("2026-07-14T12:00:00.000Z");

function buildContext(profile: "SHOWCASE" | "QA_EXHAUSTIVE"): DemoSeedContext {
  return {
    organizationId: "org-demo",
    locationId: "location-demo",
    actorUserId: "user-demo",
    currency: "GBP",
    timezone: "Europe/London",
    referenceDate,
    runId: `run-studio-extras-${profile.toLowerCase()}`,
    profile,
    profileConfig: DEMO_DATA_PROFILE_CONFIG[profile],
  };
}

const dependencies: StudioExtrasDependencies = {
  clients: Array.from({ length: 600 }, (_, index) => ({
    id: `client-${index}`,
    name: `Demo client ${index}`,
  })),
  catalog: {
    classTypes: Array.from({ length: 8 }, (_, index) => ({
      id: `class-type-${index}`,
      name: `Class type ${index}`,
    })),
    instructors: Array.from({ length: 24 }, (_, index) => ({
      id: `instructor-${index}`,
      name: `Instructor ${index}`,
      isActive: index !== 23,
      isSystem: false,
    })),
    plans: Array.from({ length: 6 }, (_, index) => ({
      id: `plan-${index}`,
      name: `Membership plan ${index}`,
    })),
    pricingOptions: Array.from({ length: 6 }, (_, index) => ({
      id: `pricing-option-${index}`,
      name: `Pricing option ${index}`,
      slug: `pricing-option-${index}`,
      description: `Pricing option ${index}`,
      type:
        index < 2
          ? ("MEMBERSHIP" as const)
          : index === 5
            ? ("INTRO_OFFER" as const)
            : ("CLASS_PACK" as const),
      price: "49.00",
      currency: "GBP",
      billingInterval: index < 2 ? ("MONTHLY" as const) : ("ONE_TIME" as const),
      classCredits: index < 2 ? null : 5,
      durationDays: 30,
      isIntroOffer: index === 5,
      isBundle: false,
      directPurchaseEnabled: false,
      buyPagePath: null,
      termsText: null,
      accessSummary: "Demo access",
      updatedAt: referenceDate,
      isActive: true,
      isPublic: index < 2 || index === 5,
      isHidden: index >= 2 && index !== 5,
    })),
    rooms: [
      { id: "room-0", name: "Main Studio", capacity: 25 },
      { id: "room-1", name: "Reformer Lab", capacity: 12 },
      { id: "room-2", name: "Spin Studio", capacity: 30 },
      { id: "room-3", name: "Private Suite", capacity: 2 },
      { id: "room-4", name: "Hybrid Studio", capacity: 50 },
    ],
    services: [
      { id: "service-class", name: "Demo class", experienceType: "CLASS", isActive: true },
      { id: "service-event", name: "Demo event", experienceType: "EVENT", isActive: true },
    ],
  },
};

function operationalSource(): {
  classes: OperationalClass[];
  bookings: OperationalBooking[];
} {
  const classes = Array.from({ length: 30 }, (_, index) => ({
    id: `class-${index}`,
    instructorId: `instructor-${index % 10}`,
    roomId: `room-${index % 3}`,
    startTime: new Date(referenceDate.getTime() + (index + 1) * 86_400_000),
  }));
  const bookings = Array.from({ length: 80 }, (_, index) => ({
    id: `booking-${index}`,
    classId: classes[index % classes.length].id,
    clientId: `client-${index}`,
    roomId: classes[index % classes.length].roomId,
    status:
      index % 10 === 0
        ? ("NO_SHOW" as const)
        : index % 11 === 0
          ? ("LATE_CANCEL" as const)
          : index % 3 === 0
            ? ("ATTENDED" as const)
            : ("BOOKED" as const),
  }));
  return { classes, bookings };
}

test("SHOWCASE fixtures populate broad studio surfaces without external effects", () => {
  const context = buildContext("SHOWCASE");
  const first = buildStudioExtrasFixturePlan(context, dependencies);
  const second = buildStudioExtrasFixturePlan(context, dependencies);

  assert.deepEqual(first, second);
  assert.doesNotThrow(() =>
    assertStudioExtrasFixturePlan(context, dependencies, first),
  );
  assert.equal(first.promoCodes.length, 4);
  assert.equal(first.giftCards.length, 12);
  assert.equal(first.accountBalances.length, 24);
  assert.equal(first.waiverSignatures.length, 45);
  assert.equal(first.roomLayouts.length, 3);
  assert.equal(first.widgets.length, 7);
  assert.equal(first.widgetPublicationTargets.length, 7);
  assert.equal(first.pricingPublicationTargets.length, 1);
  assert.equal(first.pricingPublicationVersions.length, 1);
  assert.ok(
    first.widgetPublicationTargets.every(
      ({
        status,
        publishedVersionId,
        publishedAt,
        domainHost,
        domainStatus,
        sslStatus,
        channelConfig,
        consentConfig,
      }) =>
        status === "DRAFT" &&
        publishedVersionId === null &&
        publishedAt == null &&
        domainHost === null &&
        domainStatus === "NOT_CONFIGURED" &&
        sslStatus === "NOT_CONFIGURED" &&
        JSON.stringify(channelConfig).includes("http://localhost:3000") &&
        JSON.stringify(consentConfig).includes('"mode":"DISABLED"'),
    ),
  );
  assert.deepEqual(
    new Set(first.widgets.map(({ type }) => type)),
    new Set([
      "SCHEDULE",
      "INSTRUCTORS",
      "MEMBERSHIP",
      "INTRO_OFFER",
      "EVENT",
      "ON_DEMAND",
      "REFERRAL",
    ]),
  );
  const showcaseMembership = first.widgets.find(
    ({ type }) => type === "MEMBERSHIP",
  );
  assert.equal(
    membershipWidgetConfigSchema.parse(showcaseMembership?.config)
      .pricingOptionIds.length,
    2,
  );
  assert.equal(
    eventWidgetConfigSchema.parse(
      first.widgets.find(({ type }) => type === "EVENT")?.config,
    ).serviceTypeIds.length,
    1,
  );
  assert.equal(
    onDemandWidgetConfigSchema.parse(
      first.widgets.find(({ type }) => type === "ON_DEMAND")?.config,
    ).assetIds.length,
    5,
  );
  assert.equal(
    introOfferWidgetConfigSchema.parse(
      first.widgets.find(({ type }) => type === "INTRO_OFFER")?.config,
    ).pricingOptionIds.length,
    1,
  );
  assert.equal(
    referralWidgetConfigSchema.parse(
      first.widgets.find(({ type }) => type === "REFERRAL")?.config,
    ).programId,
    deterministicDemoId(context.runId, "referral-program", 0),
  );
  assert.equal(first.videoOnDemandAssets.length, 8);
  assert.ok(first.spots.length >= 60);
  assert.ok(first.accountTransactions.length > first.accountBalances.length * 2);
  assert.ok(first.paymentPlans.every(({ provider }) => provider === "INTERNAL"));
  assert.ok(first.giftCards.every(({ stripePaymentIntentId }) => !stripePaymentIntentId));
  assert.equal(first.channels.length, 2);
  assert.equal(first.performanceMetrics.length, 60);
  assert.equal(first.workoutPrograms.length, 6);
  assert.ok(first.channels.every(({ credentials }) => !credentials));
  assert.equal(first.instructorPayouts.length, 24);
  assert.ok(first.instructorPayouts.every(({ stripeTransferId }) => !stripeTransferId));

  const operational = buildOperationalFixtures(
    context,
    dependencies,
    first,
    operationalSource(),
  );
  assert.doesNotThrow(() => assertOperationalFixtures(operational));
  assert.ok(operational.spotBookings.length > 0);
  assert.ok(operational.cancellationCharges.length > 0);
  assert.ok(operational.substitutions.length > 0);
});

test("QA_EXHAUSTIVE fixtures scale samples and retain state coverage", () => {
  const context = buildContext("QA_EXHAUSTIVE");
  const plan = buildStudioExtrasFixturePlan(context, dependencies);

  assert.doesNotThrow(() =>
    assertStudioExtrasFixturePlan(context, dependencies, plan),
  );
  assert.equal(plan.promoCodes.length, 8);
  assert.equal(plan.giftCards.length, 40);
  assert.equal(plan.accountBalances.length, 100);
  assert.equal(plan.waiverSignatures.length, 220);
  assert.equal(plan.roomLayouts.length, 5);
  assert.equal(plan.widgets.length, 12);
  assert.equal(plan.widgetPublicationTargets.length, 12);
  assert.deepEqual(
    new Set(plan.widgets.map(({ type }) => type)),
    new Set([
      "SCHEDULE",
      "INSTRUCTORS",
      "MEMBERSHIP",
      "INTRO_OFFER",
      "EVENT",
      "ON_DEMAND",
      "REFERRAL",
    ]),
  );
  const qaMemberships = plan.widgets
    .filter(({ type }) => type === "MEMBERSHIP")
    .map(({ config }) => membershipWidgetConfigSchema.parse(config));
  assert.deepEqual(
    qaMemberships.map(({ pricingOptionIds }) => pricingOptionIds.length),
    [2, 1],
  );
  assert.equal(plan.pricingRules.length, 8);
  assert.equal(plan.paymentPlans.length, 6);
  assert.equal(plan.channels.length, 4);
  assert.equal(plan.accessIntegrations.length, 4);
  assert.equal(plan.marketplaceListings.length, 5);
  assert.equal(plan.performanceMetrics.length, 300);
  assert.equal(plan.workoutPrograms.length, 18);
  assert.equal(plan.soapNotes.length, 100);
  assert.equal(plan.instructorPayouts.length, 70);
  assert.equal(plan.videoOnDemandAssets.length, 18);
  assert.deepEqual(
    new Set(plan.giftCards.map(({ isActive }) => isActive)),
    new Set([true, false]),
  );
  assert.deepEqual(
    new Set(plan.pricingRules.map(({ adjustmentType }) => adjustmentType)),
    new Set(["PERCENT", "FIXED_AMOUNT"]),
  );
  assert.ok(plan.waiverSignatures.some(({ expiresAt }) => expiresAt && expiresAt < referenceDate));

  const operational = buildOperationalFixtures(
    context,
    dependencies,
    plan,
    operationalSource(),
  );
  assert.doesNotThrow(() => assertOperationalFixtures(operational));
  assert.deepEqual(
    new Set(operational.cancellationCharges.map(({ type }) => type)),
    new Set(["NO_SHOW", "LATE_CANCEL"]),
  );
  assert.ok(operational.substitutions.some(({ status }) => status === "ACCEPTED"));
});

test("widget fixtures exclude sources that public runtime would reject", () => {
  const context = buildContext("SHOWCASE");
  const ineligibleInstructorId = dependencies.catalog.instructors[0].id;
  const ineligibleMembershipId = dependencies.catalog.pricingOptions[0].id;
  const scopedDependencies: StudioExtrasDependencies = {
    ...dependencies,
    catalog: {
      ...dependencies.catalog,
      instructors: dependencies.catalog.instructors.map((row, index) =>
        index === 0 ? { ...row, isActive: false } : row,
      ),
      pricingOptions: dependencies.catalog.pricingOptions.map((row, index) =>
        index === 0 ? { ...row, isHidden: true } : row,
      ),
    },
  };
  const plan = buildStudioExtrasFixturePlan(context, scopedDependencies);
  const instructorWidget = plan.widgets.find(
    ({ type }) => type === "INSTRUCTORS",
  );
  const membershipWidget = plan.widgets.find(
    ({ type }) => type === "MEMBERSHIP",
  );

  assert.doesNotMatch(
    JSON.stringify(instructorWidget?.config),
    new RegExp(ineligibleInstructorId),
  );
  assert.doesNotMatch(
    JSON.stringify(membershipWidget?.config),
    new RegExp(ineligibleMembershipId),
  );
});

test("widget publication fixtures reject any public or external-domain state", () => {
  const context = buildContext("SHOWCASE");
  const plan = buildStudioExtrasFixturePlan(context, dependencies);
  const target = plan.widgetPublicationTargets[0];
  assert.ok(target);
  target.domainHost = "demo.example.test";

  assert.throws(
    () => assertStudioExtrasFixturePlan(context, dependencies, plan),
    /unpublished drafts/,
  );
});
