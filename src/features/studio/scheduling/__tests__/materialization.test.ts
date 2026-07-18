import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  legacyBookingValues,
  legacyWaitlistValues,
  schedulingCandidatesAt,
  toVersionedSchedulingPolicy,
} from "@/features/studio/server/scheduling-policy-materialization-helpers";

describe("scheduling policy materialization", () => {
  it("uses the newest effective version without leaking future changes", () => {
    const candidates = schedulingCandidatesAt({
      definitions: [
        { id: "location", locationId: "loc-1", isDefault: true },
        { id: "organization", locationId: null, isDefault: true },
      ],
      versions: [
        {
          id: "location-v3",
          policyId: "location",
          version: 3,
          effectiveFrom: new Date("2026-09-01T00:00:00.000Z"),
          values: "future",
        },
        {
          id: "location-v2",
          policyId: "location",
          version: 2,
          effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
          values: "current",
        },
        {
          id: "organization-v1",
          policyId: "organization",
          version: 1,
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
          values: "organization",
        },
      ],
      startsAt: new Date("2026-07-01T12:00:00.000Z"),
      locationId: "loc-1",
      overrideId: null,
      servicePolicyId: null,
    });

    assert.equal(candidates.locationDefault?.currentVersion.id, "location-v2");
    assert.equal(
      toVersionedSchedulingPolicy(candidates.locationDefault)?.values,
      "current",
    );
    assert.equal(
      candidates.organizationDefault?.currentVersion.id,
      "organization-v1",
    );
  });

  it("preserves legacy behavior for existing classes", () => {
    assert.deepEqual(
      legacyBookingValues({
        bookingWindowHours: 48,
        cancellationWindowHours: 6,
      }),
      {
        opensMinutesBeforeStart: 2_880,
        closesMinutesBeforeStart: 0,
        cancellationsCloseMinutesBeforeStart: 360,
        blockClientCancellations: false,
      },
    );
    assert.deepEqual(
      legacyWaitlistValues({
        waitlistEnabled: true,
        autoPromoteWaitlist: true,
      }),
      {
        mode: "OFFER_NEXT",
        automationClosesMinutesBeforeStart: 0,
        maxEntries: null,
        allowOverlappingReservations: true,
        creditHoldPolicy: "NONE",
        offerExpiryMinutes: 15,
        failureFallback: "MANUAL_REVIEW",
      },
    );
  });
});
