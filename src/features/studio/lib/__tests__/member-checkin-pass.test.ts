import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  createMemberCheckInPass,
  verifyMemberCheckInPass,
} from "../member-checkin-pass";

const originalCheckInSecret = process.env.CHECKIN_PASS_SECRET;
const originalEncryptionKey = process.env.ENCRYPTION_KEY;

before(() => {
  process.env.CHECKIN_PASS_SECRET = "test-check-in-pass-secret-at-least-32-characters";
});

after(() => {
  if (originalCheckInSecret === undefined) {
    delete process.env.CHECKIN_PASS_SECRET;
  } else {
    process.env.CHECKIN_PASS_SECRET = originalCheckInSecret;
  }
  if (originalEncryptionKey === undefined) {
    delete process.env.ENCRYPTION_KEY;
  } else {
    process.env.ENCRYPTION_KEY = originalEncryptionKey;
  }
});

describe("member check-in pass", () => {
  it("round-trips an exact tenant and member identity", () => {
    const token = createMemberCheckInPass(
      {
        organizationId: "org_1",
        locationId: "location_1",
        clientId: "client_1",
      },
      1_000,
      "00000000-0000-4000-8000-000000000001",
    );

    assert.ok(token);
    assert.deepEqual(verifyMemberCheckInPass(token, 1_001), {
      purpose: "member-check-in",
      organizationId: "org_1",
      locationId: "location_1",
      clientId: "client_1",
      nonce: "00000000-0000-4000-8000-000000000001",
      issuedAt: 1_000,
      expiresAt: 44_200,
    });
  });

  it("rejects tampered and expired passes", () => {
    const token = createMemberCheckInPass(
      {
        organizationId: "org_1",
        locationId: null,
        clientId: "client_1",
      },
      2_000,
      "00000000-0000-4000-8000-000000000002",
    );

    assert.ok(token);
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    assert.equal(verifyMemberCheckInPass(tampered, 2_001), null);
    assert.equal(verifyMemberCheckInPass(token, 45_200), null);
  });

  it("fails closed without a strong server secret", () => {
    delete process.env.CHECKIN_PASS_SECRET;
    delete process.env.ENCRYPTION_KEY;
    assert.equal(
      createMemberCheckInPass({
        organizationId: "org_1",
        locationId: null,
        clientId: "client_1",
      }),
      null,
    );
    process.env.CHECKIN_PASS_SECRET =
      "test-check-in-pass-secret-at-least-32-characters";
  });
});
