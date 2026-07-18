import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDateTimeValue,
  formatDateValue,
  mergeDateAndTime,
  parseDateTimeValue,
  parseDateValue,
} from "@/components/ui/date-picker-utils";

test("round-trips local date values without UTC drift", () => {
  const value = "2026-03-29";
  assert.equal(formatDateValue(parseDateValue(value)), value);
});

test("rejects invalid calendar dates", () => {
  assert.equal(parseDateValue("2026-02-30"), undefined);
  assert.equal(parseDateTimeValue("2026-13-01T09:30"), undefined);
});

test("combines a selected date with a local wall-clock time", () => {
  const date = parseDateValue("2026-10-25");
  const value = mergeDateAndTime(date, "14:45");
  assert.equal(value, "2026-10-25T14:45");
  assert.equal(formatDateTimeValue(parseDateTimeValue(value)), value);
});
