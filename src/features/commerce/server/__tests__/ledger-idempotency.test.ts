import assert from "node:assert/strict";
import test from "node:test";

import { commerceLedgerIdempotencyKey } from "../../lib/ledger-key";

test("ledger keys are stable across provider account and object identity", () => {
  assert.equal(
    commerceLedgerIdempotencyKey({
      provider: "STRIPE",
      providerAccountId: "acct_123",
      kind: "PAYMENT",
      providerObjectId: "pi_123",
    }),
    "stripe:acct_123:payment:pi_123",
  );
});

test("internal bindings preserve the external-account key compatibility", () => {
  assert.equal(
    commerceLedgerIdempotencyKey({
      provider: "stripe",
      providerAccountId: "acct_123",
      kind: "REFUND",
      providerObjectId: "re_123",
    }),
    "stripe:acct_123:refund:re_123",
  );
});

test("platform events retain the compatibility namespace", () => {
  assert.equal(
    commerceLedgerIdempotencyKey({
      provider: "stripe",
      kind: "PAYOUT",
      providerObjectId: "po_123",
    }),
    "stripe:platform:payout:po_123",
  );
});
