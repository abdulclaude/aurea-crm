import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatReportDateInTimezone, reportBucketKey } from "../report-time";

describe("report timezone boundaries", () => {
  it("assigns the same instant to the active location service day", () => {
    const instant = new Date("2026-07-13T00:30:00.000Z");
    assert.equal(
      formatReportDateInTimezone(instant, "Europe/London"),
      "2026-07-13",
    );
    assert.equal(
      formatReportDateInTimezone(instant, "America/New_York"),
      "2026-07-12",
    );
  });

  it("uses tenant timezone and configured week start for buckets", () => {
    const instant = new Date("2026-07-13T00:30:00.000Z");
    assert.equal(
      reportBucketKey({
        value: instant,
        timezone: "America/New_York",
        weekStart: "SUNDAY",
        groupBy: "day",
      }),
      "2026-07-12",
    );
    assert.equal(
      reportBucketKey({
        value: instant,
        timezone: "Europe/London",
        weekStart: "MONDAY",
        groupBy: "week",
      }),
      "2026-07-13",
    );
    assert.equal(
      reportBucketKey({
        value: instant,
        timezone: "America/New_York",
        weekStart: "SUNDAY",
        groupBy: "week",
      }),
      "2026-07-12",
    );
  });

  it("preserves null values instead of inventing a reporting date", () => {
    assert.equal(formatReportDateInTimezone(null, "UTC"), null);
  });

  it("uses the workspace day for export filenames around UTC midnight", () => {
    const instant = new Date("2026-07-18T01:30:00.000Z");
    assert.equal(
      formatReportDateInTimezone(instant, "America/New_York"),
      "2026-07-17",
    );
    assert.equal(
      formatReportDateInTimezone(instant, "Europe/Paris"),
      "2026-07-18",
    );
  });
});
