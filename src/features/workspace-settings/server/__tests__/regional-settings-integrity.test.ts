import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("workspace regional settings integrity", () => {
  const router = source("src/features/workspace-settings/server/router.ts");
  const service = source("src/features/workspace-settings/server/mutation-service.ts");
  const migration = source("drizzle/0078_workspace_regional_settings.sql");

  it("derives scope from session context and separates view from manage", () => {
    assert.doesNotMatch(router, /organizationId:\s*z\./);
    assert.doesNotMatch(router, /locationId:\s*z\./);
    assert.ok((router.match(/"settings\.view"/g)?.length ?? 0) >= 2);
    assert.ok((router.match(/"settings\.manage"/g)?.length ?? 0) >= 2);
  });

  it("serializes versions under a scope lock and never reactivates history", () => {
    assert.match(service, /pg_advisory_xact_lock/);
    assert.match(service, /organizationLockKey/);
    assert.match(service, /locationLockKey/);
    assert.match(service, /code: "CONFLICT"/);
    assert.match(service, /input\.expectedVersion/);
    assert.match(service, /max\(workspaceRegionalSettingsVersion\.version\)/);
    assert.match(service, /\.set\(\{ isActive: false \}\)/);
    assert.doesNotMatch(service, /\.set\(\{ isActive: true \}\)/);
    assert.match(service, /rollbackFromVersion/);
  });

  it("enforces tenant scope, immutable versions, and one active version", () => {
    assert.match(
      migration,
      /FOREIGN KEY \("organizationId", "locationId"\) REFERENCES "Location"\("organizationId", "id"\)/,
    );
    assert.match(
      migration,
      /WorkspaceRegionalSettingsVersion_location_version_key/,
    );
    assert.match(migration, /WorkspaceRegionalSettingsVersion_org_version_key/);
    assert.match(
      migration,
      /WorkspaceRegionalSettingsVersion_active_location_key/,
    );
    assert.match(migration, /WorkspaceRegionalSettingsVersion_active_org_key/);
    assert.match(migration, /"version" > 0/);
    assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  });

  it("backfills organization defaults and only meaningful legacy overrides", () => {
    assert.match(migration, /Migrated organization defaults/);
    assert.match(migration, /is_supported_regional_currency\("currency"\)/);
    assert.match(migration, /WorkspaceRegionalSettingsVersion_text_values_check/);
    assert.match(migration, /"timezone" <> 'UTC'/);
    assert.match(migration, /pg_timezone_names/);
    assert.match(migration, /Organization_create_regional_settings/);
    assert.match(migration, /Location_create_regional_settings_override/);
    assert.match(migration, /Location_inherit_regional_timezone/);
    assert.match(migration, /ALTER COLUMN "timezone" DROP DEFAULT/);
    assert.match(migration, /IF NEW\."timezone" IS NULL THEN/);
    assert.doesNotMatch(
      migration.slice(
        migration.indexOf("CREATE FUNCTION create_location_regional_settings_override"),
        migration.indexOf("CREATE TRIGGER \"Location_create_regional_settings_override\""),
      ),
      /<> 'UTC'/,
    );
    assert.match(migration, /WorkspaceRegionalSettingsVersion_protect_history/);
    assert.match(migration, /BEFORE UPDATE OR DELETE/);
    assert.match(migration, /OLD\."createdBy" IS NOT NULL/);
    assert.match(migration, /NOT EXISTS \(\s*SELECT 1 FROM "Organization"/);
    assert.match(migration, /ON UPDATE RESTRICT ON DELETE CASCADE/);
    assert.doesNotMatch(migration, /DELETE FROM|DROP TABLE|TRUNCATE/);
  });
});
