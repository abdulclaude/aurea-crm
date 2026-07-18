import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const source = ["integration-procedures.ts", "integration-lifecycle-procedures.ts", "integration-server-policy.ts"]
  .map((file) =>
    readFileSync(
      path.join(process.cwd(), "src/features/provider-accounts/server", file),
      "utf8",
    ),
  )
  .join("\n");

describe("integration provider lifecycle contract", () => {
  it("authorizes provider management and scopes every write", () => {
    assert.match(source, /capability: "provider\.manage"/);
    assert.match(
      source,
      /resource: \{ organizationId, locationId: ctx\.locationId \}/,
    );
    for (const procedure of [
      "saveIntegration",
      "pauseIntegration",
      "reconnectIntegration",
      "disconnectIntegration",
      "deleteIntegration",
    ]) {
      assert.match(
        source,
        new RegExp(
          `${procedure}:[\\s\\S]*?authorizeProviderManagement\\(ctx, (orgId|organizationId)\\)`,
        ),
      );
    }
    assert.match(
      source,
      /\.delete\(providerAccount\)[\s\S]*?exactProviderScope\(ctx, organizationId\)[\s\S]*?eq\(providerAccount\.status, "DISCONNECTED"\)/,
    );
  });

  it("encrypts typed secrets and never promotes local validation to healthy", () => {
    assert.match(source, /encrypt\(JSON\.stringify/);
    assert.match(source, /encrypt\(secret\.webhookSecret\)/);
    assert.match(source, /remoteCheckPerformed: false/);
    assert.match(source, /status: "PENDING_VERIFICATION"/);
    assert.match(source, /lastErrorCode: "REMOTE_CHECK_REQUIRED"/);
    assert.doesNotMatch(source, /status: "HEALTHY"/);
    assert.doesNotMatch(source, /status: "ACTIVE"/);
  });
});
