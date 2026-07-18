import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clientInactivityTriggerConfigSchema,
  formSubmittedTriggerConfigSchema,
  formSubmissionTriggerMatches,
  inactivityOccurrenceKey,
  pricingOptionTriggerMatches,
  triggerConfigMatchesOptionalId,
} from "../studio-trigger-config";

describe("studio workflow trigger configuration", () => {
  it("requires a concrete form for newsletter subscription triggers", () => {
    assert.equal(
      formSubmittedTriggerConfigSchema.safeParse({
        intent: "NEWSLETTER",
        formId: null,
        variableName: "subscription",
      }).success,
      false,
    );
    assert.equal(
      formSubmittedTriggerConfigSchema.safeParse({
        intent: "NEWSLETTER",
        formId: "newsletter-form",
        variableName: "subscription",
      }).success,
      true,
    );
  });

  it("supports a generic all-resources configuration and a specific resource", () => {
    assert.equal(triggerConfigMatchesOptionalId(undefined, "form-a"), true);
    assert.equal(triggerConfigMatchesOptionalId("form-a", "form-a"), true);
    assert.equal(triggerConfigMatchesOptionalId("form-b", "form-a"), false);
    assert.equal(pricingOptionTriggerMatches([], "option-a"), true);
    assert.equal(
      pricingOptionTriggerMatches(["option-a", "option-b"], "option-b"),
      true,
    );
  });

  it("requires explicit channel consent before matching a form trigger", () => {
    const event = {
      formId: "lead-form",
      emailMarketingConsent: true,
      smsMarketingConsent: false,
    };

    assert.equal(
      formSubmissionTriggerMatches(
        {
          formId: "lead-form",
          requireEmailMarketingConsent: true,
        },
        event,
      ),
      true,
    );
    assert.equal(
      formSubmissionTriggerMatches(
        {
          formId: "lead-form",
          requireSmsMarketingConsent: true,
        },
        event,
      ),
      false,
    );
    assert.equal(
      formSubmissionTriggerMatches(
        {
          formId: "different-form",
          requireEmailMarketingConsent: false,
          requireSmsMarketingConsent: false,
        },
        event,
      ),
      false,
    );
  });

  it("validates inactivity policy and creates a stable occurrence key", () => {
    const config = clientInactivityTriggerConfigSchema.parse({
      days: 45,
      activityDimensions: ["CRM_INTERACTION", "SUCCESSFUL_PAYMENT"],
    });
    const input = {
      nodeId: "node-a",
      clientId: "client-a",
      days: config.days,
      activityDimensions: config.activityDimensions,
      lastActivityAt: new Date("2026-06-01T12:00:00.000Z"),
    };

    assert.equal(
      inactivityOccurrenceKey(input),
      inactivityOccurrenceKey(input),
    );
    assert.throws(() =>
      clientInactivityTriggerConfigSchema.parse({
        days: 0,
        activityDimensions: [],
      }),
    );
  });
});
