import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveDispatchOutcome } from "@/features/delivery/lib/dispatch-outcome";

const completedAt = new Date("2026-07-13T12:00:00.000Z");

describe("delivery dispatch outcomes", () => {
  it("records provider acceptance without claiming external delivery", () => {
    const result = resolveDispatchOutcome({
      result: {
        kind: "accepted",
        providerMessageId: "email_123",
        acceptedAt: completedAt,
      },
      provider: "RESEND",
      attemptNumber: 1,
      maxAttempts: 5,
      completedAt,
    });

    assert.equal(result.status, "ACCEPTED");
    assert.equal(result.providerMessageId, "email_123");
    assert.equal(result.deliveredAt, null);
  });

  it("marks internal app deliveries delivered on acceptance", () => {
    const result = resolveDispatchOutcome({
      result: {
        kind: "accepted",
        providerMessageId: "internal_123",
        acceptedAt: completedAt,
      },
      provider: "INTERNAL",
      attemptNumber: 1,
      maxAttempts: 5,
      completedAt,
    });

    assert.equal(result.status, "DELIVERED");
    assert.equal(result.deliveredAt?.toISOString(), completedAt.toISOString());
  });

  it("schedules retryable failures until the final attempt", () => {
    const retry = resolveDispatchOutcome({
      result: {
        kind: "retryable",
        code: "RATE_LIMITED",
        message: "Try later",
      },
      provider: "TWILIO",
      attemptNumber: 1,
      maxAttempts: 2,
      completedAt,
    });
    const exhausted = resolveDispatchOutcome({
      result: {
        kind: "retryable",
        code: "RATE_LIMITED",
        message: "Try later",
      },
      provider: "TWILIO",
      attemptNumber: 2,
      maxAttempts: 2,
      completedAt,
    });

    assert.equal(retry.status, "QUEUED");
    assert.ok(retry.nextAttemptAt);
    assert.equal(exhausted.status, "DEAD_LETTER");
    assert.equal(exhausted.nextAttemptAt, null);
  });

  it("separates terminal and ambiguous provider failures", () => {
    const terminal = resolveDispatchOutcome({
      result: {
        kind: "terminal",
        code: "INVALID_RECIPIENT",
        message: "Recipient rejected",
      },
      provider: "RESEND",
      attemptNumber: 1,
      maxAttempts: 5,
      completedAt,
    });
    const ambiguous = resolveDispatchOutcome({
      result: {
        kind: "ambiguous",
        code: "NETWORK_INTERRUPTED",
        message: "Provider response was not observed",
      },
      provider: "RESEND",
      attemptNumber: 1,
      maxAttempts: 5,
      completedAt,
    });

    assert.equal(terminal.status, "DEAD_LETTER");
    assert.equal(terminal.failureClass, "TERMINAL");
    assert.equal(ambiguous.status, "UNKNOWN");
    assert.equal(ambiguous.failureClass, "AMBIGUOUS");
  });
});
