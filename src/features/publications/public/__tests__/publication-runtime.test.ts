import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublicationConsentCookie,
  getPublicationTrackingCategories,
  hasPublicationConsentDecision,
} from "../consent";
import {
  getPublishedPricingSnapshot,
  publishedPricingSourceIsCurrent,
} from "../pricing-snapshot";
import { buildPublicationThemeCss } from "../theme";
import {
  publishedInstructorWidgetSourceSchema,
  publishedEventWidgetSourceSchema,
  publishedIntroOfferWidgetSourceSchema,
  publishedBookingWidgetSourceSchema,
  publishedMembershipWidgetSourceSchema,
  publishedOnDemandWidgetSourceSchema,
  publishedReferralWidgetSourceSchema,
  publishedScheduleWidgetSourceSchema,
} from "../contracts";

const requiredConsent = {
  mode: "REQUIRED" as const,
  version: "2",
  privacyPolicyUrl: "https://example.com/privacy",
  categories: ["ANALYTICS" as const, "MARKETING" as const],
};

test("uses partitioned cross-site cookies for secure embedded consent", () => {
  assert.match(
    buildPublicationConsentCookie({
      targetId: "target-1",
      value: "decision",
      secure: true,
    }),
    /SameSite=None; Secure; Partitioned$/,
  );
  assert.match(
    buildPublicationConsentCookie({
      targetId: "target-1",
      value: "decision",
      secure: false,
    }),
    /SameSite=Lax$/,
  );
});

test("requires a current explicit consent decision before tracking", () => {
  const accepted = encodeURIComponent(
    JSON.stringify({ version: "2", categories: ["ANALYTICS"] }),
  );
  const necessary = encodeURIComponent(
    JSON.stringify({ version: "2", categories: [] }),
  );
  assert.equal(
    JSON.stringify(
      getPublicationTrackingCategories({
        analytics: "CONSENTED",
        config: requiredConsent,
        cookieValue: accepted,
      }),
    ),
    JSON.stringify(["ANALYTICS"]),
  );
  assert.deepEqual(
    getPublicationTrackingCategories({
      analytics: "CONSENTED",
      config: requiredConsent,
      cookieValue: necessary,
    }),
    [],
  );
  assert.equal(
    hasPublicationConsentDecision({
      config: requiredConsent,
      cookieValue: necessary,
    }),
    true,
  );
  assert.equal(
    hasPublicationConsentDecision({
      config: requiredConsent,
      cookieValue: encodeURIComponent(
        JSON.stringify({ version: "1", categories: ["ANALYTICS"] }),
      ),
    }),
    false,
  );
});

test("enforces publication analytics policy independently of consent mode", () => {
  const disabledConsent = {
    mode: "DISABLED" as const,
    version: "1",
    privacyPolicyUrl: null,
    categories: [],
  };
  assert.deepEqual(
    getPublicationTrackingCategories({
      analytics: "DISABLED",
      config: disabledConsent,
      cookieValue: undefined,
    }),
    [],
  );
  assert.deepEqual(
    getPublicationTrackingCategories({
      analytics: "CONSENTED",
      config: disabledConsent,
      cookieValue: undefined,
    }),
    [],
  );
  assert.deepEqual(
    getPublicationTrackingCategories({
      analytics: "ALWAYS",
      config: disabledConsent,
      cookieValue: undefined,
    }),
    ["ANALYTICS", "MARKETING"],
  );
});

test("uses the immutable pricing version and detects source drift", () => {
  const publishedAt = "2026-07-13T12:00:00.000Z";
  const result = getPublishedPricingSnapshot({
    schemaVersion: 1,
    channelConfig: {
      kind: "PRICING",
      showTerms: false,
      allowDirectPurchase: false,
    },
    source: {
      type: "PRICING",
      pricingOption: {
        id: "price-1",
        name: "Starter pack",
        slug: "starter-pack",
        description: null,
        type: "CLASS_PACK",
        price: "120.00",
        currency: "GBP",
        billingInterval: "ONE_TIME",
        classCredits: 5,
        durationDays: 30,
        isIntroOffer: true,
        isBundle: false,
        isPublic: true,
        isHidden: false,
        directPurchaseEnabled: true,
        buyPagePath: null,
        termsText: "Published terms",
        accessSummary: null,
        locationId: "location-1",
        updatedAt: publishedAt,
      },
    },
  });

  assert.equal(result?.option.price, "120.00");
  assert.equal(result?.policy.allowDirectPurchase, false);
  assert.equal(result?.policy.showTerms, false);
  assert.equal(
    publishedPricingSourceIsCurrent({
      snapshot: result,
      sourceId: "price-1",
      sourceUpdatedAt: new Date(publishedAt),
    }),
    true,
  );
  assert.equal(
    publishedPricingSourceIsCurrent({
      snapshot: result,
      sourceId: "price-1",
      sourceUpdatedAt: new Date("2026-07-13T12:01:00.000Z"),
    }),
    false,
  );
});

test("drops unsafe theme tokens", () => {
  const css = buildPublicationThemeCss({
    backgroundColor: "#ffffff",
    fontFamily: "Inter;position:fixed",
  });
  assert.match(css, /--publication-background:#ffffff/);
  assert.doesNotMatch(css, /position:fixed/);
});

test("published schedule widget snapshots fail closed by subtype and activity", () => {
  const source = {
    type: "WIDGET",
    widget: {
      id: "widget-1",
      name: "Website schedule",
      type: "SCHEDULE",
      locationId: "location-1",
      config: {},
      isActive: true,
      updatedAt: "2026-07-14T10:00:00.000Z",
    },
    brand: { id: "location-1", companyName: "Studio One" },
  };
  assert.equal(publishedScheduleWidgetSourceSchema.safeParse(source).success, true);
  assert.equal(
    publishedScheduleWidgetSourceSchema.safeParse({
      ...source,
      widget: { ...source.widget, type: "MEMBERSHIP" },
    }).success,
    false,
  );
  assert.equal(
    publishedScheduleWidgetSourceSchema.safeParse({
      ...source,
      widget: { ...source.widget, isActive: false },
    }).success,
    false,
  );
});

test("published instructor widgets expose only the public profile contract", () => {
  const source = {
    type: "WIDGET",
    widget: {
      id: "widget-2",
      name: "Meet the team",
      type: "INSTRUCTORS",
      locationId: "location-1",
      config: { instructorIds: ["instructor-1"] },
      isActive: true,
      updatedAt: "2026-07-14T10:00:00.000Z",
    },
    brand: { id: "location-1", companyName: "Studio One" },
    instructors: [
      {
        id: "instructor-1",
        name: "Alex Morgan",
        profilePhoto: "https://cdn.example.test/alex.jpg",
        bio: "Pilates and mobility coach.",
        specialties: ["Pilates"],
        certifications: [],
      },
    ],
  };
  assert.equal(
    publishedInstructorWidgetSourceSchema.safeParse(source).success,
    true,
  );
  assert.equal(
    publishedInstructorWidgetSourceSchema.safeParse({
      ...source,
      instructors: [{ ...source.instructors[0], email: "private@example.test" }],
    }).success,
    false,
  );
  const parsed = publishedInstructorWidgetSourceSchema.parse(source);
  assert.deepEqual(Object.keys(parsed.instructors[0]).sort(), [
    "bio",
    "certifications",
    "id",
    "name",
    "profilePhoto",
    "specialties",
  ]);
});

test("published booking widgets expose safe scoped launcher data only", () => {
  const source = {
    type: "WIDGET",
    widget: {
      id: "widget-booking",
      name: "Appointments",
      type: "BOOKING",
      locationId: "location-1",
      config: { eventTypeIds: ["event-1"] },
      isActive: true,
      updatedAt: "2026-07-14T10:00:00.000Z",
    },
    brand: { id: "location-1", companyName: "Studio One" },
    events: [
      {
        id: "event-1",
        title: "Intro appointment",
        description: "Meet the team.",
        length: 30,
        locationType: "CAL_VIDEO",
        calEventTypeId: 123,
        calComCredentialId: "credential-1",
        calUsername: "studio-one",
        slug: "intro-appointment",
      },
    ],
  };
  assert.equal(
    publishedBookingWidgetSourceSchema.safeParse(source).success,
    true,
  );
  assert.equal(
    publishedBookingWidgetSourceSchema.safeParse({
      ...source,
      events: [{ ...source.events[0], apiKey: "private" }],
    }).success,
    false,
  );
  assert.equal(
    publishedBookingWidgetSourceSchema.safeParse({
      ...source,
      events: [{ ...source.events[0], calUsername: "evil.example/path" }],
    }).success,
    false,
  );
});

test("published membership widgets reject provider and checkout fields", () => {
  const source = {
    type: "WIDGET",
    widget: {
      id: "widget-3",
      name: "Memberships",
      type: "MEMBERSHIP",
      locationId: "location-1",
      config: { pricingOptionIds: ["pricing-1"] },
      isActive: true,
      updatedAt: "2026-07-14T10:00:00.000Z",
    },
    brand: { id: "location-1", companyName: "Studio One" },
    offers: [
      {
        id: "pricing-1",
        name: "Unlimited",
        descriptionHtml: "<p>Unlimited studio classes.</p>",
        price: "129.00",
        currency: "GBP",
        billingInterval: "MONTHLY",
        classCredits: null,
        durationDays: null,
        accessSummary: "All studio classes",
        updatedAt: "2026-07-14T10:00:00.000Z",
      },
    ],
  };
  assert.equal(
    publishedMembershipWidgetSourceSchema.safeParse(source).success,
    true,
  );
  assert.equal(
    publishedMembershipWidgetSourceSchema.safeParse({
      ...source,
      offers: [{ ...source.offers[0], stripePriceId: "price_private" }],
    }).success,
    false,
  );
});

test("published intro offer widgets expose only immutable pricing destinations", () => {
  const source = {
    type: "WIDGET",
    widget: {
      id: "widget-intro",
      name: "New client offers",
      type: "INTRO_OFFER",
      locationId: "location-1",
      config: { pricingOptionIds: ["pricing-intro"] },
      isActive: true,
      updatedAt: "2026-07-14T10:00:00.000Z",
    },
    brand: { id: "location-1", companyName: "Studio One" },
    organizationSlug: "studio-one",
    offers: [
      {
        id: "pricing-intro",
        name: "Three class starter",
        descriptionHtml: "<p>Start with three classes.</p>",
        price: "29.00",
        currency: "GBP",
        billingInterval: "ONE_TIME",
        classCredits: 3,
        durationDays: 14,
        accessSummary: "Any beginner class",
        updatedAt: "2026-07-14T10:00:00.000Z",
        pricingTarget: {
          id: "target-pricing-intro",
          slug: "three-class-starter",
          versionId: "version-pricing-intro",
        },
      },
    ],
  };
  assert.equal(
    publishedIntroOfferWidgetSourceSchema.safeParse(source).success,
    true,
  );
  assert.equal(
    publishedIntroOfferWidgetSourceSchema.safeParse({
      ...source,
      offers: [{ ...source.offers[0], stripePriceId: "price_private" }],
    }).success,
    false,
  );
  assert.equal(
    publishedIntroOfferWidgetSourceSchema.safeParse({
      ...source,
      offers: [{ ...source.offers[0], buyPagePath: "https://evil.test" }],
    }).success,
    false,
  );
});

test("published event widgets expose discovery data without mutation destinations", () => {
  const source = {
    type: "WIDGET",
    widget: {
      id: "widget-event",
      name: "Workshops",
      type: "EVENT",
      locationId: "location-1",
      config: { serviceTypeIds: ["service-event"] },
      isActive: true,
      updatedAt: "2026-07-14T10:00:00.000Z",
    },
    brand: { id: "location-1", companyName: "Studio One" },
    timezone: "Europe/London",
    events: [
      {
        id: "service-event",
        name: "Mobility workshop",
        description: "A focused two-hour workshop.",
        imageUrl: "https://cdn.example.test/workshop.jpg",
        format: "IN_PERSON",
        defaultLocation: "Main studio",
        durationMinutes: 120,
        price: "45.00",
        currency: "GBP",
        updatedAt: "2026-07-14T10:00:00.000Z",
        occurrences: [
          {
            id: "class-event",
            name: "Mobility workshop",
            startTime: "2026-08-14T10:00:00.000Z",
            endTime: "2026-08-14T12:00:00.000Z",
            instructorName: "Alex Morgan",
            location: "Main studio",
            roomName: "Room one",
            isVirtual: false,
            updatedAt: "2026-07-14T10:00:00.000Z",
          },
        ],
      },
    ],
  };
  assert.equal(publishedEventWidgetSourceSchema.safeParse(source).success, true);
  assert.equal(
    publishedEventWidgetSourceSchema.safeParse({
      ...source,
      events: [{ ...source.events[0], checkoutUrl: "https://evil.test" }],
    }).success,
    false,
  );
  assert.equal(
    publishedEventWidgetSourceSchema.safeParse({
      ...source,
      events: [
        {
          ...source.events[0],
          occurrences: [
            { ...source.events[0].occurrences[0], clientEmail: "private@example.test" },
          ],
        },
      ],
    }).success,
    false,
  );
});

test("published on-demand widgets expose only public credential-free media", () => {
  const source = {
    type: "WIDGET",
    widget: {
      id: "widget-video",
      name: "Free classes",
      type: "ON_DEMAND",
      locationId: "location-1",
      config: { assetIds: ["video-1"] },
      isActive: true,
      updatedAt: "2026-07-14T10:00:00.000Z",
    },
    brand: { id: "location-1", companyName: "Studio One" },
    assets: [
      {
        id: "video-1",
        title: "Mobility reset",
        description: "A free guided mobility class.",
        videoUrl: "https://media.example.test/mobility-reset.mp4",
        thumbnailUrl: "https://media.example.test/mobility-reset.jpg",
        durationSeconds: 1_800,
        instructorName: "Alex Morgan",
        classTypeName: "Mobility",
        updatedAt: "2026-07-14T10:00:00.000Z",
      },
    ],
  };
  assert.equal(
    publishedOnDemandWidgetSourceSchema.safeParse(source).success,
    true,
  );
  assert.equal(
    publishedOnDemandWidgetSourceSchema.safeParse({
      ...source,
      assets: [{ ...source.assets[0], providerToken: "private" }],
    }).success,
    false,
  );
  assert.equal(
    publishedOnDemandWidgetSourceSchema.safeParse({
      ...source,
      assets: [
        {
          ...source.assets[0],
          videoUrl: "https://media.example.test/video.mp4?token=private",
        },
      ],
    }).success,
    false,
  );
});

test("published referral widgets expose program terms without referral identities", () => {
  const source = {
    type: "WIDGET",
    widget: {
      id: "widget-referral",
      name: "Refer a friend",
      type: "REFERRAL",
      locationId: "location-1",
      config: { programId: "program-1" },
      isActive: true,
      updatedAt: "2026-07-14T10:00:00.000Z",
    },
    brand: { id: "location-1", companyName: "Studio One" },
    program: {
      id: "program-1",
      name: "Refer a friend",
      referrerRewardType: "CREDIT",
      referrerRewardValue: "10.00",
      refereeRewardType: "DISCOUNT",
      refereeRewardValue: "15.00",
      currency: "GBP",
      refereeOfferDays: 30,
      isActive: true,
      updatedAt: "2026-07-14T10:00:00.000Z",
    },
  };
  assert.equal(
    publishedReferralWidgetSourceSchema.safeParse(source).success,
    true,
  );
  for (const privateField of [
    { referralCode: "PRIVATE-CODE" },
    { refereeEmail: "private@example.test" },
    { refereePhone: "+441234567890" },
    { referrerClientId: "client-1" },
  ]) {
    assert.equal(
      publishedReferralWidgetSourceSchema.safeParse({
        ...source,
        program: { ...source.program, ...privateField },
      }).success,
      false,
    );
  }
});
