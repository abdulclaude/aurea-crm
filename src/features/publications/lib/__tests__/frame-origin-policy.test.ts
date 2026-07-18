import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPublicationSecurityHeaders,
  buildFrameAncestorsPolicy,
  getPublicationFrameOrigins,
} from "@/features/publications/lib/frame-origin-policy";

test("frame policy allows only immutable validated widget origins", () => {
  const origins = getPublicationFrameOrigins({
    kind: "WIDGET",
    snapshot: {
      schemaVersion: 1,
      source: {},
      channelConfig: {
        kind: "WIDGET",
        allowedFrameOrigins: ["https://studio.example.com"],
      },
    },
  });
  assert.deepEqual(origins, ["https://studio.example.com"]);
  assert.equal(
    buildFrameAncestorsPolicy(origins),
    "frame-ancestors https://studio.example.com;",
  );
  assert.equal(
    buildFrameAncestorsPolicy(["https://good.test; script-src *"]),
    "frame-ancestors 'none';",
  );
  assert.equal(
    buildFrameAncestorsPolicy(["https://*.example.com"]),
    "frame-ancestors 'none';",
  );
  assert.deepEqual(
    getPublicationFrameOrigins({ kind: "FUNNEL", snapshot: {} }),
    [],
  );
});

test("publication security headers fail closed", () => {
  const headers = new Headers();
  applyPublicationSecurityHeaders(headers, []);
  assert.equal(headers.get("content-security-policy"), "frame-ancestors 'none';");
  assert.equal(headers.get("referrer-policy"), "no-referrer");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.match(headers.get("permissions-policy") ?? "", /camera=\(\)/);
  assert.equal(headers.get("cache-control"), "private, no-store, max-age=0");
});

test("published forms use the same immutable exact-origin policy", () => {
  assert.deepEqual(
    getPublicationFrameOrigins({
      kind: "FORM",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: {
          kind: "FORM",
          allowedFrameOrigins: ["https://forms.example.com"],
        },
      },
    }),
    ["https://forms.example.com"],
  );
});

test("legacy widget snapshots fail closed until origins are configured and republished", () => {
  assert.deepEqual(
    getPublicationFrameOrigins({
      kind: "WIDGET",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: { kind: "WIDGET" },
      },
    }),
    [],
  );
});
