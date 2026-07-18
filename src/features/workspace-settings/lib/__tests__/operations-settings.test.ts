import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  requiredWorkspaceOperationsValuesSchema,
  workspaceOperationsValuesSchema,
} from "../../operations-contracts";
import {
  bookingFitsBusinessHours,
  guestBookingPolicyError,
} from "../booking-operations-policy";
import {
  resolveWorkspaceOperationsSettings,
  resolvedOperationsValues,
  SYSTEM_OPERATIONS_DEFAULTS,
} from "../operations-settings";

describe("workspace operations settings", () => {
  it("resolves materially different organization and location configurations", () => {
    const organization = {
      ...SYSTEM_OPERATIONS_DEFAULTS,
      scheduleStartMinutes: 360,
      scheduleEndMinutes: 1260,
      scheduleSlotMinutes: 20 as const,
      guestBookingEnabled: false,
      maxGuestsPerBooking: 0,
    };
    const effective = resolveWorkspaceOperationsSettings({
      organizationValues: organization,
      locationValues: {
        businessHours: null,
        scheduleStartMinutes: 480,
        scheduleEndMinutes: null,
        scheduleSlotMinutes: 10,
        guestBookingEnabled: true,
        maxGuestsPerBooking: 2,
        guestRequiredFields: null,
        showPublicEmail: true,
        showPublicPhone: null,
        showPublicWebsite: null,
        showPublicAddress: null,
      },
      hasLocationScope: true,
    });

    assert.equal(effective.scheduleStartMinutes.value, 480);
    assert.equal(effective.scheduleStartMinutes.source, "LOCATION_OVERRIDE");
    assert.equal(effective.scheduleEndMinutes.value, 1260);
    assert.equal(effective.scheduleEndMinutes.source, "ORGANIZATION_DEFAULT");
    assert.equal(effective.scheduleSlotMinutes.value, 10);
    assert.equal(effective.showPublicEmail.value, true);
  });

  it("rejects overlapping hours and unsupported calendar intervals", () => {
    const values = {
      ...SYSTEM_OPERATIONS_DEFAULTS,
      businessHours: {
        ...SYSTEM_OPERATIONS_DEFAULTS.businessHours,
        MONDAY: [
          { opensAtMinutes: 540, closesAtMinutes: 720 },
          { opensAtMinutes: 660, closesAtMinutes: 780 },
        ],
      },
    };
    assert.equal(requiredWorkspaceOperationsValuesSchema.safeParse(values).success, false);
    assert.equal(
      workspaceOperationsValuesSchema.safeParse({
        ...SYSTEM_OPERATIONS_DEFAULTS,
        scheduleSlotMinutes: 45,
      }).success,
      false,
    );
  });

  it("enforces business hours in the configured timezone", () => {
    const businessHours = {
      ...SYSTEM_OPERATIONS_DEFAULTS.businessHours,
      MONDAY: [{ opensAtMinutes: 540, closesAtMinutes: 1020 }],
    };
    assert.equal(
      bookingFitsBusinessHours({
        start: new Date("2026-07-20T08:00:00.000Z"),
        end: new Date("2026-07-20T09:00:00.000Z"),
        timezone: "Europe/London",
        businessHours,
      }),
      true,
    );
    assert.equal(
      bookingFitsBusinessHours({
        start: new Date("2026-07-20T16:30:00.000Z"),
        end: new Date("2026-07-20T17:30:00.000Z"),
        timezone: "Europe/London",
        businessHours,
      }),
      false,
    );
  });

  it("enforces disabled and bounded guest bookings", () => {
    const settings = resolvedOperationsValues(
      resolveWorkspaceOperationsSettings({
        organizationValues: null,
        locationValues: null,
        hasLocationScope: false,
      }),
    );
    assert.equal(guestBookingPolicyError({ guestCount: 0, settings }), null);
    assert.match(
      guestBookingPolicyError({
        guestCount: 1,
        settings: { ...settings, guestBookingEnabled: false },
      }) ?? "",
      /disabled/,
    );
    assert.match(
      guestBookingPolicyError({
        guestCount: 3,
        settings: { ...settings, maxGuestsPerBooking: 2 },
      }) ?? "",
      /at most 2/,
    );
  });
});
