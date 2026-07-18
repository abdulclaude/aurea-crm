import assert from "node:assert/strict";
import { describe, test } from "node:test";
import Stripe from "stripe";

import { classifyPermanentCancellationStripeError } from "../cancellation-stripe-error";

describe("cancellation Stripe error classification", () => {
  test("classifies permanent request and account errors", () => {
    const invalid = new Stripe.errors.StripeInvalidRequestError({
      message: "invalid amount",
      type: "invalid_request_error",
    });
    const permission = new Stripe.errors.StripePermissionError({
      message: "forbidden",
      type: "invalid_request_error",
    });

    assert.equal(
      classifyPermanentCancellationStripeError(invalid)?.code,
      "STRIPE_REQUEST_INVALID",
    );
    assert.equal(
      classifyPermanentCancellationStripeError(permission)?.code,
      "STRIPE_PERMISSION_DENIED",
    );
  });

  test("leaves transient provider errors retryable", () => {
    const transient = new Stripe.errors.StripeAPIError({
      message: "temporarily unavailable",
      type: "api_error",
    });
    assert.equal(classifyPermanentCancellationStripeError(transient), null);
  });
});
