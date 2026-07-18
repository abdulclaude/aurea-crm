import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  clearRealtimeCache,
  peekRealtimeEvents,
  pushRealtimeEvents,
  removeRealtimeEventsForSubjects,
} from "../realtime-cache";

const baseEvent = {
  eventName: "page_view",
  pagePath: "/",
  pageTitle: "Home",
  deviceType: "desktop",
  browserName: "Browser",
  countryCode: null,
  city: null,
  isConversion: false,
  revenue: null,
  timestamp: new Date("2026-07-14T00:00:00.000Z"),
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  lcp: null,
  inp: null,
  cls: null,
  fcp: null,
  ttfb: null,
  vitalRating: null,
};

afterEach(() => clearRealtimeCache());

describe("realtime privacy erasure", () => {
  it("removes only the matching subject from scoped funnel caches", () => {
    pushRealtimeEvents("funnel_a", [
      {
        ...baseEvent,
        id: "event_a",
        anonymousId: "visitor_a",
        userId: null,
      },
      {
        ...baseEvent,
        id: "event_b",
        anonymousId: "visitor_b",
        userId: "other@example.com",
      },
    ]);
    pushRealtimeEvents("funnel_b", [
      {
        ...baseEvent,
        id: "event_c",
        anonymousId: "visitor_a",
        userId: null,
      },
    ]);

    const removed = removeRealtimeEventsForSubjects({
      anonymousIds: ["visitor_a"],
      funnelIds: ["funnel_a"],
      userIds: [],
    });

    assert.equal(removed, 1);
    assert.deepEqual(
      peekRealtimeEvents("funnel_a").map((event) => event.id),
      ["event_b"],
    );
    assert.deepEqual(
      peekRealtimeEvents("funnel_b").map((event) => event.id),
      ["event_c"],
    );
  });
});
