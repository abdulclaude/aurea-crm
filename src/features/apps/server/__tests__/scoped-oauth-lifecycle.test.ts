import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "src/features/apps/server/scoped-oauth.ts"),
  "utf8",
);
const routerSource = readFileSync(
  path.join(process.cwd(), "src/features/apps/server/routers.ts"),
  "utf8",
);
const managerSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/apps/components/oauth-account-manager-dialog.tsx",
  ),
  "utf8",
);
const migration = readFileSync(
  path.join(process.cwd(), "drizzle/0050_unique_scoped_oauth_identity.sql"),
  "utf8",
);

describe("scoped OAuth lifecycle", () => {
  it("retains stable provider account IDs across disconnect and reconnect", () => {
    assert.doesNotMatch(source, /\.delete\(providerAccount\)/);
    assert.match(source, /status: "DISCONNECTED"/);
    assert.match(
      source,
      /const providerAccountId = existing\?\.account\.id \?\? createId\(\)/,
    );
    assert.match(source, /lastErrorCode: null/);
  });

  it("requires explicit tenant-scoped account choices for multi-account OAuth", () => {
    assert.match(routerSource, /listOAuthAccounts/);
    assert.match(routerSource, /syncOAuthAccount/);
    assert.match(routerSource, /providerAccountId: input\.providerAccountId/);
    assert.match(source, /capability: "provider\.manage"/);
    assert.match(source, /redactOAuthAccountIdentifier/);
    assert.doesNotMatch(source, /accessToken:/);
    assert.doesNotMatch(source, /refreshToken:/);
  });

  it("provides account selection and stable reconnect controls in the Apps UI", () => {
    assert.match(managerSource, /linkedAccountId: account\.id/);
    assert.match(managerSource, /providerAccountId: account\.id/);
    assert.match(managerSource, /Link another account/);
    assert.match(managerSource, /account\.accountHint/);
    assert.match(managerSource, /OAuthAccountRow/);
    assert.match(source, /lastHealthCheckAt: row\.account\.lastHealthCheckAt/);
    assert.match(source, /lastSuccessAt: row\.account\.lastSuccessAt/);
    assert.match(source, /row\.account\.lastErrorCode \?\?/);
    assert.match(source, /listVisibleAccounts/);
    assert.match(source, /selectOAuthCatalogAccount/);
    assert.match(source, /verifyOAuthConnection/);
  });

  it("prevents duplicate OAuth identities only within the same exact scope", () => {
    assert.match(migration, /ProviderAccount_org_oauth_identity_key/);
    assert.match(migration, /WHERE "locationId" IS NULL/);
    assert.match(migration, /ProviderAccount_location_oauth_identity_key/);
    assert.match(
      migration,
      /"organizationId", "locationId", "provider", "externalAccountId"/,
    );
  });
});
