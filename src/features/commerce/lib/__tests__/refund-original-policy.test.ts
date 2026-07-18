import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  DISPUTE_ORIGINAL_PAYMENT_STATUSES,
  REFUND_ORIGINAL_PAYMENT_STATUSES,
} from "../refund-original-policy";

describe("canonical original payment policy", () => {
  test("refunds never select a failed payment-attempt ledger row", () => {
    const statuses: readonly string[] = REFUND_ORIGINAL_PAYMENT_STATUSES;
    assert.equal(statuses.includes("FAILED"), false);
    assert.equal(statuses.includes("SUCCEEDED"), true);
  });

  test("later dispute events can resolve the canonical payment row", () => {
    const statuses: readonly string[] = DISPUTE_ORIGINAL_PAYMENT_STATUSES;
    assert.equal(statuses.includes("DISPUTED"), true);
    assert.equal(statuses.includes("WON"), true);
    assert.equal(statuses.includes("FAILED"), false);
  });
});
