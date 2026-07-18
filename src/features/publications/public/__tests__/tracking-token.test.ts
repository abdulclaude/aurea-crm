import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  createPublicationTrackingToken,
  verifyPublicationTrackingToken,
} from "../tracking-token";

const ORIGINAL_SECRET = process.env.PUBLICATION_TRACKING_SECRET;

describe("publication tracking token", () => {
  before(() => {
    process.env.PUBLICATION_TRACKING_SECRET = "p".repeat(48);
  });

  after(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.PUBLICATION_TRACKING_SECRET;
    } else {
      process.env.PUBLICATION_TRACKING_SECRET = ORIGINAL_SECRET;
    }
  });

  it("binds a short-lived token to one target, version, and funnel", () => {
    const token = createPublicationTrackingToken(
      { targetId: "target-1", versionId: "version-2", funnelId: "funnel-3" },
      1_000,
      "25fce6e5-1135-4a29-bf8d-b1fdcb101de8",
    );
    assert.ok(token);
    assert.deepEqual(verifyPublicationTrackingToken(token, 1_001), {
      targetId: "target-1",
      versionId: "version-2",
      funnelId: "funnel-3",
      nonce: "25fce6e5-1135-4a29-bf8d-b1fdcb101de8",
      issuedAt: 1_000,
      expiresAt: 1_600,
    });
  });

  it("rejects expired and tampered tokens", () => {
    const token = createPublicationTrackingToken(
      { targetId: "target-1", versionId: "version-2", funnelId: "funnel-3" },
      1_000,
    );
    assert.ok(token);
    assert.equal(verifyPublicationTrackingToken(token, 1_600), null);
    assert.equal(verifyPublicationTrackingToken(`${token}x`, 1_001), null);
  });

  it("fails closed when the deployment signing secret is too short", () => {
    process.env.PUBLICATION_TRACKING_SECRET = "short";
    assert.equal(
      createPublicationTrackingToken({
        targetId: "target-1",
        versionId: "version-2",
        funnelId: "funnel-3",
      }),
      null,
    );
    process.env.PUBLICATION_TRACKING_SECRET = "p".repeat(48);
  });
});
