import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

function source(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

describe("visitor privacy lifecycle invariants", () => {
  it("keeps privacy operations capability-gated and tenant-scoped", () => {
    const router = source("../../server/external-funnels-router.ts");
    const common = source("../../server/visitor-privacy-common.ts");
    const erasure = source("../../server/visitor-privacy-erasure.ts");

    assert.match(router, /capability: "privacy\.export"/);
    assert.match(router, /capability: "privacy\.erase"/);
    assert.match(common, /anonymousUserProfiles\.organizationId/);
    assert.match(common, /anonymousUserProfiles\.locationId/);
    assert.match(erasure, /db\.transaction/);
    assert.match(erasure, /deletionRequestedAt: erasedAt/);
  });

  it("links external submissions to mirrors and separates quota actions", () => {
    const migration = source("../../../../../drizzle/0036_native_public_form_submissions.sql");
    const trackingMigration = source("../../../../../drizzle/0037_scoped_tracking_identities.sql");

    assert.match(migration, /mirroredFormSubmissionId/);
    assert.match(
      migration,
      /ExternalFormSubmission_funnelId_idempotencyKey_key/,
    );
    assert.match(trackingMigration, /"action" text NOT NULL/);
    assert.match(
      trackingMigration,
      /\("funnelId", "action", "dimension", "subjectKeyHash", "windowStartedAt"\)/,
    );
  });

  it("prevents erased browser identities from being re-ingested", () => {
    const processor = source(
      "../../../../inngest/functions/process-tracking-events.ts",
    );
    const webVitals = source("../../../../app/api/track/web-vitals/route.ts");

    assert.match(processor, /exclude-erased-visitors/);
    assert.match(processor, /anonymousUserProfiles\.deletionRequestedAt/);
    assert.match(webVitals, /erasedProfile\?\.deletionRequestedAt/);
  });
});
