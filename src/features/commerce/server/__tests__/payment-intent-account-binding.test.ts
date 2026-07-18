import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { assertPaymentIntentDestination } from "../stripe/payment-intent-account-binding";
import { paymentIntentSchema } from "../stripe/stripe-object-contracts";

function paymentIntent(destination?: string) {
  return paymentIntentSchema.parse({
    id: "pi_test",
    object: "payment_intent",
    amount: 1_000,
    currency: "gbp",
    status: "succeeded",
    metadata: { commerceOperationId: "operation_test" },
    transfer_data: destination ? { destination } : null,
  });
}

describe("payment intent destination binding", () => {
  test("accepts the persisted connected account destination", () => {
    assert.doesNotThrow(() =>
      assertPaymentIntentDestination({
        paymentIntent: paymentIntent("acct_expected"),
        providerAccountId: "acct_expected",
      }),
    );
  });

  test("rejects missing or mismatched destinations", () => {
    assert.throws(
      () =>
        assertPaymentIntentDestination({
          paymentIntent: paymentIntent("acct_other"),
          providerAccountId: "acct_expected",
        }),
      /destination does not match/,
    );
    assert.throws(
      () =>
        assertPaymentIntentDestination({
          paymentIntent: paymentIntent(),
          providerAccountId: "acct_expected",
        }),
      /destination does not match/,
    );
  });
});
