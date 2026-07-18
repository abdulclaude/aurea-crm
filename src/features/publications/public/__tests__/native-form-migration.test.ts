import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const migration = readFileSync(
  path.join(process.cwd(), "drizzle/0036_native_public_form_submissions.sql"),
  "utf8",
);

describe("native public form migration", () => {
  it("adds immutable receipt provenance and strict tenant scope guards", () => {
    assert.match(migration, /"PublicFormSubmissionReceipt"/);
    assert.match(migration, /"publicationVersionId"/);
    assert.match(migration, /"consentSnapshot"/);
    assert.match(migration, /PublicFormSubmissionReceipt_scope_guard/);
    assert.match(migration, /FormSubmission_native_scope_guard/);
    assert.match(migration, /IS DISTINCT FROM NEW\."locationId"/);
  });

  it("adds atomic subject and global publication quota counters", () => {
    assert.match(migration, /"PublicationRequestQuota"/);
    assert.match(migration, /"dimension" IN \('SUBJECT', 'GLOBAL'\)/);
    assert.match(migration, /PublicationRequestQuota_counter_key/);
    assert.match(migration, /PublicationRequestQuota_expiresAt_idx/);
    assert.match(migration, /char_length\("subjectKeyHash"\) = 64/);
    assert.doesNotMatch(migration, /"ipAddress" text/);
  });
});
