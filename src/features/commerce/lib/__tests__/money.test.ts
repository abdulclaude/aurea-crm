import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMinorUnits,
  decimalToMinorUnits,
  formatDecimalMoney,
  minorUnitsToDecimal,
  normalizeCurrency,
} from "../money";

test("converts decimal strings without floating point arithmetic", () => {
  assert.equal(decimalToMinorUnits("123.45", 2), 12345);
  assert.equal(decimalToMinorUnits("0.5", 2), 50);
  assert.equal(decimalToMinorUnits("-10", 2), -1000);
  assert.equal(decimalToMinorUnits("25", 0), 25);
});

test("converts minor units back to canonical decimal strings", () => {
  assert.equal(minorUnitsToDecimal(12345, 2), "123.45");
  assert.equal(minorUnitsToDecimal(-50, 2), "-0.50");
  assert.equal(minorUnitsToDecimal(25, 0), "25");
});

test("rejects lossy or unsafe values", () => {
  assert.throws(() => decimalToMinorUnits("1.001", 2));
  assert.throws(() => assertMinorUnits(-1));
  assert.throws(() => assertMinorUnits(1.2));
});

test("normalizes ISO currency codes", () => {
  assert.equal(normalizeCurrency(" gbp "), "GBP");
  assert.throws(() => normalizeCurrency("pounds"));
});

test("formats decimal database money through exact minor units", () => {
  assert.equal(formatDecimalMoney("12.50", "GBP"), "£12.50");
});
