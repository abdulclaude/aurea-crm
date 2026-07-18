import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../../../drizzle/0037_scoped_tracking_identities.sql",
    import.meta.url,
  ),
  "utf8",
);

test("tracking identity migration uses canonical funnel scope", () => {
  assert.match(
    migration,
    /SELECT p\."id" AS profile_id, f\."organizationId", f\."locationId"/,
  );
  assert.match(migration, /Historical tracking location scope conflicts/);
  assert.match(migration, /FunnelSession_scope_guard/);
  assert.match(migration, /FunnelEvent_scope_guard/);
  assert.match(migration, /FunnelWebVital_scope_guard/);
});

test("telemetry quotas bind organization and funnel at the database boundary", () => {
  assert.match(migration, /Funnel_organizationId_id_key/);
  assert.match(
    migration,
    /FOREIGN KEY \("organizationId", "funnelId"\).*"Funnel"\("organizationId", "id"\)/,
  );
});
