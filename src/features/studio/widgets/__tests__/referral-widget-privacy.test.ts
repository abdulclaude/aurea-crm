import assert from "node:assert/strict";
import test from "node:test";

import { toPublicReferralProgram } from "../referral-public-program";

test("referral snapshots whitelist program terms and drop referral identities", () => {
  const source = {
    id: "program-1",
    name: "Refer a friend",
    referrerRewardType: "CREDIT",
    referrerRewardValue: "10.00",
    refereeRewardType: "DISCOUNT",
    refereeRewardValue: "15.00",
    currency: "GBP",
    refereeOfferDays: 30,
    isActive: true,
    updatedAt: new Date("2026-07-15T09:00:00.000Z"),
    referralCode: "PRIVATE-CODE",
    refereeEmail: "private@example.test",
    refereePhone: "+441234567890",
    referrerClientId: "client-1",
  } as const;
  const program = toPublicReferralProgram(source);
  assert.deepEqual(Object.keys(program).sort(), [
    "currency",
    "id",
    "isActive",
    "name",
    "refereeOfferDays",
    "refereeRewardType",
    "refereeRewardValue",
    "referrerRewardType",
    "referrerRewardValue",
    "updatedAt",
  ]);
  assert.doesNotMatch(JSON.stringify(program), /PRIVATE-CODE|private@example|client-1/);
});
