import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildReportCsv } from "../report-csv";

const fields = [
  { id: "date", name: "Date", type: "Date", description: "Date" },
  { id: "client", name: "Client", type: "Text", description: "Client" },
  { id: "amount", name: "Amount", type: "Currency", description: "Amount" },
] as const;

describe("report CSV", () => {
  it("labels currency and timezone while preserving exact decimal strings", () => {
    const csv = buildReportCsv({
      fields,
      rows: [
        { date: "2026-07-13", client: 'Amina "A"', amount: "12345678.90" },
      ],
      currency: "GBP",
      timezone: "Europe/London",
    });
    assert.equal(
      csv,
      '"Date (Europe/London)","Client","Amount (GBP)"\n"2026-07-13","Amina ""A""","12345678.90"',
    );
  });

  it("rejects money with precision beyond the currency exponent", () => {
    assert.throws(() =>
      buildReportCsv({
        fields,
        rows: [{ date: "2026-07-13", client: "Ben", amount: "1.001" }],
        currency: "GBP",
        timezone: "UTC",
      }),
    );
  });

  it("neutralizes formulas in text cells without changing negative money", () => {
    const csv = buildReportCsv({
      fields,
      rows: [
        {
          date: "2026-07-13",
          client: '=HYPERLINK("https://example.com")',
          amount: "-10.00",
        },
      ],
      currency: "GBP",
      timezone: "UTC",
    });

    assert.match(csv, /"'=HYPERLINK/);
    assert.match(csv, /"-10\.00"/);
  });
});
