import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("customer settings foundation", () => {
  const router = source("src/features/customer-settings/server/router.ts");
  const policy = source(
    "src/features/customer-settings/server/household-policy-service.ts",
  );
  const migration = source("drizzle/0082_customer_settings_foundation.sql");

  it("derives scope from context and separates view from manage capabilities", () => {
    assert.match(router, /"settings\.view"/);
    assert.match(router, /"settings\.manage"/);
    assert.doesNotMatch(router, /organizationId:\s*z\./);
    assert.doesNotMatch(router, /locationId:\s*z\./);
  });

  it("serializes household policy versions and rejects stale writes", () => {
    assert.match(policy, /pg_advisory_xact_lock/);
    assert.match(policy, /input\.expectedVersion/);
    assert.match(policy, /code: "CONFLICT"/);
    assert.match(policy, /max\(householdSharingPolicyVersion\.version\)/);
  });

  it("uses soft archive tables and scoped active uniqueness", () => {
    assert.match(migration, /"archivedAt" timestamp/);
    assert.match(migration, /CustomerFieldDefinition_active_location_key/);
    assert.match(migration, /CustomerTagDefinition_active_org_name/);
    assert.match(
      migration,
      /HouseholdSharingPolicyVersion_active_location_key/,
    );
    assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
    assert.doesNotMatch(migration, /DELETE FROM|DROP TABLE|TRUNCATE/);
  });
});
