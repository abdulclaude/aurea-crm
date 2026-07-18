import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "src/app/api/webhooks/google-form/route.ts"),
  "utf8",
);

describe("Google Form webhook route security", () => {
  it("requires a bounded payload, secret, active workflow, and tenant snapshot", () => {
    assert.match(source, /readBoundedRawBody\(request\)/);
    assert.match(source, /x-aurea-webhook-token/);
    assert.match(source, /googleFormWebhookSecretMatches/);
    assert.match(source, /triggerNode\.archived \|\| triggerNode\.isTemplate/);
    assert.match(source, /expectedOrganizationId: triggerNode\.organizationId/);
    assert.match(source, /expectedLocationId: triggerNode\.locationId/);
  });

  it("deduplicates identical deliveries", () => {
    assert.match(source, /idempotencyKey: googleFormWebhookEventId/);
  });
});
