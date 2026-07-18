import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { TRPCError } from "@trpc/server";

import { normalizeCancellationCurrency } from "../cancellation-policy-input";

describe("cancellation policy currency storage", () => {
  test("accepts zero and two-decimal currencies", () => {
    assert.equal(normalizeCancellationCurrency("gbp"), "GBP");
    assert.equal(normalizeCancellationCurrency("JPY"), "JPY");
  });

  test("rejects currencies whose precision would be rounded by storage", () => {
    assert.throws(() => normalizeCancellationCurrency("KWD"), TRPCError);
  });
});
