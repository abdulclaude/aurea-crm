import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migration = readFileSync(
  path.join(process.cwd(), "drizzle/0039_scoped_widgets.sql"),
  "utf8",
);

test("scoped widget migration adds composite tenant integrity", () => {
  assert.match(migration, /WidgetConfig_organizationId_locationId_fkey/);
  assert.match(migration, /PublicationTarget_organizationId_locationId_fkey/);
  assert.match(migration, /PublicationTarget_widget_scope_guard/);
  assert.match(migration, /WidgetConfig_published_scope_guard/);
  assert.match(migration, /IS NOT DISTINCT FROM NEW\."locationId"/);
});

test("scoped widget backfill rejects ambiguous and invalid publications", () => {
  assert.match(migration, /dangling or belongs to another organization/);
  assert.match(migration, /published in more than one organization\/location scope/);
  assert.match(migration, /non-canonical source key/);
  assert.match(migration, /COUNT\(DISTINCT COALESCE/);
  const backfill = migration.match(
    /UPDATE "WidgetConfig" widget[\s\S]+?CREATE INDEX/,
  );
  assert.ok(backfill);
  assert.doesNotMatch(backfill[0], /status" <> 'ARCHIVED'/);
  assert.match(backfill[0], /INNER JOIN "WidgetConfig" existing_widget/);
});
