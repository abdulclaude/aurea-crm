import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPublicationReadiness,
  parseChannelConfigForKind,
  requirePublishableKind,
} from "@/features/publications/lib/publication-policy";

describe("publication readiness", () => {
  it("allows forms now that publish-time contract validation is available", () => {
    const readiness = getPublicationReadiness("FORM");
    assert.equal(readiness.publishable, true);
    assert.equal(readiness.reason, null);
    assert.doesNotThrow(() => requirePublishableKind("FORM"));
  });

  it("allows implemented publication channels", () => {
    for (const kind of [
      "FUNNEL",
      "SCHEDULE",
      "PRICING",
      "GIFT_CARDS",
      "WIDGET",
    ] as const) {
      assert.equal(getPublicationReadiness(kind).publishable, true);
    }
  });

  it("rejects a channel config for a different target kind", () => {
    assert.throws(
      () =>
        parseChannelConfigForKind("SCHEDULE", {
          kind: "FUNNEL",
          allowCustomCode: false,
          analytics: "CONSENTED",
        }),
      /does not match/i,
    );
  });
});
