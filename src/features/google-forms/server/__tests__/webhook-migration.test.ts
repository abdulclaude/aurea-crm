import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "drizzle/0049_disable_unsigned_google_form_workflows.sql",
  ),
  "utf8",
);

describe("unsigned Google Form workflow migration", () => {
  it("only deactivates active non-template Google Form workflows without a secret", () => {
    assert.match(migration, /SET[\s\S]*archived = true/);
    assert.match(migration, /workflow\."isTemplate" = false/);
    assert.match(migration, /workflow\.archived = false/);
    assert.match(migration, /node\.type = 'GOOGLE_FORM_TRIGGER'/);
    assert.match(migration, /LENGTH\(COALESCE\(BTRIM\(node\.data ->> 'webhookSecret'/);
    assert.doesNotMatch(migration, /DELETE FROM/);
  });
});
