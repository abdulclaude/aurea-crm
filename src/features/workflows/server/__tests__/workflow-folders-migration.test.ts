import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  path.join(process.cwd(), "drizzle/0065_workflow_folders.sql"),
  "utf8",
);

describe("workflow folders migration", () => {
  it("owns folders by exact tenant and user scope", () => {
    assert.match(migration, /"organizationId" text NOT NULL/);
    assert.match(migration, /"locationId" text/);
    assert.match(migration, /"userId" text NOT NULL/);
    assert.match(migration, /WorkflowFolder_scope_position_idx/);
  });

  it("unfiles workflows safely when a folder is deleted", () => {
    assert.match(migration, /ALTER TABLE "Workflows" ADD COLUMN "folderId" text/);
    assert.match(
      migration,
      /Workflows_folderId_fkey[\s\S]*ON DELETE set null ON UPDATE cascade/,
    );
    assert.match(migration, /Workflows_folderId_idx/);
  });
});
