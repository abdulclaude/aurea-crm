import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalDecimal,
  conservativeSmsSegmentUpperBound,
  projectVoiceStatus,
  shouldApplyVoiceStatus,
} from "@/features/communications/lib/policy";
import {
  formValues,
  twilioInboundSmsSchema,
  twilioRecordingStatusSchema,
  twilioVoiceStatusSchema,
} from "@/features/communications/lib/twilio-webhook-contracts";
import { isSmsDestinationAllowed } from "@/features/communications/lib/sms-destination-policy";
import { hasTrustworthySenderAuthentication } from "@/features/inbox/server/inbound-contracts";
import { matchesAmbiguousSmsCandidate } from "@/features/delivery/lib/ambiguous-sms-policy";

describe("communications pure policy", () => {
  it("uses a conservative UCS-2 SMS segment bound", () => {
    assert.equal(conservativeSmsSegmentUpperBound("a".repeat(70)), 1);
    assert.equal(conservativeSmsSegmentUpperBound("a".repeat(71)), 2);
    assert.equal(conservativeSmsSegmentUpperBound("a".repeat(135)), 3);
  });

  it("compares provider prices without floating point", () => {
    assert.equal(canonicalDecimal("00.1000"), "0.1");
    assert.equal(canonicalDecimal(0.1), "0.1");
    assert.equal(canonicalDecimal("12.3400"), "12.34");
  });

  it("parses signed Twilio form payloads into validated contracts", () => {
    const sid = "a".repeat(32);
    const values = formValues(
      `AccountSid=AC${sid}&MessageSid=SM${sid}&From=%2B447700900123&To=%2B442071234567&Body=STOP`,
    );
    assert.equal(twilioInboundSmsSchema.safeParse(values).success, true);
    assert.equal(values.Body, "STOP");
  });

  it("validates voice status and recording callbacks", () => {
    const sid = "a".repeat(32);
    assert.equal(
      twilioVoiceStatusSchema.safeParse({
        AccountSid: `AC${sid}`,
        CallSid: `CA${sid}`,
        CallStatus: "completed",
        CallDuration: "42",
      }).success,
      true,
    );
    assert.equal(
      twilioRecordingStatusSchema.safeParse({
        AccountSid: `AC${sid}`,
        CallSid: `CA${sid}`,
        RecordingSid: `RE${sid}`,
        RecordingStatus: "completed",
      }).success,
      true,
    );
  });

  it("keeps voice callbacks monotonic across competing terminal events", () => {
    assert.equal(projectVoiceStatus("in-progress"), "IN_PROGRESS");
    assert.equal(shouldApplyVoiceStatus("RINGING", "IN_PROGRESS"), true);
    assert.equal(shouldApplyVoiceStatus("COMPLETED", "RINGING"), false);
    assert.equal(shouldApplyVoiceStatus("COMPLETED", "FAILED"), false);
    assert.equal(shouldApplyVoiceStatus("COMPLETED", "COMPLETED"), true);
  });

  it("enforces destination countries from E.164 numbers", () => {
    assert.equal(isSmsDestinationAllowed("+442079460018", ["GB"]), true);
    assert.equal(isSmsDestinationAllowed("+14155552671", ["GB"]), false);
    assert.equal(isSmsDestinationAllowed("not-a-number", ["GB"]), false);
  });

  it("links inbound email senders only with trustworthy authentication", () => {
    assert.equal(
      hasTrustworthySenderAuthentication({
        "Authentication-Results": "mx.example; dmarc=pass header.from=example.com",
      }),
      true,
    );
    assert.equal(
      hasTrustworthySenderAuthentication({
        "Authentication-Results": "mx.example; spf=pass; dkim=pass",
      }),
      true,
    );
    assert.equal(
      hasTrustworthySenderAuthentication({
        "Authentication-Results": "mx.example; spf=pass; dkim=fail; dmarc=fail",
      }),
      false,
    );
  });

  it("correlates only an exact and timely ambiguous SMS candidate", () => {
    const requestedAt = new Date("2026-07-18T10:00:00.000Z");
    const candidate = {
      destination: "+442079460018",
      body: "Your appointment is confirmed.",
      requestedAt,
      providerDestination: "+442079460018",
      providerBody: "Your appointment is confirmed.",
      providerCreatedAt: new Date("2026-07-18T10:02:00.000Z"),
    };
    assert.equal(matchesAmbiguousSmsCandidate(candidate), true);
    assert.equal(
      matchesAmbiguousSmsCandidate({
        ...candidate,
        providerDestination: "+14155552671",
      }),
      false,
    );
    assert.equal(
      matchesAmbiguousSmsCandidate({
        ...candidate,
        providerCreatedAt: new Date("2026-07-18T10:11:00.000Z"),
      }),
      false,
    );
  });
});
