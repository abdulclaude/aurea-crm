import assert from "node:assert/strict";
import test from "node:test";

import {
  isNotificationEventEnabled,
  normalizeNotificationPreferences,
} from "@/features/notifications/lib/preferences";

test("notification preferences default unknown events to enabled", () => {
  assert.equal(isNotificationEventEnabled({}, "BOOKING_CREATED"), true);
});

test("notification preferences disable only explicitly disabled events", () => {
  const preferences = normalizeNotificationPreferences({
    BOOKING_CREATED: false,
    BOOKING_CANCELLED: true,
    invalid: "false",
  });

  assert.deepEqual(preferences, {
    BOOKING_CREATED: false,
    BOOKING_CANCELLED: true,
  });
  assert.equal(
    isNotificationEventEnabled(preferences, "BOOKING_CREATED"),
    false,
  );
  assert.equal(
    isNotificationEventEnabled(preferences, "BOOKING_CANCELLED"),
    true,
  );
});
