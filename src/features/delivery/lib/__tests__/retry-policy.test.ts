import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyHttpFailure,
  getNextRetryAt,
  getRetryDelayMs,
} from "@/features/delivery/lib/retry-policy";

describe("delivery retry policy", () => {
  it("classifies provider throttling and server errors as retryable", () => {
    assert.equal(classifyHttpFailure(429), "RETRYABLE");
    assert.equal(classifyHttpFailure(503), "RETRYABLE");
    assert.equal(classifyHttpFailure(400), "TERMINAL");
  });

  it("uses a bounded retry schedule", () => {
    assert.equal(getRetryDelayMs(1), 60_000);
    assert.equal(getRetryDelayMs(5), 12 * 60 * 60_000);
    assert.equal(getRetryDelayMs(6), null);
  });

  it("honours a provider retry-after time when it is later", () => {
    const completedAt = new Date("2026-07-13T12:00:00.000Z");
    const retryAfter = new Date("2026-07-13T12:10:00.000Z");

    assert.equal(
      getNextRetryAt({
        attemptNumber: 1,
        completedAt,
        retryAfter,
      })?.toISOString(),
      retryAfter.toISOString(),
    );
  });
});
