import assert from "node:assert/strict";
import test from "node:test";

import { stripeRetryDelayMs } from "../stripe-retry-policy";

test("Stripe retry delays grow exponentially and remain capped", () => {
  const delays = Array.from({ length: 14 }, (_, index) =>
    stripeRetryDelayMs("receipt-a", index + 1),
  );

  assert.ok(delays[1] > delays[0]);
  assert.ok(delays[5] > delays[4]);
  assert.equal(delays[13], delays[12]);
  assert.ok(delays[13] <= 6 * 60 * 60 * 1_000 * 1.2);
});

test("Stripe retry jitter is deterministic per receipt", () => {
  assert.equal(
    stripeRetryDelayMs("receipt-z", 3),
    stripeRetryDelayMs("receipt-z", 3),
  );
  assert.notEqual(
    stripeRetryDelayMs("receipt-a", 3),
    stripeRetryDelayMs("receipt-b", 3),
  );
});

test("Stripe retry attempts must be positive integers", () => {
  assert.throws(() => stripeRetryDelayMs("receipt", 0));
  assert.throws(() => stripeRetryDelayMs("receipt", 1.5));
});
