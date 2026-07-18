import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "drizzle/0046_workflow_provider_account_binding.sql",
  ),
  "utf8",
);

describe("workflow provider account binding migration", () => {
  it("adds a nullable provider binding without an implicit backfill", () => {
    assert.match(
      migration,
      /ALTER TABLE "Node" ADD COLUMN "providerAccountId" text;/,
    );
    assert.doesNotMatch(migration, /NOT NULL/);
    assert.doesNotMatch(migration, /UPDATE "Node"/);
  });

  it("indexes the binding and clears it when an account is deleted", () => {
    assert.match(migration, /CREATE INDEX "Node_providerAccountId_idx"/);
    assert.match(
      migration,
      /FOREIGN KEY \("providerAccountId"\) REFERENCES "public"\."ProviderAccount"\("id"\) ON DELETE set null ON UPDATE cascade/,
    );
  });
});
