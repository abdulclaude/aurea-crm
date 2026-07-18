import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AD_CONVERSION_CLAIM_LEASE_MS,
  isAdConversionDeliveryClaimable,
} from "../delivery-claim-policy";

describe("ad conversion delivery claim policy", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");

  it("does not duplicate a succeeded or actively processing delivery", () => {
    assert.equal(
      isAdConversionDeliveryClaimable({
        status: "SUCCEEDED",
        lastAttemptAt: new Date(now.getTime() - AD_CONVERSION_CLAIM_LEASE_MS),
        now,
      }),
      false,
    );
    assert.equal(
      isAdConversionDeliveryClaimable({
        status: "PROCESSING",
        lastAttemptAt: new Date(now.getTime() - 1_000),
        now,
      }),
      false,
    );
  });

  it("reclaims failed and stale processing deliveries", () => {
    assert.equal(
      isAdConversionDeliveryClaimable({
        status: "FAILED",
        lastAttemptAt: now,
        now,
      }),
      true,
    );
    assert.equal(
      isAdConversionDeliveryClaimable({
        status: "PROCESSING",
        lastAttemptAt: new Date(now.getTime() - AD_CONVERSION_CLAIM_LEASE_MS),
        now,
      }),
      true,
    );
  });
});
