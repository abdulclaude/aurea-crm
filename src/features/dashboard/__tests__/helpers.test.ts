import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getCategoricalAxisLabelLines,
  getVisibleXAxisTicks,
} from "../helpers";

describe("getVisibleXAxisTicks", () => {
  it("spaces ticks evenly while preserving both date-range edges", () => {
    const data = Array.from({ length: 14 }, (_, index) => ({
      label: `day-${index}`,
    }));

    assert.deepEqual(getVisibleXAxisTicks(data), [
      "day-0",
      "day-3",
      "day-5",
      "day-8",
      "day-10",
      "day-13",
    ]);
  });

  it("shows every tick for short ranges", () => {
    const data = Array.from({ length: 5 }, (_, index) => ({
      label: `day-${index}`,
    }));

    assert.deepEqual(
      getVisibleXAxisTicks(data),
      data.map(({ label }) => label),
    );
  });

  it("reduces long-range ticks for narrow chart widths", () => {
    const data = Array.from({ length: 27 }, (_, index) => ({
      label: `week-${index}`,
    }));

    assert.deepEqual(getVisibleXAxisTicks(data, 5), [
      "week-0",
      "week-7",
      "week-13",
      "week-20",
      "week-26",
    ]);
  });
});

describe("getCategoricalAxisLabelLines", () => {
  it("keeps short labels together and wraps longer category names", () => {
    assert.deepEqual(getCategoricalAxisLabelLines("Gift card"), ["Gift card"]);
    assert.deepEqual(getCategoricalAxisLabelLines("Account credit"), [
      "Account",
      "credit",
    ]);
  });

  it("bounds unusually long labels to two lines", () => {
    const lines = getCategoricalAxisLabelLines(
      "Private coaching package renewal",
    );

    assert.equal(lines.length, 2);
    assert.ok(lines.every((line) => line.length <= 11));
  });
});
