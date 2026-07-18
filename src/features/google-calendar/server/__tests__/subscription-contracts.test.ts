import assert from "node:assert/strict";
import test from "node:test";

import {
  hashWebhookSecret,
  isNewGoogleMessageNumber,
  normalizeCalendarEvents,
  resolveCalendarEventType,
  webhookSecretMatches,
} from "../subscription-contracts";

test("calendar webhook secrets are compared against hashes", () => {
  const hash = hashWebhookSecret("tenant-channel-secret");
  assert.equal(webhookSecretMatches("tenant-channel-secret", hash), true);
  assert.equal(webhookSecretMatches("wrong-secret", hash), false);
  assert.equal(webhookSecretMatches("tenant-channel-secret", "invalid"), false);
});

test("calendar message numbers reject duplicates and malformed values", () => {
  assert.equal(isNewGoogleMessageNumber("11", "10"), true);
  assert.equal(isNewGoogleMessageNumber("10", "10"), false);
  assert.equal(isNewGoogleMessageNumber("9", "10"), false);
  assert.equal(isNewGoogleMessageNumber("not-a-number", "10"), false);
});

test("calendar event policy normalizes configured event types", () => {
  assert.deepEqual(normalizeCalendarEvents(["CREATED", "deleted", "other"]), [
    "created",
    "deleted",
  ]);
  assert.equal(
    resolveCalendarEventType({
      id: "event-1",
      created: "2026-01-01T10:00:00.000Z",
      updated: "2026-01-01T11:00:00.000Z",
    }),
    "updated",
  );
  assert.equal(
    resolveCalendarEventType({ id: "event-2", status: "cancelled" }),
    "deleted",
  );
});
