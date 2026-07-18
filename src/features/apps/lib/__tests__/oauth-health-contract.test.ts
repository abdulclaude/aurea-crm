import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyOAuthHealthPayload,
  getOAuthHealthEndpoint,
} from "../oauth-health-contract";

describe("OAuth health contracts", () => {
  it("uses read-only provider endpoints", () => {
    assert.match(getOAuthHealthEndpoint("GOOGLE_WORKSPACE"), /profile$/);
    assert.match(getOAuthHealthEndpoint("MICROSOFT_365"), /messages\?/);
    assert.match(getOAuthHealthEndpoint("SLACK_OAUTH"), /auth\.test$/);
    assert.match(getOAuthHealthEndpoint("DISCORD_OAUTH"), /users\/@me$/);
  });

  it("accepts healthy responses from each provider", () => {
    assert.equal(
      classifyOAuthHealthPayload("GOOGLE_WORKSPACE", {
        emailAddress: "studio@example.com",
      }),
      "HEALTHY",
    );
    assert.equal(
      classifyOAuthHealthPayload("MICROSOFT_365", { value: [] }),
      "HEALTHY",
    );
    assert.equal(
      classifyOAuthHealthPayload("SLACK_OAUTH", { ok: true }),
      "HEALTHY",
    );
    assert.equal(
      classifyOAuthHealthPayload("DISCORD_OAUTH", { id: "account-1" }),
      "HEALTHY",
    );
  });

  it("separates revoked Slack tokens from malformed provider responses", () => {
    assert.equal(
      classifyOAuthHealthPayload("SLACK_OAUTH", {
        ok: false,
        error: "token_revoked",
      }),
      "REAUTHORIZATION_REQUIRED",
    );
    assert.equal(
      classifyOAuthHealthPayload("SLACK_OAUTH", {
        ok: false,
        error: "internal_error",
      }),
      "DEGRADED",
    );
    assert.equal(
      classifyOAuthHealthPayload("GOOGLE_WORKSPACE", {}),
      "DEGRADED",
    );
  });
});
