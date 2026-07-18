import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { visitorPrivacyInputSchema } from "../visitor-privacy-contract";

describe("visitor privacy input", () => {
  it("requires exactly one bounded visitor identifier", () => {
    assert.equal(
      visitorPrivacyInputSchema.safeParse({ funnelId: "funnel_1" }).success,
      false,
    );
    assert.equal(
      visitorPrivacyInputSchema.safeParse({
        funnelId: "funnel_1",
        anonymousId: "profile_1",
        email: "person@example.com",
      }).success,
      false,
    );
    assert.equal(
      visitorPrivacyInputSchema.safeParse({
        funnelId: "funnel_1",
        anonymousId: "profile_1",
      }).success,
      true,
    );
    assert.equal(
      visitorPrivacyInputSchema.safeParse({
        funnelId: "funnel_1",
        email: "PERSON@example.com",
      }).success,
      true,
    );
  });
});
