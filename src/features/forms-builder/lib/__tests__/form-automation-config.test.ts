import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_FORM_AUTOMATION_CONFIG,
  formAutomationConfigSchema,
  parseFormAutomationConfig,
  readFormAutomationConsent,
  remapFormAutomationConfig,
} from "@/features/forms-builder/lib/form-automation-config";

describe("form automation configuration", () => {
  it("keeps existing forms unbound by default", () => {
    assert.deepEqual(
      parseFormAutomationConfig(undefined),
      DEFAULT_FORM_AUTOMATION_CONFIG,
    );
  });

  it("reads only explicit true decisions from the configured field IDs", () => {
    assert.deepEqual(
      readFormAutomationConsent({
        config: {
          version: 1,
          emailMarketingConsentFieldId: "email-consent",
          smsMarketingConsentFieldId: "sms-consent",
          followUpConsentFieldId: "follow-up",
        },
        values: {
          "email-consent": true,
          "sms-consent": false,
          "follow-up": "true",
        },
      }),
      { emailMarketing: true, smsMarketing: false, followUp: false },
    );
  });

  it("accepts distinct consent and follow-up checkbox bindings", () => {
    assert.equal(
      formAutomationConfigSchema.safeParse({
        version: 1,
        emailMarketingConsentFieldId: "email-consent",
        smsMarketingConsentFieldId: "sms-consent",
        followUpConsentFieldId: "follow-up",
      }).success,
      true,
    );
  });

  it("remaps stable field IDs when a form is duplicated", () => {
    assert.deepEqual(
      remapFormAutomationConfig(
        {
          version: 1,
          emailMarketingConsentFieldId: "old-email",
          smsMarketingConsentFieldId: "old-sms",
          followUpConsentFieldId: null,
        },
        new Map([
          ["old-email", "new-email"],
          ["old-sms", "new-sms"],
        ]),
      ),
      {
        version: 1,
        emailMarketingConsentFieldId: "new-email",
        smsMarketingConsentFieldId: "new-sms",
        followUpConsentFieldId: null,
      },
    );
  });
});
