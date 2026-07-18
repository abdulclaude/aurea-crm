import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertExpressDestinationAccount,
  buildDestinationChargePaymentData,
} from "../destination-charge";

describe("assertExpressDestinationAccount", () => {
  it("accepts Express accounts and rejects legacy account types", () => {
    assert.doesNotThrow(() => assertExpressDestinationAccount("express"));
    assert.throws(() => assertExpressDestinationAccount("standard"));
    assert.throws(() => assertExpressDestinationAccount("custom"));
  });
});

describe("buildDestinationChargePaymentData", () => {
  it("always creates a destination charge", () => {
    const result = buildDestinationChargePaymentData({
      destinationAccountId: "acct_studio",
      metadata: { invoiceId: "invoice_1" },
    });

    assert.deepEqual(result, {
      metadata: { invoiceId: "invoice_1" },
      transfer_data: { destination: "acct_studio" },
    });
  });

  it("includes an integer application fee when configured", () => {
    const result = buildDestinationChargePaymentData({
      destinationAccountId: "acct_studio",
      metadata: { bookingId: "booking_1" },
      applicationFeeAmount: 125,
    });

    assert.equal(result.application_fee_amount, 125);
  });

  it("rejects fractional or negative application fees", () => {
    assert.throws(() =>
      buildDestinationChargePaymentData({
        destinationAccountId: "acct_studio",
        metadata: {},
        applicationFeeAmount: 1.5,
      }),
    );
    assert.throws(() =>
      buildDestinationChargePaymentData({
        destinationAccountId: "acct_studio",
        metadata: {},
        applicationFeeAmount: -1,
      }),
    );
  });
});
