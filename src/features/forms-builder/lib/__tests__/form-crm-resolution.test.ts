import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_FORM_CRM_RESOLUTION_CONFIG,
  formCrmResolutionConfigSchema,
  parseFormCrmResolutionConfig,
} from "@/features/forms-builder/lib/form-crm-resolution";

describe("form CRM member resolution configuration", () => {
  it("keeps legacy forms disabled by default", () => {
    assert.deepEqual(
      parseFormCrmResolutionConfig(undefined),
      DEFAULT_FORM_CRM_RESOLUTION_CONFIG,
    );
  });

  it("accepts a simple email and full-name mapping", () => {
    const parsed = formCrmResolutionConfigSchema.safeParse({
      enabled: true,
      emailFieldId: "email-field",
      fullNameFieldId: "name-field",
    });

    assert.equal(parsed.success, true);
  });

  it("requires an email field in email-only mode", () => {
    const parsed = formCrmResolutionConfigSchema.safeParse({
      enabled: true,
      phoneFieldId: "phone-field",
      fullNameFieldId: "name-field",
    });

    assert.equal(parsed.success, false);
    assert.match(parsed.error?.message ?? "", /email field/i);
  });

  it("requires a name mapping before creating members", () => {
    const parsed = formCrmResolutionConfigSchema.safeParse({
      enabled: true,
      emailFieldId: "email-field",
      createIfMissing: true,
    });

    assert.equal(parsed.success, false);
    assert.match(parsed.error?.message ?? "", /name field/i);
  });

  it("supports phone fallback without requiring an email field", () => {
    const parsed = formCrmResolutionConfigSchema.safeParse({
      enabled: true,
      matchBy: "EMAIL_OR_PHONE",
      phoneFieldId: "phone-field",
      fullNameFieldId: "name-field",
    });

    assert.equal(parsed.success, true);
  });
});
