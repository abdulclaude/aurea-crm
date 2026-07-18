import assert from "node:assert/strict";
import test from "node:test";

import { REPORT_GROUPS, SUPPORTED_REPORT_IDS } from "../../constants";
import {
  getReportById,
  getReportFields,
  getReportsForGroup,
} from "../../helpers";

test("only exposes reports backed by a supported data contract", () => {
  const exposedIds = REPORT_GROUPS.flatMap((group) =>
    getReportsForGroup(group.id).map((report) => report.id),
  );

  assert.deepEqual(new Set(exposedIds), SUPPORTED_REPORT_IDS);
  assert.equal(getReportById("sales", "earned-revenue"), null);
});

test("keeps reports without truthful historical inputs unavailable", () => {
  const unavailable = [
    ["sales", "contract-sales"],
    ["sales", "outstanding-series"],
    ["sales", "sales-by-supplier"],
    ["sales", "best-sellers"],
    ["inventory", "cost-of-goods-sold"],
    ["inventory", "inventory-sales-by-supplier"],
  ] as const;

  for (const [groupId, reportId] of unavailable) {
    assert.equal(getReportById(groupId, reportId), null);
  }
});

test("adds a currency dimension to monetary reports", () => {
  const salesReport = getReportById("sales", "sales");
  assert.ok(salesReport);

  const fields = getReportFields(salesReport);
  assert.equal(
    fields.some((field) => field.id === "currency"),
    true,
  );
  assert.equal(fields.filter((field) => field.id === "currency").length, 1);
});

test("does not expose unsnapshotted historical profit on product sales", () => {
  for (const [groupId, reportId] of [
    ["sales", "sales-by-product"],
    ["inventory", "inventory-sales-by-product"],
  ] as const) {
    const report = getReportById(groupId, reportId);
    assert.ok(report);
    const fieldIds = getReportFields(report).map((field) => field.id);
    assert.equal(fieldIds.includes("cost"), false);
    assert.equal(fieldIds.includes("profit"), false);
    assert.equal(fieldIds.includes("margin"), false);
  }
});
