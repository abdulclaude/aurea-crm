import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const migration = readFileSync(
  path.join(process.cwd(), "drizzle/0047_workflow_draft_default.sql"),
  "utf8",
);

describe("workflow draft default migration", () => {
  it("makes newly inserted workflows inactive without changing existing rows", () => {
    assert.match(
      migration,
      /ALTER TABLE "Workflows" ALTER COLUMN "archived" SET DEFAULT true;/,
    );
    assert.doesNotMatch(migration, /UPDATE "Workflows"/);
  });
});
