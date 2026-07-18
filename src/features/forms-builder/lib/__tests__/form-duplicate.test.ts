import assert from "node:assert/strict";
import test from "node:test";

import { remapFormCrmResolutionConfig } from "@/features/forms-builder/lib/form-duplicate";

test("duplicate remaps every member field reference", () => {
  const remapped = remapFormCrmResolutionConfig(
    {
      enabled: true,
      matchBy: "EMAIL_OR_PHONE",
      createIfMissing: true,
      updateExisting: "FILL_EMPTY",
      emailFieldId: "email-old",
      phoneFieldId: "phone-old",
      fullNameFieldId: null,
      firstNameFieldId: "first-old",
      lastNameFieldId: "last-old",
    },
    new Map([
      ["email-old", "email-new"],
      ["phone-old", "phone-new"],
      ["first-old", "first-new"],
      ["last-old", "last-new"],
    ]),
  );

  assert.equal(remapped.emailFieldId, "email-new");
  assert.equal(remapped.phoneFieldId, "phone-new");
  assert.equal(remapped.firstNameFieldId, "first-new");
  assert.equal(remapped.lastNameFieldId, "last-new");
});

test("duplicate disables an invalid mapping instead of retaining stale ids", () => {
  const remapped = remapFormCrmResolutionConfig(
    {
      enabled: true,
      matchBy: "EMAIL",
      createIfMissing: true,
      updateExisting: "FILL_EMPTY",
      emailFieldId: "missing",
      phoneFieldId: null,
      fullNameFieldId: "also-missing",
      firstNameFieldId: null,
      lastNameFieldId: null,
    },
    new Map(),
  );

  assert.equal(remapped.enabled, false);
});
