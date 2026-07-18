import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

describe("staff settings migration integrity", () => {
  const migration = readFileSync(
    path.join(process.cwd(), "drizzle/0084_staff_settings_foundation.sql"),
    "utf8",
  );

  it("protects current-version pointers at the database boundary", () => {
    assert.match(migration, /enforce_staff_settings_current_version/);
    assert.match(migration, /cannot be reset to zero/);
    assert.match(migration, /DEFERRABLE INITIALLY DEFERRED/);
    assert.match(migration, /IS NOT DISTINCT FROM NEW\."locationId"/);
  });

  it("prevents instructors from moving away from active compensation", () => {
    assert.match(migration, /Instructor_compensation_scope_protect/);
    assert.match(migration, /active compensation cannot move/);
  });
});
