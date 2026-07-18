import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  calComWebhookEventKey,
  calComWebhookEventSchema,
  verifyCalComWebhookSignature,
} from "../calcom-webhook-contract";

test("verifies a Cal.com HMAC over the exact raw body", () => {
  const rawBody = JSON.stringify({
    triggerEvent: "BOOKING_CREATED",
    payload: { uid: "booking-1" },
  });
  const secret = "tenant-scoped-secret";
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");

  assert.equal(
    verifyCalComWebhookSignature({ rawBody, secret, signature }),
    true,
  );
  assert.equal(
    verifyCalComWebhookSignature({
      rawBody: `${rawBody} `,
      secret,
      signature,
    }),
    false,
  );
});

test("rejects missing and malformed signatures", () => {
  assert.equal(
    verifyCalComWebhookSignature({
      rawBody: "{}",
      secret: "secret",
      signature: null,
    }),
    false,
  );
  assert.equal(
    verifyCalComWebhookSignature({
      rawBody: "{}",
      secret: "secret",
      signature: "not-a-signature",
    }),
    false,
  );
});

test("accepts the official booking payload field names", () => {
  const event = calComWebhookEventSchema.parse({
    triggerEvent: "BOOKING_RESCHEDULED",
    createdAt: "2026-07-13T12:00:00.000Z",
    payload: {
      bookingId: 42,
      uid: "new-uid",
      eventTypeId: 7,
      rescheduleUid: "old-uid",
      startTime: "2026-07-14T12:00:00.000Z",
      endTime: "2026-07-14T12:30:00.000Z",
    },
  });

  assert.equal(event.payload.bookingId, 42);
  assert.equal(event.payload.eventTypeId, 7);
  assert.equal(event.payload.rescheduleUid, "old-uid");
});

test("event keys are stable for retries and change with the body", () => {
  assert.equal(calComWebhookEventKey("body"), calComWebhookEventKey("body"));
  assert.notEqual(calComWebhookEventKey("body"), calComWebhookEventKey("body "));
});
