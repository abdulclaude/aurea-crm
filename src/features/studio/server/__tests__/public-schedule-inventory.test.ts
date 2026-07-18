import assert from "node:assert/strict";
import test from "node:test";

import {
  publicScheduleDateKey,
  publicScheduleDayLabel,
  publicScheduleTime,
} from "@/features/studio/widgets/public-schedule-format";

test("public schedule formatting follows the location timezone", () => {
  const date = new Date("2026-07-14T23:30:00.000Z");
  assert.equal(publicScheduleDateKey(date, "Europe/London"), "2026-07-15");
  assert.equal(publicScheduleTime(date, "Europe/London"), "00:30");
  assert.match(publicScheduleDayLabel(date, "Europe/London"), /15 July/);
  assert.equal(publicScheduleDateKey(date, "America/New_York"), "2026-07-14");
});
