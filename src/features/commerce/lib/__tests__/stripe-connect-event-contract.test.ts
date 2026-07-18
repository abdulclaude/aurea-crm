import assert from "node:assert/strict";
import test from "node:test";

import {
  connectAccountStatus,
  connectPayoutLedgerStatus,
  stripeConnectPayoutSchema,
} from "../stripe-connect-event-contract";

test("requires both charge and payout capabilities for an active account", () => {
  assert.deepEqual(
    connectAccountStatus({
      chargesEnabled: true,
      payoutsEnabled: false,
      detailsSubmitted: true,
    }),
    {
      onboardingComplete: false,
      accountStatus: "pending_verification",
    },
  );
  assert.deepEqual(
    connectAccountStatus({
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    }),
    { onboardingComplete: true, accountStatus: "active" },
  );
});

test("maps provider payout states without treating pending as paid", () => {
  assert.equal(connectPayoutLedgerStatus("pending"), "PENDING");
  assert.equal(connectPayoutLedgerStatus("paid"), "SUCCEEDED");
  assert.equal(connectPayoutLedgerStatus("failed"), "FAILED");
  assert.equal(connectPayoutLedgerStatus("canceled"), "CANCELLED");
});

test("rejects fractional provider payout amounts", () => {
  assert.equal(
    stripeConnectPayoutSchema.safeParse({
      id: "po_123",
      object: "payout",
      amount: 10.5,
      currency: "gbp",
      status: "paid",
    }).success,
    false,
  );
});
