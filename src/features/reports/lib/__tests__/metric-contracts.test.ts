import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { metricContractSchema } from "../../contracts";
import { SUPPORTED_REPORT_IDS } from "../../constants";
import {
  getMetricContractsForReport,
  METRIC_CONTRACTS,
} from "../../metric-contracts";

describe("metric contracts", () => {
  it("keeps every contract valid and uniquely identified", () => {
    const parsed = METRIC_CONTRACTS.map((contract) =>
      metricContractSchema.parse(contract),
    );
    assert.equal(
      new Set(parsed.map((contract) => contract.id)).size,
      parsed.length,
    );
  });

  it("requires money metrics to partition currencies without implicit conversion", () => {
    const money = METRIC_CONTRACTS.filter(
      (contract) => contract.unit === "MONEY",
    );
    assert.ok(money.length > 0);
    for (const contract of money) {
      assert.match(contract.currencyPolicy, /No implicit FX conversion/i);
      assert.notEqual(contract.refundPolicy.trim(), "");
    }
  });

  it("maps reports to only the contracts that declare them", () => {
    const contracts = getMetricContractsForReport("transactions");
    assert.deepEqual(
      contracts.map((contract) => contract.id),
      ["net_collected_revenue", "successful_payment_count"],
    );
  });

  it("does not advertise contracts for unavailable reports", () => {
    for (const contract of METRIC_CONTRACTS) {
      for (const reportId of contract.reportIds) {
        assert.equal(SUPPORTED_REPORT_IDS.has(reportId), true, reportId);
      }
    }
  });
});
