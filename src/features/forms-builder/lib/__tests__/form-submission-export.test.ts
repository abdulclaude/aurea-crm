import assert from "node:assert/strict";
import test from "node:test";

import { buildFormSubmissionCsv } from "@/features/forms-builder/lib/form-submission-export";

test("form response CSV is field-oriented and resists spreadsheet formulas", () => {
  const csv = buildFormSubmissionCsv({
    fields: [
      { id: "name", label: "Name" },
      { id: "notes", label: "Notes" },
    ],
    rows: [
      {
        id: "submission_1",
        submittedAt: new Date("2026-07-14T12:00:00.000Z"),
        retentionExpiresAt: new Date("2026-07-21T12:00:00.000Z"),
        utmSource: "newsletter",
        utmCampaign: null,
        client: { name: "Example", email: "example@example.test" },
        data: { name: "=2+2", notes: 'Line one\n"Line two"' },
      },
    ],
  });
  assert.match(csv, /Name \[name\]/);
  assert.match(csv, /"'=2\+2"/);
  assert.match(csv, /"Line one\n""Line two"""/);
});
