import assert from "node:assert/strict";
import test from "node:test";

import { expectedStripeEventLivemode } from "../stripe/stripe-event-mode";

test("derives webhook mode from standard and restricted Stripe keys", () => {
  assert.equal(expectedStripeEventLivemode("sk_test_example"), false);
  assert.equal(expectedStripeEventLivemode("rk_test_example"), false);
  assert.equal(expectedStripeEventLivemode("sk_live_example"), true);
  assert.equal(expectedStripeEventLivemode("rk_live_example"), true);
});

test("does not infer a mode from missing or unsupported credentials", () => {
  assert.equal(expectedStripeEventLivemode(undefined), null);
  assert.equal(expectedStripeEventLivemode(""), null);
  assert.equal(expectedStripeEventLivemode("whsec_example"), null);
});
