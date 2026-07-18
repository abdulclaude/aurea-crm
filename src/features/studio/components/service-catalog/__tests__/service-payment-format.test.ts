import assert from "node:assert/strict";
import test from "node:test";

import {
  formatServiceMoney,
  formatServicePayment,
} from "@/features/studio/components/service-catalog/service-payment-format";

test("formats currencies with their narrow symbol and only meaningful decimals", () => {
  assert.equal(formatServiceMoney("37.00", "USD"), "$37");
  assert.equal(formatServiceMoney("40.00", "GBP"), "£40");
  assert.equal(formatServiceMoney("37.50", "USD"), "$37.5");
});

test("formats fixed and sliding-scale service payments", () => {
  assert.equal(
    formatServicePayment({
      paymentType: "PAID",
      price: "37.00",
      slidingScaleMinPrice: null,
      slidingScaleMaxPrice: null,
      currency: "USD",
    }),
    "$37",
  );
  assert.equal(
    formatServicePayment({
      paymentType: "SLIDING_SCALE",
      price: null,
      slidingScaleMinPrice: "20.00",
      slidingScaleMaxPrice: "40.00",
      currency: "GBP",
    }),
    "£20 - £40",
  );
});
