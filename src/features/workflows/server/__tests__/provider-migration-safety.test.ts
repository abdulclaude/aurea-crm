import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

function migration(name: string) {
  return readFileSync(path.join(process.cwd(), "drizzle", name), "utf8");
}

describe("provider migration safety", () => {
  it("fails with a bounded count before creating OAuth identity indexes", () => {
    const source = migration("0050_unique_scoped_oauth_identity.sql");
    assert.ok(source.indexOf("duplicate_group_count") < source.indexOf("CREATE UNIQUE INDEX"));
    assert.match(source, /HAVING COUNT\(\*\) > 1/);
    assert.match(source, /require operator reconciliation/);
    assert.doesNotMatch(source, /DELETE FROM "ProviderAccount"/);
  });

  it("archives active workflows that cannot pass runtime provider readiness", () => {
    const source = migration("0051_archive_unready_provider_workflows.sql");
    assert.match(source, /workflow\.archived = false/);
    assert.match(source, /account\.status = 'ACTIVE'/);
    assert.match(source, /oauth_grant\.scopes @> spec\.required_scopes/);
    assert.match(source, /IS DISTINCT FROM node\."providerAccountId"/);
    assert.match(source, /unavailable_node_types/);
    assert.match(source, /SET archived = true/);
  });
});
