import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  path.join(process.cwd(), "drizzle/0064_waiver_pdf_documents.sql"),
  "utf8",
);
const signatureMigration = readFileSync(
  path.join(process.cwd(), "drizzle/0066_waiver_signature_snapshots.sql"),
  "utf8",
);
const integrityMigration = readFileSync(
  path.join(process.cwd(), "drizzle/0067_waiver_snapshot_integrity.sql"),
  "utf8",
);

describe("waiver PDF migration", () => {
  it("stores object metadata without storing file contents", () => {
    for (const column of [
      "documentUrl",
      "documentName",
      "documentKey",
      "documentSize",
      "documentMimeType",
    ]) {
      assert.match(migration, new RegExp(`ADD COLUMN "${column}"`));
    }
    assert.doesNotMatch(migration, /bytea|blob/i);
  });

  it("snapshots the signed version and retains legal records", () => {
    assert.match(signatureMigration, /ADD COLUMN "templateVersion"/);
    assert.match(signatureMigration, /ADD COLUMN "documentKey"/);
    assert.match(signatureMigration, /ON DELETE restrict ON UPDATE cascade/);
    assert.match(signatureMigration, /WaiverSignature_clientId_fkey/);
    assert.match(integrityMigration, /ADD COLUMN "templateContent"/);
    assert.match(
      integrityMigration,
      /WaiverSignature_template_client_version_key/,
    );
  });
});
