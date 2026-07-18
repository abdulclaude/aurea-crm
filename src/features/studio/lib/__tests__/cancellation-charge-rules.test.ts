import assert from "node:assert/strict";
import test from "node:test";

import {
  CANCELLATION_CHARGE_STATUSES,
  cancellationChargeCanCollect,
  cancellationChargeCanWaive,
  paymentIntentNeedsCustomerAction,
} from "../cancellation-charge-rules";

test("only unresolved fees can be queued for collection", () => {
  assert.deepEqual(
    CANCELLATION_CHARGE_STATUSES.filter(cancellationChargeCanCollect),
    ["PENDING", "REQUIRES_PAYMENT_METHOD", "FAILED"],
  );
});

test("processing and paid fees cannot be waived outside the refund flow", () => {
  assert.equal(cancellationChargeCanWaive("PROCESSING"), false);
  assert.equal(cancellationChargeCanWaive("SUCCEEDED"), false);
  assert.equal(cancellationChargeCanWaive("NO_PAYMENT_DUE"), true);
});

test("off-session action states request a new customer payment method", () => {
  assert.equal(paymentIntentNeedsCustomerAction("requires_action"), true);
  assert.equal(paymentIntentNeedsCustomerAction("requires_payment_method"), true);
  assert.equal(paymentIntentNeedsCustomerAction("succeeded"), false);
  assert.equal(paymentIntentNeedsCustomerAction("processing"), false);
});
