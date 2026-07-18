import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyOAuthProviderResponseFailure,
  classifyOAuthProviderTokenFailure,
  getOAuthProviderFailureHealthState,
  getOAuthProviderSuccessHealthState,
  oauthProviderHealthErrorCodes,
} from "@/features/provider-accounts/lib/oauth-provider-health";

describe("OAuth provider health", () => {
  it("requires reauthorization for a nested invalid_grant response", () => {
    const failure = classifyOAuthProviderTokenFailure({
      status: "BAD_REQUEST",
      body: {
        message: "Failed to get a valid access token",
        cause: {
          status: 400,
          data: { error: "invalid_grant" },
        },
      },
    });

    assert.deepEqual(failure, {
      kind: "REAUTHORIZATION_REQUIRED",
      errorCode: oauthProviderHealthErrorCodes.reauthorizationRequired,
    });
  });

  it("treats provider outages and unclassified failures as transient", () => {
    assert.equal(
      classifyOAuthProviderTokenFailure({ statusCode: 503 }).kind,
      "TRANSIENT",
    );
    assert.equal(
      classifyOAuthProviderTokenFailure(
        new Error("Failed to get a valid access token"),
      ).kind,
      "TRANSIENT",
    );
  });

  it("uses only stable redacted error codes in persisted state", () => {
    const checkedAt = new Date("2026-07-15T10:00:00.000Z");
    const failure = getOAuthProviderFailureHealthState(
      {
        kind: "TRANSIENT",
        errorCode: oauthProviderHealthErrorCodes.tokenTemporarilyUnavailable,
      },
      checkedAt,
    );

    assert.deepEqual(failure, {
      status: "DEGRADED",
      lastErrorCode: "OAUTH_TOKEN_TEMPORARILY_UNAVAILABLE",
      lastHealthCheckAt: checkedAt,
    });
  });

  it("builds recovery state after an authenticated provider request succeeds", () => {
    const checkedAt = new Date("2026-07-15T10:00:00.000Z");

    assert.deepEqual(getOAuthProviderSuccessHealthState(checkedAt), {
      status: "ACTIVE",
      lastErrorCode: null,
      lastHealthCheckAt: checkedAt,
      lastSuccessAt: checkedAt,
    });
  });

  it("classifies authenticated provider response statuses", () => {
    assert.equal(
      classifyOAuthProviderResponseFailure(401)?.kind,
      "REAUTHORIZATION_REQUIRED",
    );
    assert.equal(
      classifyOAuthProviderResponseFailure(429)?.kind,
      "TRANSIENT",
    );
    assert.equal(
      classifyOAuthProviderResponseFailure(503)?.kind,
      "TRANSIENT",
    );
    assert.equal(classifyOAuthProviderResponseFailure(400), null);
    assert.equal(classifyOAuthProviderResponseFailure(204), null);
  });
});
