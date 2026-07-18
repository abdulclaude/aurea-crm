import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isLedgerEntryVisibleInTransactionReport,
  reportLedgerStatus,
  resolveReportCurrency,
  type ReportLedgerStatus,
} from "../report-row-policy";

describe("report transaction eligibility", () => {
  it("includes only financially final refunds in collected transactions", () => {
    const expectations: Array<[ReportLedgerStatus, boolean]> = [
      ["PENDING", false],
      ["FAILED", false],
      ["CANCELLED", false],
      ["SUCCEEDED", true],
    ];

    for (const [status, expected] of expectations) {
      assert.equal(
        isLedgerEntryVisibleInTransactionReport({
          reportId: "transactions",
          kind: "REFUND",
          status,
        }),
        expected,
      );
    }
  });

  it("keeps pending and rejected refunds in their operational reports", () => {
    assert.equal(
      isLedgerEntryVisibleInTransactionReport({
        reportId: "pending-transactions",
        kind: "REFUND",
        status: "PENDING",
      }),
      true,
    );
    assert.equal(
      isLedgerEntryVisibleInTransactionReport({
        reportId: "voided-rejected-transactions",
        kind: "REFUND",
        status: "FAILED",
      }),
      true,
    );
  });

  it("labels only a successful refund as refunded", () => {
    assert.equal(
      reportLedgerStatus({ kind: "REFUND", status: "SUCCEEDED" }),
      "REFUNDED",
    );
    assert.equal(
      reportLedgerStatus({ kind: "REFUND", status: "PENDING" }),
      "PENDING",
    );
  });
});

describe("record currency resolution", () => {
  it("uses each record currency before the location fallback", () => {
    assert.equal(resolveReportCurrency(" usd ", "GBP"), "USD");
    assert.equal(resolveReportCurrency(null, "gbp"), "GBP");
  });

  it("falls back for malformed imported record currency", () => {
    assert.equal(resolveReportCurrency("unknown", "EUR"), "EUR");
  });
});
