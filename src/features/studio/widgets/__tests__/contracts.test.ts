import assert from "node:assert/strict";
import test from "node:test";

import {
  bookingWidgetConfigSchema,
  eventWidgetConfigSchema,
  instructorWidgetConfigSchema,
  introOfferWidgetConfigSchema,
  membershipWidgetConfigSchema,
  onDemandWidgetConfigSchema,
  referralWidgetConfigSchema,
  scheduleWidgetConfigSchema,
} from "../contracts";
import { buildCalBookingDestination } from "../booking-destination";

test("applies bounded schedule widget defaults", () => {
  const config = scheduleWidgetConfigSchema.parse({});
  assert.equal(config.maxDaysAhead, 14);
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.showInstructors, true);
  assert.deepEqual(config.classTypeIds, []);
});

test("supports two bounded provider-backed booking configurations", () => {
  const grid = bookingWidgetConfigSchema.parse({
    eventTypeIds: ["consultation", "assessment"],
  });
  const list = bookingWidgetConfigSchema.parse({
    eventTypeIds: ["intro"],
    layout: "LIST",
    showDescription: false,
    showDuration: false,
    buttonLabel: "Choose a time",
  });
  assert.equal(grid.layout, "GRID");
  assert.equal(grid.showPrice, false);
  assert.equal(list.layout, "LIST");
  assert.equal(list.buttonLabel, "Choose a time");
  assert.equal(
    bookingWidgetConfigSchema.safeParse({ eventTypeIds: ["one", "one"] })
      .success,
    false,
  );
  assert.equal(
    bookingWidgetConfigSchema.safeParse({ eventTypeIds: [] }).success,
    false,
  );
});

test("builds booking destinations only from safe Cal.com path segments", () => {
  assert.equal(
    buildCalBookingDestination({
      username: "studio.north",
      eventSlug: "intro-session",
    }),
    "https://cal.com/studio.north/intro-session",
  );
  assert.throws(() =>
    buildCalBookingDestination({
      username: "example.com/escape",
      eventSlug: "intro-session",
    }),
  );
  assert.throws(() =>
    buildCalBookingDestination({
      username: "studio",
      eventSlug: "https://evil.example",
    }),
  );
});

test("keeps membership catalogs explicit and internally consistent", () => {
  const config = membershipWidgetConfigSchema.parse({
    pricingOptionIds: ["membership-a", "membership-b"],
    featuredPricingOptionId: "membership-b",
  });
  assert.equal(config.layout, "GRID");
  assert.equal(config.showPrice, true);
  assert.equal(config.featuredPricingOptionId, "membership-b");
  assert.equal(
    membershipWidgetConfigSchema.safeParse({
      pricingOptionIds: ["membership-a"],
      featuredPricingOptionId: "membership-b",
    }).success,
    false,
  );
  assert.equal(
    membershipWidgetConfigSchema.safeParse({
      pricingOptionIds: ["membership-a", "membership-a"],
    }).success,
    false,
  );
});

test("keeps intro offers publication-backed and internally consistent", () => {
  const config = introOfferWidgetConfigSchema.parse({
    pricingOptionIds: ["intro-a", "intro-b"],
    featuredPricingOptionId: "intro-a",
  });
  assert.equal(config.buttonLabel, "View intro offer");
  assert.equal(config.showDuration, true);
  assert.equal(
    introOfferWidgetConfigSchema.safeParse({
      pricingOptionIds: ["intro-a"],
      featuredPricingOptionId: "intro-b",
    }).success,
    false,
  );
  assert.equal(
    introOfferWidgetConfigSchema.safeParse({
      pricingOptionIds: ["intro-a", "intro-a"],
    }).success,
    false,
  );
});

test("keeps public free on-demand galleries explicit and bounded", () => {
  const grid = onDemandWidgetConfigSchema.parse({
    assetIds: ["video-a", "video-b"],
  });
  const list = onDemandWidgetConfigSchema.parse({
    assetIds: ["video-c"],
    layout: "LIST",
    showDescription: false,
    showInstructor: false,
  });
  assert.equal(grid.columns, 3);
  assert.equal(grid.showDuration, true);
  assert.equal(list.layout, "LIST");
  assert.equal(list.showInstructor, false);
  assert.equal(
    onDemandWidgetConfigSchema.safeParse({ assetIds: ["video-a", "video-a"] })
      .success,
    false,
  );
  assert.equal(
    onDemandWidgetConfigSchema.safeParse({ assetIds: [] }).success,
    false,
  );
});

test("keeps event discovery bounded and read-only", () => {
  const grid = eventWidgetConfigSchema.parse({
    serviceTypeIds: ["event-a", "event-b"],
  });
  const list = eventWidgetConfigSchema.parse({
    serviceTypeIds: ["event-c"],
    layout: "LIST",
    occurrencesPerEvent: 6,
    showPrice: false,
  });
  assert.equal(grid.occurrencesPerEvent, 3);
  assert.equal(grid.showSchedule, true);
  assert.equal(list.layout, "LIST");
  assert.equal(list.showPrice, false);
  assert.equal(
    eventWidgetConfigSchema.safeParse({ serviceTypeIds: ["event-a", "event-a"] })
      .success,
    false,
  );
  assert.equal(
    eventWidgetConfigSchema.safeParse({
      serviceTypeIds: ["event-a"],
      occurrencesPerEvent: 7,
    }).success,
    false,
  );
  assert.equal(
    eventWidgetConfigSchema.safeParse({
      serviceTypeIds: ["event-a"],
      bookingUrl: "https://example.test/book",
    }).success,
    false,
  );
});

test("keeps referral widgets read-only and reward focused", () => {
  const stacked = referralWidgetConfigSchema.parse({ programId: "program-a" });
  const inline = referralWidgetConfigSchema.parse({
    programId: "program-b",
    layout: "INLINE",
    showReferrerReward: false,
    showOfferWindow: false,
  });
  assert.equal(stacked.layout, "STACKED");
  assert.equal(stacked.showRefereeReward, true);
  assert.equal(inline.layout, "INLINE");
  assert.equal(inline.showOfferWindow, false);
  assert.equal(
    referralWidgetConfigSchema.safeParse({
      programId: "program-a",
      showReferrerReward: false,
      showRefereeReward: false,
    }).success,
    false,
  );
  assert.equal(
    referralWidgetConfigSchema.safeParse({
      programId: "program-a",
      referralCode: "PRIVATE-CODE",
    }).success,
    false,
  );
});

test("supports materially different bounded instructor galleries", () => {
  const grid = instructorWidgetConfigSchema.parse({
    instructorIds: ["instructor-a", "instructor-b"],
  });
  const list = instructorWidgetConfigSchema.parse({
    instructorIds: ["instructor-c"],
    layout: "LIST",
    showProfilePhoto: false,
    showBio: false,
    showSpecialties: false,
    showCertifications: true,
  });
  assert.equal(grid.layout, "GRID");
  assert.equal(grid.columns, 3);
  assert.equal(list.layout, "LIST");
  assert.equal(list.showProfilePhoto, false);
  assert.equal(list.showCertifications, true);
  assert.equal(
    instructorWidgetConfigSchema.safeParse({ instructorIds: [] }).success,
    false,
  );
  assert.equal(
    instructorWidgetConfigSchema.safeParse({
      instructorIds: ["instructor-a", "instructor-a"],
    }).success,
    false,
  );
  assert.equal(
    instructorWidgetConfigSchema.safeParse({
      instructorIds: ["instructor-a"],
      email: true,
    }).success,
    false,
  );
});

test("rejects unsafe or unbounded visual and inventory configuration", () => {
  assert.equal(
    scheduleWidgetConfigSchema.safeParse({ primaryColor: "red;position:fixed" })
      .success,
    false,
  );
  assert.equal(
    scheduleWidgetConfigSchema.safeParse({ maxDaysAhead: 365 }).success,
    false,
  );
  assert.equal(
    scheduleWidgetConfigSchema.safeParse({ fontFamily: "url(evil)" }).success,
    false,
  );
  assert.equal(
    scheduleWidgetConfigSchema.safeParse({ classTypeIds: ["one", "one"] })
      .success,
    false,
  );
  assert.equal(
    scheduleWidgetConfigSchema.safeParse({ demoLocationId: "loc-other" })
      .success,
    false,
  );
});
