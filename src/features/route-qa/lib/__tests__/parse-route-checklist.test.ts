import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parseRouteChecklist } from "@/features/route-qa/lib/parse-route-checklist";

test("parses every route worksheet item in onboarding order", () => {
  const markdown = readFileSync(
    join(process.cwd(), "docs", "QA_ROUTE_CHECKLIST.md"),
    "utf8",
  );
  const checklist = parseRouteChecklist(markdown);
  const items = checklist.stages.flatMap((stage) =>
    stage.sections.flatMap((section) => section.items),
  );

  assert.equal(checklist.updatedAt, "2026-07-18");
  assert.equal(items.length, 303);
  assert.equal(items[0]?.route, "/");
  assert.ok(items.some((item) => item.route === "/location/new"));
  assert.ok(items.some((item) => item.route === "/settings/cancellations"));
  assert.ok(items.some((item) => item.route === "/settings/communications"));
  assert.ok(items.some((item) => item.route === "/settings/content"));
  assert.ok(items.some((item) => item.route === "/settings/integrations"));
  assert.ok(items.some((item) => item.route === "/settings/commerce/[section]"));
  assert.ok(items.some((item) => item.route === "/settings/payments/recovery"));
  assert.ok(items.some((item) => item.route === "/recover-payment/[token]"));
  assert.ok(
    items.some((item) => item.route === "/reports/inventory/inventory-age"),
  );
  assert.ok(items.some((item) => item.route === "/api/webhooks/stripe"));
  assert.ok(
    items.some((item) => item.route === "/api/webhooks/twilio/sms/inbound"),
  );
  assert.ok(!items.some((item) => item.route === "/studio/memberships"));
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
});

test("keeps route IDs stable when test copy changes", () => {
  const first = parseRouteChecklist(`
Current as of 2026-07-15.
## Stage 1: Setup
### Entry
| Status | Route | Test | Expected |
|---|---|---|---|
| - [ ] | \`/dashboard\` | Original test | Original result |
`);
  const second = parseRouteChecklist(`
Current as of 2026-07-15.
## Stage 1: Setup
### Entry
| Status | Route | Test | Expected |
|---|---|---|---|
| - [ ] | \`/dashboard\` | Revised test | Revised result |
`);

  assert.equal(
    first.stages[0]?.sections[0]?.items[0]?.id,
    second.stages[0]?.sections[0]?.items[0]?.id,
  );
});
