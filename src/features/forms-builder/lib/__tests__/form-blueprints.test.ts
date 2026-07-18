import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FormFieldType } from "@/db/enums";
import { FORM_BLUEPRINTS } from "@/features/forms-builder/lib/form-blueprints";

describe("form blueprints", () => {
  it("builds a lead form that fits email and SMS nurture workflows", () => {
    const blueprint = FORM_BLUEPRINTS.LEAD_NURTURE;
    const fields = blueprint.steps.flatMap((step) => step.fields);
    const email = fields.find((field) => field.key === "email");
    const phone = fields.find((field) => field.key === "phone");
    const emailConsent = fields.find(
      (field) => field.key === "emailMarketingConsent",
    );
    const smsConsent = fields.find(
      (field) => field.key === "smsMarketingConsent",
    );

    assert.equal(email?.type, FormFieldType.EMAIL);
    assert.equal(email?.required, true);
    assert.equal(phone?.type, FormFieldType.PHONE);
    assert.equal(phone?.required, true);
    assert.equal(emailConsent?.type, FormFieldType.CHECKBOX);
    assert.equal(emailConsent?.required, false);
    assert.equal(smsConsent?.type, FormFieldType.CHECKBOX);
    assert.equal(smsConsent?.required, false);
    assert.notEqual(emailConsent?.key, smsConsent?.key);
  });

  it("keeps feedback follow-up separate from marketing consent", () => {
    const blueprint = FORM_BLUEPRINTS.CLASS_FEEDBACK;
    assert.equal(blueprint.identity, null);
    assert.equal(
      blueprint.automation.emailMarketingConsentFieldKey,
      null,
    );
    assert.equal(blueprint.automation.smsMarketingConsentFieldKey, null);
    assert.equal(
      blueprint.automation.followUpConsentFieldKey,
      "followUpConsent",
    );
  });
});
