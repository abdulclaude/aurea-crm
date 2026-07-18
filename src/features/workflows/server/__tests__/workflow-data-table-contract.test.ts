import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const readSource = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

const routerSource = readSource("src/features/workflows/server/routers.ts");
const tableSource = readSource(
  "src/features/workflows/components/workflow-data-table.tsx",
);
const toolbarSource = readSource(
  "src/features/workflows/components/workflow-table-toolbar.tsx",
);
const archivesPageSource = readSource(
  "src/app/(dashboard)/(rest)/archives/page.tsx",
);
const archivesContentSource = readSource(
  "src/features/workflows/components/workflow-archives-page-content.tsx",
);

describe("workflow data table contract", () => {
  it("keeps active, archived, and template datasets distinct", () => {
    assert.match(
      routerSource,
      /getArchived:[\s\S]*eq\(workflows\.isTemplate, false\)[\s\S]*eq\(workflows\.archived, true\)/,
    );
    assert.match(
      routerSource,
      /getMany:[\s\S]*eq\(workflows\.archived, false\)[\s\S]*eq\(workflows\.isTemplate, false\)/,
    );
  });

  it("supports server pagination, filtering, and sorting on both tables", () => {
    assert.match(tableSource, /pagination=\{\{/);
    assert.match(toolbarSource, /label: "Folder"/);
    assert.match(toolbarSource, /label: "Type"/);
    assert.match(toolbarSource, /sortOptions=\{SORT_OPTIONS\}/);
    assert.match(routerSource, /sort: workflowListSortSchema/);
    assert.match(routerSource, /folderId === "unfiled"/);
  });

  it("exposes archives as a first-class data-table route", () => {
    assert.match(archivesPageSource, /await requireAuth\(\)/);
    assert.match(
      archivesPageSource,
      /await prefetchWorkflows\(\{ \.\.\.params, view: "archived" \}\)/,
    );
    assert.match(archivesPageSource, /<HydrateClient>/);
    assert.match(archivesContentSource, /<WorkflowDataTable mode="archived"/);
    assert.match(archivesContentSource, /router\.push\("\/workflows"\)/);
  });
});
