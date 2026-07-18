import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const source = readFileSync(
  path.join(
    process.cwd(),
    "src/features/workflows/server/workflow-provider-account-procedure.ts",
  ),
  "utf8",
);

describe("workflow provider account list procedure", () => {
  it("requires workflow management and exact organization/provider filters", () => {
    assert.match(source, /capability: "workflow\.manage"/);
    assert.match(source, /eq\(providerAccount\.organizationId, scope\.organizationId\)/);
    assert.match(source, /eq\(providerAccount\.provider, spec\.provider\)/);
    assert.match(source, /isWorkflowProviderAccountAvailableToScope/);
  });

  it("returns a redacted projection rather than secrets or provider config", () => {
    assert.doesNotMatch(source, /encryptedSecret/);
    assert.doesNotMatch(source, /encryptedWebhookSecret/);
    assert.doesNotMatch(source, /externalAccountId/);
    assert.match(source, /readiness: getWorkflowProviderAccountReadiness/);
  });
});
