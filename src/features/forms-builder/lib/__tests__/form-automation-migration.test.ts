import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const migration = readFileSync(
  path.join(process.cwd(), "drizzle/0077_form_automation_config.sql"),
  "utf8",
);

describe("form automation configuration migration", () => {
  it("adds editable form mappings and immutable submission snapshots", () => {
    assert.match(migration, /ALTER TABLE "Form"/);
    assert.match(migration, /"automationConfig" jsonb/);
    assert.match(migration, /"emailMarketingConsentFieldId":null/);
    assert.match(migration, /ALTER TABLE "FormSubmission"/);
    assert.doesNotMatch(migration, /UPDATE "FormSubmission"/);
  });
});
