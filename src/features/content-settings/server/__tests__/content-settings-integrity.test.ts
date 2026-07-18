import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = process.cwd();

test("content lifecycle stays scope-derived, locked, and append-only", async () => {
  const [access, service, router] = await Promise.all([
    readFile(`${ROOT}/src/features/content-settings/server/access.ts`, "utf8"),
    readFile(`${ROOT}/src/features/content-settings/server/content-service.ts`, "utf8"),
    readFile(`${ROOT}/src/features/content-settings/server/router.ts`, "utf8"),
  ]);

  assert.match(access, /ctx\.orgId/);
  assert.match(access, /ctx\.locationId/);
  assert.match(router, /"settings\.view"/);
  assert.match(router, /"settings\.manage"/);
  assert.doesNotMatch(router, /organizationId.*input/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /expectedVersion/);
  assert.match(service, /contentLibraryItemVersion\)\.values/);
  assert.doesNotMatch(service, /update\(contentLibraryItemVersion\)/);
});

test("runtime resolvers only join explicitly published versions", async () => {
  const runtime = await readFile(
    `${ROOT}/src/features/content-settings/server/runtime-resolver.ts`,
    "utf8",
  );
  assert.match(runtime, /contentLibraryItem\.publishedVersion/);
  assert.match(runtime, /isNull\(contentLibraryItem\.archivedAt\)/);
  assert.match(runtime, /resolvePublishedFaqCollection/);
  assert.match(runtime, /resolvePublishedPublicProfile/);
  assert.match(runtime, /resolveInternalTerminology/);
  assert.match(runtime, /listInternalMessageMacros/);
  assert.equal(
    runtime.match(/contentLibraryItemVersion\.locationId\} IS NOT DISTINCT FROM/g)
      ?.length,
    2,
  );
  assert.doesNotMatch(runtime, /currentVersion/);
});

test("content versions use an exact nullable parent scope", async () => {
  const migration = await readFile(
    `${ROOT}/drizzle/0087_content_library.sql`,
    "utf8",
  );
  assert.match(migration, /ContentLibraryItem_exact_scope_id_key/);
  assert.match(
    migration,
    /FOREIGN KEY \("organizationId", "scopeKey", "itemId"\)/,
  );
  assert.equal(migration.match(/GENERATED ALWAYS AS/g)?.length, 2);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|UPDATE "ContentLibraryItem"/);
});
