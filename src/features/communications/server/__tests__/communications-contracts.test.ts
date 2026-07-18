import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canTransitionCommunicationChannel,
  communicationProfileUpdateSchema,
  twilioComplianceRegistrationSchema,
  twilioNumberPurchaseSchema,
} from "@/features/communications/contracts";

const baseProfile = {
  fallbackEmailEnabled: true,
  spendCurrency: "GBP",
  smsMonthlySpendLimit: "100.0000",
  voiceMonthlySpendLimit: "50.0000",
  voiceMaxCallDurationSeconds: 1800,
  numberReleaseGraceDays: 30,
  allowedSmsCountries: ["GB"],
  allowedVoiceCountries: ["GB"],
  voiceForwardingNumber: "+442071234567",
  voicemailEnabled: true,
  recordingEnabled: false,
  recordingRetentionDays: null,
  recordingLegalAcknowledged: false,
};

describe("communications contracts", () => {
  it("supports materially different organization policies", () => {
    assert.equal(communicationProfileUpdateSchema.safeParse(baseProfile).success, true);
    assert.equal(
      communicationProfileUpdateSchema.safeParse({
        ...baseProfile,
        fallbackEmailEnabled: false,
        spendCurrency: "USD",
        smsMonthlySpendLimit: null,
        voiceMonthlySpendLimit: null,
        voiceMaxCallDurationSeconds: null,
        numberReleaseGraceDays: null,
        allowedSmsCountries: [],
        allowedVoiceCountries: [],
        voiceForwardingNumber: null,
        voicemailEnabled: false,
      }).success,
      true,
    );
  });

  it("requires acknowledgement and retention when recording is enabled", () => {
    assert.equal(
      communicationProfileUpdateSchema.safeParse({
        ...baseProfile,
        recordingEnabled: true,
      }).success,
      false,
    );
    assert.equal(
      communicationProfileUpdateSchema.safeParse({
        ...baseProfile,
        recordingEnabled: true,
        recordingRetentionDays: 30,
        recordingLegalAcknowledged: true,
      }).success,
      true,
    );
  });

  it("permits recovery but not resurrection after release", () => {
    assert.equal(canTransitionCommunicationChannel("FAILED", "PROVISIONING"), true);
    assert.equal(canTransitionCommunicationChannel("RELEASED", "ACTIVE"), false);
  });

  it("requires explicit number-purchase confirmation", () => {
    assert.equal(
      twilioNumberPurchaseSchema.safeParse({
        quoteId: "quote_123",
        confirmPurchase: false,
        idempotencyKey: "purchase_123",
      }).success,
      false,
    );
  });

  it("validates country and provider compliance references", () => {
    assert.equal(
      twilioComplianceRegistrationSchema.safeParse({
        country: "gb",
        channel: "SMS",
        programType: "business",
        numberType: "local",
        addressSid: `AD${"a".repeat(32)}`,
        bundleSid: `BU${"b".repeat(32)}`,
        identitySid: null,
        messagingServiceSid: null,
        campaignSid: null,
      }).success,
      true,
    );
  });
});
