import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAnonymousProfileId } from "../anonymous-profile-identity";

describe("anonymous profile identity", () => {
  it("is stable within one exact tenant scope", () => {
    const scope = { organizationId: "org-a", locationId: "location-a" };
    assert.equal(
      buildAnonymousProfileId(scope, "visitor-1"),
      buildAnonymousProfileId(scope, "visitor-1"),
    );
  });

  it("cannot collide across organizations or locations", () => {
    const organizationA = buildAnonymousProfileId(
      { organizationId: "org-a", locationId: null },
      "visitor-1",
    );
    const organizationB = buildAnonymousProfileId(
      { organizationId: "org-b", locationId: null },
      "visitor-1",
    );
    const locationA = buildAnonymousProfileId(
      { organizationId: "org-a", locationId: "location-a" },
      "visitor-1",
    );
    assert.notEqual(organizationA, organizationB);
    assert.notEqual(organizationA, locationA);
    assert.notEqual(organizationB, locationA);
  });

  it("rejects empty and unbounded visitor identifiers", () => {
    assert.throws(() =>
      buildAnonymousProfileId(
        { organizationId: "org-a", locationId: null },
        " ",
      ),
    );
    assert.throws(() =>
      buildAnonymousProfileId(
        { organizationId: "org-a", locationId: null },
        "x".repeat(257),
      ),
    );
  });
});
