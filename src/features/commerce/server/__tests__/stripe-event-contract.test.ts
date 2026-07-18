import assert from "node:assert/strict";
import test from "node:test";

import {
  getStripeObjectIdentity,
  parseStoredStripeEvent,
  redactedErrorMessage,
  stripePayloadHash,
} from "../stripe/stripe-event-contract";

const storedEvent = JSON.stringify({
  id: "evt_123",
  type: "checkout.session.completed",
  account: "acct_123",
  api_version: "2025-11-17.clover",
  created: 1_720_000_000,
  livemode: false,
  data: { object: { id: "cs_123", object: "checkout.session" } },
});

test("stored Stripe events are parsed into the bounded envelope", () => {
  assert.deepEqual(parseStoredStripeEvent(storedEvent), {
    id: "evt_123",
    type: "checkout.session.completed",
    accountId: "acct_123",
    apiVersion: "2025-11-17.clover",
    created: 1_720_000_000,
    livemode: false,
    dataObject: { id: "cs_123", object: "checkout.session" },
  });
});

test("Stripe payload hashes and object identities are stable", () => {
  assert.equal(stripePayloadHash(storedEvent), stripePayloadHash(storedEvent));
  assert.deepEqual(
    getStripeObjectIdentity({ id: "pi_123", object: "payment_intent" }),
    { objectId: "pi_123", objectType: "payment_intent" },
  );
});

test("stored Stripe contracts reject malformed envelopes", () => {
  assert.throws(() => parseStoredStripeEvent('{"id":"evt_missing"}'));
});

test("processing errors are normalized and bounded before persistence", () => {
  const message = redactedErrorMessage(new Error(`line one\n${"x".repeat(700)}`));
  assert.equal(message.includes("\n"), false);
  assert.equal(message.length, 500);
});
