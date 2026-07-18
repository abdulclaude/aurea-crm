import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeFormRetentionPurgeBatchSize,
  publicFormResponseExpiry,
} from "@/features/forms-builder/lib/form-retention";

test("form response expiry supports materially different tenant policies", () => {
  const submittedAt = new Date("2026-07-14T12:00:00.000Z");
  assert.equal(
    publicFormResponseExpiry(submittedAt, 7).toISOString(),
    "2026-07-21T12:00:00.000Z",
  );
  assert.equal(
    publicFormResponseExpiry(submittedAt, 730).toISOString(),
    "2028-07-13T12:00:00.000Z",
  );
});

test("form response expiry rejects invalid retention", () => {
  assert.throws(() => publicFormResponseExpiry(new Date(), 0), RangeError);
  assert.throws(() => publicFormResponseExpiry(new Date(), 3_651), RangeError);
});

test("form retention purge batches stay bounded", () => {
  assert.equal(normalizeFormRetentionPurgeBatchSize(0), 1);
  assert.equal(normalizeFormRetentionPurgeBatchSize(2_000), 1_000);
});
