import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getResendEventBehavior,
  resendWebhookEventSchema,
} from "@/features/delivery/lib/resend-event-contract";

describe("Resend provider event contract", () => {
  it("parses the signed payload fields needed for idempotent receipts", () => {
    const parsed = resendWebhookEventSchema.parse({
      type: "email.bounced",
      created_at: "2026-07-13T12:00:00.000Z",
      data: {
        email_id: "email_123",
        to: ["member@example.com"],
        subject: "Not persisted in safe metadata",
        bounce: { type: "Permanent", subType: "NoEmail" },
      },
    });

    assert.equal(parsed.data.email_id, "email_123");
    assert.equal(parsed.data.bounce?.type, "Permanent");
    assert.equal(parsed.created_at.toISOString(), "2026-07-13T12:00:00.000Z");
  });

  it("distinguishes accepted, failed, and provider-suppressed events", () => {
    assert.deepEqual(getResendEventBehavior("email.delivered"), {
      kind: "DELIVERED",
      provesAcceptance: true,
      sourceOutcome: null,
    });
    assert.equal(
      getResendEventBehavior("email.failed").sourceOutcome,
      "FAILED",
    );
    assert.equal(
      getResendEventBehavior("email.suppressed").sourceOutcome,
      "SUPPRESSED",
    );
  });

  it("rejects unsupported event types before persistence", () => {
    assert.equal(
      resendWebhookEventSchema.safeParse({
        type: "domain.created",
        created_at: "2026-07-13T12:00:00.000Z",
        data: { email_id: "email_123" },
      }).success,
      false,
    );
  });
});
