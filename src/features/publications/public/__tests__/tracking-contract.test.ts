import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { publicationTrackingBatchSchema } from "../tracking-contract";

const validEvent = {
  eventId: "25fce6e5-1135-4a29-bf8d-b1fdcb101de8",
  eventName: "page_view",
  occurredAt: 1_000,
  page: { path: "/p/org/target" },
  properties: {},
  sessionId: "f6d578aa-b94c-4f01-92dc-a6f8f8791288",
};

describe("publication tracking contract", () => {
  it("accepts a small first-party event without personal identifiers", () => {
    const result = publicationTrackingBatchSchema.safeParse({
      token: "signed-token",
      events: [validEvent],
    });
    assert.equal(result.success, true);
  });

  it("rejects arbitrary properties and nested payloads", () => {
    assert.equal(
      publicationTrackingBatchSchema.safeParse({
        token: "signed-token",
        events: [{ ...validEvent, properties: { revenue: 100 } }],
      }).success,
      false,
    );
    assert.equal(
      publicationTrackingBatchSchema.safeParse({
        token: "signed-token",
        events: [{ ...validEvent, properties: { profile: { email: "x@y.z" } } }],
      }).success,
      false,
    );
  });

  it("caps batches and rejects conversion event names", () => {
    assert.equal(
      publicationTrackingBatchSchema.safeParse({
        token: "signed-token",
        events: Array.from({ length: 6 }, () => validEvent),
      }).success,
      false,
    );
    assert.equal(
      publicationTrackingBatchSchema.safeParse({
        token: "signed-token",
        events: [{ ...validEvent, eventName: "checkout_completed" }],
      }).success,
      false,
    );
    assert.equal(
      publicationTrackingBatchSchema.safeParse({
        token: "signed-token",
        events: [{ ...validEvent, eventName: "form_submitted" }],
      }).success,
      false,
    );
  });
});
