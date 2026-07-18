import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hashIpAddress,
  IpHashSaltUnavailableError,
  sanitizeUserProperties,
} from "../gdpr-utils";

describe("privacy utilities", () => {
  it("hashes IPs with a deployment secret and daily rotation", () => {
    const salt = "a".repeat(32);
    const first = hashIpAddress("203.0.113.1", {
      now: new Date("2026-07-14T12:00:00.000Z"),
      salt,
    });
    const sameDay = hashIpAddress("203.0.113.1", {
      now: new Date("2026-07-14T23:59:00.000Z"),
      salt,
    });
    const nextDay = hashIpAddress("203.0.113.1", {
      now: new Date("2026-07-15T00:00:00.000Z"),
      salt,
    });

    assert.equal(first.length, 32);
    assert.equal(first, sameDay);
    assert.notEqual(first, nextDay);
  });

  it("fails closed without a sufficiently strong hash secret", () => {
    assert.throws(
      () => hashIpAddress("203.0.113.1", { salt: "short" }),
      IpHashSaltUnavailableError,
    );
  });

  it("removes direct identifiers without weakening unknown value types", () => {
    assert.deepEqual(
      sanitizeUserProperties({ email: "person@example.com", plan: "gold" }),
      { plan: "gold" },
    );
  });
});
