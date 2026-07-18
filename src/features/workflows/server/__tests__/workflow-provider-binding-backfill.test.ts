import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

import { WORKFLOW_PROVIDER_BINDING_REGISTRY } from "@/features/workflows/lib/workflow-provider-binding";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "drizzle/0048_backfill_workflow_provider_bindings.sql",
  ),
  "utf8",
);

describe("workflow provider binding backfill", () => {
  it("covers every workflow provider binding node type", () => {
    for (const nodeType of Object.keys(WORKFLOW_PROVIDER_BINDING_REGISTRY)) {
      assert.match(migration, new RegExp(`'${nodeType}'`));
    }
  });

  it("only binds an existing explicit account or one unambiguous ready account", () => {
    assert.match(migration, /existing_binding = provider_account_id/);
    assert.match(migration, /existing_binding IS NULL AND eligible_count = 1/);
    assert.match(migration, /pa\.status = 'ACTIVE'/);
    assert.match(migration, /oauth_grant\.scopes @> spec\.required_scopes/);
  });

  it("requires tenant scope and explicit organization-account inheritance", () => {
    assert.match(
      migration,
      /pa\."organizationId" = w\."organizationId"/,
    );
    assert.match(migration, /pa\."locationId" = w\."locationId"/);
    assert.match(migration, /inheritToLocations/);
    assert.doesNotMatch(migration, /isDefault/);
  });

  it("keeps ambiguous or invalid bindings null so activation blocks them", () => {
    assert.match(migration, /WHERE n\."providerAccountId" IS NULL/);
    assert.doesNotMatch(migration, /LIMIT 1/);
  });
});
