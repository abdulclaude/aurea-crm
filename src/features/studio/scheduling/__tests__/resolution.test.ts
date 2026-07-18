import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bookingWindowValuesSchema,
  createWaitlistPolicySchema,
  waitlistValuesSchema,
  type BookingWindowValues,
  type WaitlistValues,
} from "@/features/studio/scheduling/contracts";
import {
  resolveBookingWindowPolicy,
  resolveWaitlistPolicy,
  type VersionedSchedulingPolicy,
} from "@/features/studio/scheduling/resolution";

const groupBooking: BookingWindowValues = {
  opensMinutesBeforeStart: 90 * 24 * 60,
  closesMinutesBeforeStart: -15,
  cancellationsCloseMinutesBeforeStart: 0,
  blockClientCancellations: false,
};
const membershipBooking: BookingWindowValues = {
  opensMinutesBeforeStart: 72 * 60,
  closesMinutesBeforeStart: 60,
  cancellationsCloseMinutesBeforeStart: 24 * 60,
  blockClientCancellations: true,
};
const basicWaitlist: WaitlistValues = {
  mode: "OFFER_NEXT",
  automationClosesMinutesBeforeStart: 0,
  maxEntries: 20,
  allowOverlappingReservations: false,
  creditHoldPolicy: "NONE",
  offerExpiryMinutes: 15,
  failureFallback: "NOTIFY_ALL",
};
const membershipWaitlist: WaitlistValues = {
  mode: "AUTO_BOOK",
  automationClosesMinutesBeforeStart: 30,
  maxEntries: 8,
  allowOverlappingReservations: true,
  creditHoldPolicy: "HOLD_ON_JOIN",
  offerExpiryMinutes: null,
  failureFallback: "NOTIFY_ALL",
};

function versioned<TValues>(
  policyId: string,
  values: TValues,
): VersionedSchedulingPolicy<TValues> {
  return {
    policyId,
    versionId: `${policyId}-v2`,
    version: 2,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    values,
  };
}

describe("scheduling policy resolution", () => {
  it("supports Arketa-compatible window values including booking after start", () => {
    assert.deepEqual(
      bookingWindowValuesSchema.parse(groupBooking),
      groupBooking,
    );
    assert.throws(() =>
      bookingWindowValuesSchema.parse({
        ...groupBooking,
        closesMinutesBeforeStart: -1441,
      }),
    );
  });

  it("resolves class, service, location, organization, then legacy precedence", () => {
    const organizationDefault = versioned("org", groupBooking);
    const locationDefault = versioned("location", membershipBooking);
    const serviceAssignment = versioned("service", groupBooking);

    assert.equal(
      resolveBookingWindowPolicy({
        classOverride: versioned("class", membershipBooking),
        serviceAssignment,
        locationDefault,
        organizationDefault,
        legacy: groupBooking,
      }).source,
      "CLASS_OVERRIDE",
    );
    assert.equal(
      resolveBookingWindowPolicy({
        serviceAssignment,
        locationDefault,
        organizationDefault,
        legacy: groupBooking,
      }).policyId,
      "service",
    );
    assert.equal(
      resolveBookingWindowPolicy({
        locationDefault,
        organizationDefault,
        legacy: groupBooking,
      }).policyId,
      "location",
    );
    assert.equal(
      resolveBookingWindowPolicy({
        organizationDefault,
        legacy: membershipBooking,
      }).policyId,
      "org",
    );
    assert.equal(
      resolveBookingWindowPolicy({ legacy: membershipBooking }).source,
      "LEGACY",
    );
  });

  it("proves materially different waitlist configurations", () => {
    assert.deepEqual(waitlistValuesSchema.parse(basicWaitlist), basicWaitlist);
    assert.deepEqual(
      waitlistValuesSchema.parse(membershipWaitlist),
      membershipWaitlist,
    );
    const resolved = resolveWaitlistPolicy({
      serviceAssignment: versioned("membership", membershipWaitlist),
      locationDefault: versioned("location", basicWaitlist),
      legacy: basicWaitlist,
    });
    assert.equal(resolved.source, "SERVICE_TYPE");
    assert.equal(resolved.values.mode, "AUTO_BOOK");
    assert.equal(resolved.values.creditHoldPolicy, "HOLD_ON_JOIN");
  });

  it("rejects contradictory disabled waitlist settings", () => {
    assert.throws(() =>
      waitlistValuesSchema.parse({
        ...basicWaitlist,
        mode: "DISABLED",
        creditHoldPolicy: "HOLD_ON_JOIN",
      }),
    );
  });

  it("keeps unsupported automation out of operator-managed waitlist versions", () => {
    const parsed = createWaitlistPolicySchema.safeParse({
      name: "Credit-hold auto-book",
      effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
      values: membershipWaitlist,
    });
    assert.equal(parsed.success, false);
  });
});
