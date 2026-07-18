import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { commerceResourceScopeMatches } from "../resource-scope";

describe("commerceResourceScopeMatches", () => {
  it("matches a resource and operation in the same organization and location", () => {
    assert.equal(
      commerceResourceScopeMatches(
        { organizationId: "org-a", locationId: "location-a" },
        { organizationId: "org-a", locationId: "location-a" },
      ),
      true,
    );
  });

  it("rejects a different organization or location", () => {
    assert.equal(
      commerceResourceScopeMatches(
        { organizationId: "org-a", locationId: "location-a" },
        { organizationId: "org-b", locationId: "location-a" },
      ),
      false,
    );
    assert.equal(
      commerceResourceScopeMatches(
        { organizationId: "org-a", locationId: "location-a" },
        { organizationId: "org-a", locationId: "location-b" },
      ),
      false,
    );
  });

  it("treats null as organization-level scope rather than a wildcard", () => {
    assert.equal(
      commerceResourceScopeMatches(
        { organizationId: "org-a", locationId: null },
        { organizationId: "org-a", locationId: null },
      ),
      true,
    );
    assert.equal(
      commerceResourceScopeMatches(
        { organizationId: "org-a", locationId: null },
        { organizationId: "org-a", locationId: "location-a" },
      ),
      false,
    );
    assert.equal(
      commerceResourceScopeMatches(
        { organizationId: "org-a", locationId: "location-a" },
        { organizationId: "org-a", locationId: null },
      ),
      false,
    );
  });
});
