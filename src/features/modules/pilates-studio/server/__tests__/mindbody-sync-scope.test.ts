import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { assertMindbodySyncScope } from "../mindbody-sync-scope";

const syncSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/modules/pilates-studio/server/sync.ts",
  ),
  "utf8",
);

describe("Mindbody sync scope", () => {
  it("derives the authoritative scope from the connected app", () => {
    assert.deepEqual(
      assertMindbodySyncScope({
        organizationId: "org-a",
        locationId: "location-a",
      }),
      { organizationId: "org-a", locationId: "location-a" },
    );

    assert.deepEqual(
      assertMindbodySyncScope({
        organizationId: "org-a",
        locationId: null,
      }),
      { organizationId: "org-a", locationId: null },
    );
  });

  it("rejects organization and location overrides", () => {
    assert.throws(
      () =>
        assertMindbodySyncScope(
          { organizationId: "org-a", locationId: "location-a" },
          { organizationId: "org-b" },
        ),
      /organization does not match/,
    );
    assert.throws(
      () =>
        assertMindbodySyncScope(
          { organizationId: "org-a", locationId: "location-a" },
          { locationId: "location-b" },
        ),
      /location does not match/,
    );
  });

  it("scopes booking identity through both class and client ownership", () => {
    assert.match(
      syncSource,
      /\.innerJoin\(studioClass, eq\(studioClass\.id, studioBooking\.classId\)\)/,
    );
    assert.match(
      syncSource,
      /\.innerJoin\(client, eq\(client\.id, studioBooking\.clientId\)\)/,
    );
    assert.match(
      syncSource,
      /eq\(studioClass\.organizationId, scope\.organizationId\)/,
    );
    assert.match(
      syncSource,
      /eq\(client\.organizationId, scope\.organizationId\)/,
    );
  });

  it("matches clients by scoped Mindbody identity before email", () => {
    assert.match(syncSource, /eq\(client\.mindbodyId, mindbodyClient\.Id\)/);
    assert.match(syncSource, /client\.metadata} -> 'mindbody' ->> 'id'/);
    assert.match(syncSource, /externalMatches\[0\] \?\? emailMatch/);
    assert.match(syncSource, /already assigned to a different Mindbody client/);
  });

  it("persists membership ownership and exact location scope", () => {
    assert.match(
      syncSource,
      /\.innerJoin\(client, eq\(client\.id, studioMembership\.clientId\)\)/,
    );
    assert.match(
      syncSource,
      /eq\(client\.organizationId, scope\.organizationId\)/,
    );
    assert.match(syncSource, /organizationId: scope\.organizationId/);
    assert.match(syncSource, /locationId: scope\.locationId/);
    assert.match(syncSource, /conflicting organization ownership/);
    assert.match(syncSource, /conflicting location ownership/);
    assert.match(syncSource, /changed ownership during sync/);
  });
});
