import assert from "node:assert/strict";
import test from "node:test";

import { buildBookingOutcomeImpact } from "../booking-outcome-impact";

const POLICY = {
  chargeCard: true,
  creditsDeducted: 2,
  currency: "GBP",
  deductCredits: true,
  lateCancelFee: "8.00",
  name: "Standard",
  noShowFeeAmount: "12.00",
};

test("summarizes no-show impact for every selected booking", () => {
  assert.deepEqual(
    buildBookingOutcomeImpact({
      bookingCount: 3,
      outcome: "NO_SHOW",
      policy: POLICY,
    }),
    {
      automaticCollection: true,
      creditsDeducted: 6,
      feeAmount: "12.00",
      totalFeeAmount: "36.00",
    },
  );
});

test("does not claim a collection when no policy or fee applies", () => {
  assert.deepEqual(
    buildBookingOutcomeImpact({
      bookingCount: 1,
      outcome: "LATE_CANCEL",
      policy: { ...POLICY, lateCancelFee: "0.00" },
    }),
    {
      automaticCollection: false,
      creditsDeducted: 2,
      feeAmount: null,
      totalFeeAmount: null,
    },
  );
  assert.equal(
    buildBookingOutcomeImpact({
      bookingCount: 1,
      outcome: "NO_SHOW",
      policy: null,
    }).feeAmount,
    null,
  );
});
