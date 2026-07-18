import assert from "node:assert/strict";
import test from "node:test";

import { calculateApplicationFeeMinor } from "../application-fee";

test("calculates percentage and fixed destination-charge fees in minor units", () => {
  assert.equal(
    calculateApplicationFeeMinor({
      amountMinor: 12_345,
      currencyExponent: 2,
      percent: "2.50",
      fixed: "0.30",
    }),
    339,
  );
});

test("supports zero-decimal currencies without floating point math", () => {
  assert.equal(
    calculateApplicationFeeMinor({
      amountMinor: 10_000,
      currencyExponent: 0,
      percent: "1.25",
      fixed: "10",
    }),
    135,
  );
});

test("rejects fees that consume the whole payment", () => {
  assert.throws(() =>
    calculateApplicationFeeMinor({
      amountMinor: 100,
      currencyExponent: 2,
      percent: "100.00",
      fixed: null,
    }),
  );
});

test("rejects invalid percentages and fixed-fee precision", () => {
  assert.throws(() =>
    calculateApplicationFeeMinor({
      amountMinor: 1_000,
      currencyExponent: 2,
      percent: "100.01",
      fixed: null,
    }),
  );
  assert.throws(() =>
    calculateApplicationFeeMinor({
      amountMinor: 1_000,
      currencyExponent: 2,
      percent: null,
      fixed: "0.001",
    }),
  );
});
