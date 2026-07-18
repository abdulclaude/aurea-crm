import assert from "node:assert/strict";
import test from "node:test";

import { calculateInvoiceApplicationFeeMinor } from "../invoice-application-fee";

test("calculates percentage and fixed fees in exact minor units", () => {
  assert.equal(
    calculateInvoiceApplicationFeeMinor({
      amountMinor: 12_345,
      currencyExponent: 2,
      percent: "2.50",
      fixed: "0.30",
    }),
    339,
  );
});

test("returns no application fee when no fee is configured", () => {
  assert.equal(
    calculateInvoiceApplicationFeeMinor({
      amountMinor: 12_345,
      currencyExponent: 2,
      percent: null,
      fixed: null,
    }),
    undefined,
  );
});

test("rejects a fee that exceeds the invoice amount", () => {
  assert.throws(() =>
    calculateInvoiceApplicationFeeMinor({
      amountMinor: 100,
      currencyExponent: 2,
      percent: "100.00",
      fixed: "0.01",
    }),
  );
});
