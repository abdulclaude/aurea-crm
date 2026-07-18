import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../../../../drizzle/0043_scoped_referrals.sql",
  import.meta.url,
);

describe("scoped referral migration", () => {
  it("preserves legacy programs while cloning exact location programs", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    assert.match(migration, /LOCK TABLE "ReferralProgram", "Referral", "Client", "Location"/);
    assert.match(migration, /program\."organizationId" <> referrer\."organizationId"/);
    assert.match(migration, /md5\('aurea:referral-program:'/);
    assert.match(migration, /WHEN referrer\."locationId" IS NULL THEN program\."id"/);
    assert.match(migration, /ALTER COLUMN "organizationId" SET NOT NULL/);
  });

  it("enforces nullable exact scope and prevents referenced scope changes", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    assert.match(migration, /UNIQUE NULLS NOT DISTINCT \("organizationId", "locationId"\)/);
    assert.match(migration, /CREATE OR REPLACE FUNCTION validate_referral_scope\(\)/);
    assert.match(migration, /IS NOT DISTINCT FROM NEW\."locationId"/);
    assert.match(migration, /CREATE TRIGGER "Referral_scope_guard"/);
    assert.match(migration, /CREATE TRIGGER "ReferralProgram_scope_change_guard"/);
    assert.match(migration, /CREATE TRIGGER "Client_referral_scope_change_guard"/);
  });
});
