import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalPublicationJson,
  createPublicationContentHash,
} from "@/features/publications/lib/content-hash";

describe("publication content hashing", () => {
  it("is stable across object key order", () => {
    const first = {
      theme: { accent: "#0f766e", font: "Inter" },
      pages: [{ slug: "welcome", order: 1 }],
    };
    const second = {
      pages: [{ order: 1, slug: "welcome" }],
      theme: { font: "Inter", accent: "#0f766e" },
    };
    assert.equal(
      createPublicationContentHash(first),
      createPublicationContentHash(second),
    );
  });

  it("changes when nested publication content changes", () => {
    assert.notEqual(
      createPublicationContentHash({ config: { maxDaysAhead: 14 } }),
      createPublicationContentHash({ config: { maxDaysAhead: 30 } }),
    );
  });

  it("canonicalizes dates and rejects non-finite values", () => {
    assert.equal(
      canonicalPublicationJson({ at: new Date("2026-07-13T12:00:00.000Z") }),
      '{"at":"2026-07-13T12:00:00.000Z"}',
    );
    assert.throws(() => canonicalPublicationJson({ value: Number.NaN }));
  });
});
