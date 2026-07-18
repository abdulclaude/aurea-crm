import assert from "node:assert/strict";
import test from "node:test";

import {
  addReportMoney,
  averageReportMoney,
  multiplyReportMoney,
  prorateReportMoney,
  signedReportMoney,
  subtractReportMoney,
} from "../report-money";

test("calculates report money without floating point arithmetic", () => {
  assert.equal(addReportMoney("0.10", "0.20", "GBP"), "0.30");
  assert.equal(subtractReportMoney("10.00", "3.45", "GBP"), "6.55");
  assert.equal(multiplyReportMoney("19.99", 3, "GBP"), "59.97");
  assert.equal(signedReportMoney("12.50", true, "GBP"), "-12.50");
});

test("rounds proration and averages at the currency minor unit", () => {
  assert.equal(
    prorateReportMoney({
      total: "10.00",
      numerator: 1,
      denominator: 3,
      currency: "GBP",
    }),
    "3.33",
  );
  assert.equal(averageReportMoney("10.00", 3, "GBP"), "3.33");
});
