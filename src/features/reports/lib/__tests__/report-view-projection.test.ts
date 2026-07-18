import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reportViewDefinitionSchema } from "../../contracts";
import {
  projectReportRows,
  visibleReportFields,
} from "../report-view-projection";

const fields = [
  { id: "date", name: "Date", type: "Date", description: "Service day" },
  { id: "client", name: "Client", type: "Text", description: "Client" },
  { id: "status", name: "Status", type: "Status", description: "Status" },
  { id: "amount", name: "Amount", type: "Currency", description: "Amount" },
] as const;

const rows = [
  { date: "2026-07-01", client: "Amina", status: "SUCCEEDED", amount: "20.00" },
  { date: "2026-07-02", client: "Ben", status: "FAILED", amount: "12.00" },
  { date: "2026-07-03", client: "Clara", status: "SUCCEEDED", amount: "8.50" },
];

describe("report view projection", () => {
  it("applies a payment-status view with exact date bounds and descending money sort", () => {
    const definition = reportViewDefinitionSchema.parse({
      version: 1,
      search: "",
      filters: { status: ["SUCCEEDED"] },
      dateRange: { fieldId: "date", start: "2026-07-01", end: "2026-07-03" },
      sorting: [{ id: "amount", desc: true }],
      columnOrder: ["client", "amount", "date", "status"],
      columnVisibility: { status: false },
      pageSize: 20,
    });

    assert.deepEqual(
      projectReportRows({ rows, fields, definition }).map((row) => row.client),
      ["Amina", "Clara"],
    );
    assert.deepEqual(
      visibleReportFields(fields, definition).map((field) => field.id),
      ["client", "amount", "date"],
    );
  });

  it("applies a materially different client-search view without carrying filters", () => {
    const definition = reportViewDefinitionSchema.parse({
      version: 1,
      search: "ben",
      filters: {},
      dateRange: null,
      sorting: [{ id: "client", desc: false }],
      columnOrder: ["client", "status"],
      columnVisibility: {},
      pageSize: 50,
    });

    const projected = projectReportRows({ rows, fields, definition });
    assert.equal(projected.length, 1);
    assert.equal(projected[0]?.client, "Ben");
  });

  it("rejects inverted date ranges", () => {
    const result = reportViewDefinitionSchema.safeParse({
      version: 1,
      search: "",
      filters: {},
      dateRange: { fieldId: "date", start: "2026-07-03", end: "2026-07-01" },
      sorting: [],
      columnOrder: [],
      columnVisibility: {},
      pageSize: 20,
    });
    assert.equal(result.success, false);
  });

  it("sorts decimal money exactly beyond JavaScript safe integer precision", () => {
    const definition = reportViewDefinitionSchema.parse({
      version: 1,
      search: "",
      filters: {},
      dateRange: null,
      sorting: [{ id: "amount", desc: false }],
      columnOrder: [],
      columnVisibility: {},
      pageSize: 20,
    });
    const exactRows = [
      { client: "larger", amount: "9007199254740993.01" },
      { client: "negative", amount: "-2.10" },
      { client: "smaller", amount: "9007199254740992.99" },
    ];

    assert.deepEqual(
      projectReportRows({ rows: exactRows, fields, definition }).map(
        (row) => row.client,
      ),
      ["negative", "smaller", "larger"],
    );
  });
});
