import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvalidDeliveryDestinationError,
  normalizeDeliveryDestination,
} from "@/features/delivery/lib/normalization";
import {
  doesSuppressionBlockPurpose,
  findBlockingSuppression,
  isSuppressionActive,
  type SuppressionCandidate,
} from "@/features/delivery/lib/suppression";

describe("delivery destination normalization", () => {
  it("normalizes email addresses and E.164 phone formatting", () => {
    assert.equal(
      normalizeDeliveryDestination("EMAIL", "  MEMBER@Example.COM "),
      "member@example.com",
    );
    assert.equal(
      normalizeDeliveryDestination("SMS", "+44 (7700) 900-123"),
      "+447700900123",
    );
  });

  it("rejects phone numbers whose country cannot be inferred safely", () => {
    assert.throws(
      () => normalizeDeliveryDestination("SMS", "07700 900123"),
      InvalidDeliveryDestinationError,
    );
  });
});

describe("communication suppressions", () => {
  const now = new Date("2026-07-13T12:00:00.000Z");
  const activeSuppression: SuppressionCandidate = {
    id: "suppression_123",
    channel: "EMAIL",
    destinationNormalized: "member@example.com",
    scope: "MARKETING",
    activeAt: new Date("2026-07-12T12:00:00.000Z"),
    expiresAt: null,
    revokedAt: null,
  };

  it("distinguishes marketing-only and all-purpose suppression", () => {
    assert.equal(doesSuppressionBlockPurpose("MARKETING", "MARKETING"), true);
    assert.equal(
      doesSuppressionBlockPurpose("MARKETING", "TRANSACTIONAL"),
      false,
    );
    assert.equal(doesSuppressionBlockPurpose("ALL", "SYSTEM"), true);
  });

  it("finds only active suppressions that block the delivery purpose", () => {
    assert.equal(isSuppressionActive(activeSuppression, now), true);
    assert.equal(
      findBlockingSuppression({
        channel: "EMAIL",
        destinationNormalized: "member@example.com",
        purpose: "MARKETING",
        suppressions: [activeSuppression],
        at: now,
      })?.id,
      "suppression_123",
    );
    assert.equal(
      findBlockingSuppression({
        channel: "EMAIL",
        destinationNormalized: "member@example.com",
        purpose: "TRANSACTIONAL",
        suppressions: [activeSuppression],
        at: now,
      }),
      null,
    );
  });

  it("ignores revoked and expired suppressions", () => {
    assert.equal(
      isSuppressionActive(
        { ...activeSuppression, revokedAt: new Date("2026-07-13T11:00:00Z") },
        now,
      ),
      false,
    );
    assert.equal(
      isSuppressionActive(
        { ...activeSuppression, expiresAt: new Date("2026-07-13T11:00:00Z") },
        now,
      ),
      false,
    );
  });
});
