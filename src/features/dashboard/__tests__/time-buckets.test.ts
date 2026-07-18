import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatDashboardXAxisLabel,
  getDashboardBucketKey,
  getDashboardBucketKeys,
} from "../time-buckets";

describe("formatDashboardXAxisLabel", () => {
  it("keeps weekly axis labels compact without repeating week commencing", () => {
    assert.equal(formatDashboardXAxisLabel("2026-01-12", "week"), "12 Jan");
  });

  it("formats day and month buckets at their existing precision", () => {
    assert.equal(formatDashboardXAxisLabel("2026-07-15", "day"), "15 Jul");
    assert.equal(formatDashboardXAxisLabel("2026-07", "month"), "Jul 26");
  });
});

describe("dashboard time bucket keys", () => {
  it("keeps week starts on Monday across the UK daylight-saving boundary", () => {
    const keys = getDashboardBucketKeys(
      new Date("2026-03-16T00:00:00Z"),
      new Date("2026-04-14T00:00:00Z"),
      "week",
    );

    assert.deepEqual(keys, [
      "2026-03-16",
      "2026-03-23",
      "2026-03-30",
      "2026-04-06",
      "2026-04-13",
    ]);
  });

  it("uses the same UTC calendar as the database bucket keys", () => {
    assert.equal(
      getDashboardBucketKey(new Date("2026-07-15T00:00:00+01:00"), "day"),
      "2026-07-14",
    );
    assert.equal(
      getDashboardBucketKey(new Date("2026-07-15T00:00:00+01:00"), "week"),
      "2026-07-13",
    );
  });
});
