import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRefundAmountAvailable,
  calculateRefundAvailability,
} from "../refund-policy";

test("combines provider refunds and unrecorded local reservations", () => {
  const availability = calculateRefundAvailability({
    originalAmountMinor: 10_000,
    ledgerReservations: [
      { providerRefundId: "re_recorded", amountMinor: 2_000 },
    ],
    operationReservations: [
      { providerRefundId: "re_recorded", amountMinor: 2_000 },
      { providerRefundId: null, amountMinor: 1_500 },
    ],
  });

  assert.deepEqual(availability, {
    reservedMinor: 3_500,
    remainingMinor: 6_500,
  });
});

test("does not count a provider refund twice after its webhook arrives", () => {
  const availability = calculateRefundAvailability({
    originalAmountMinor: 5_000,
    ledgerReservations: [
      { providerRefundId: "re_same", amountMinor: 1_250 },
    ],
    operationReservations: [
      { providerRefundId: "re_same", amountMinor: 1_250 },
    ],
  });

  assert.equal(availability.remainingMinor, 3_750);
});

test("rejects a refund larger than the unreserved balance", () => {
  const availability = calculateRefundAvailability({
    originalAmountMinor: 2_000,
    ledgerReservations: [],
    operationReservations: [{ providerRefundId: null, amountMinor: 750 }],
  });

  assert.throws(
    () => assertRefundAmountAvailable(1_251, availability),
    /remaining payment balance/,
  );
  assert.doesNotThrow(() => assertRefundAmountAvailable(1_250, availability));
});
