import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { cancellationPaymentIntentCanBeCancelled } from "../cancellation-payment-attempt-rules";

describe("cancellation payment attempt rules", () => {
  test("allows only Stripe terminal-failure preparation states", () => {
    assert.equal(
      cancellationPaymentIntentCanBeCancelled("requires_payment_method"),
      true,
    );
    assert.equal(
      cancellationPaymentIntentCanBeCancelled("requires_action"),
      true,
    );
    assert.equal(cancellationPaymentIntentCanBeCancelled("succeeded"), false);
    assert.equal(cancellationPaymentIntentCanBeCancelled("processing"), false);
  });
});
