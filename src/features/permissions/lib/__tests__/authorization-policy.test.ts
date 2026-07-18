import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluateCapabilityAccess,
  type ActorCapabilitySnapshot,
} from "../../authorization-policy";

function actor(
  overrides: Partial<ActorCapabilitySnapshot> = {},
): ActorCapabilitySnapshot {
  return {
    organizationId: "org-a",
    locationId: "location-a",
    organizationRole: null,
    locationRole: "ADMIN",
    capabilities: ["customer.view", "customer.manage"],
    ...overrides,
  };
}

describe("evaluateCapabilityAccess", () => {
  it("denies an actor without an active organization", () => {
    assert.deepEqual(
      evaluateCapabilityAccess({
        actor: actor({ organizationId: null, locationId: null }),
        capability: "customer.view",
      }),
      { allowed: false, reason: "NO_ACTIVE_ORGANIZATION" },
    );
  });

  it("denies a resource from another organization", () => {
    assert.deepEqual(
      evaluateCapabilityAccess({
        actor: actor(),
        capability: "customer.view",
        resource: { organizationId: "org-b", locationId: "location-a" },
      }),
      { allowed: false, reason: "TENANT_SCOPE_MISMATCH" },
    );
  });

  it("denies another location while a location context is active", () => {
    assert.deepEqual(
      evaluateCapabilityAccess({
        actor: actor(),
        capability: "customer.view",
        resource: { organizationId: "org-a", locationId: "location-b" },
      }),
      { allowed: false, reason: "LOCATION_SCOPE_MISMATCH" },
    );
  });

  it("denies an organization-level resource from a location-only context", () => {
    assert.deepEqual(
      evaluateCapabilityAccess({
        actor: actor(),
        capability: "customer.view",
        resource: { organizationId: "org-a", locationId: null },
      }),
      { allowed: false, reason: "LOCATION_SCOPE_MISMATCH" },
    );
  });

  it("allows an organization member to authorize a same-tenant location resource", () => {
    assert.deepEqual(
      evaluateCapabilityAccess({
        actor: actor({
          locationId: null,
          organizationRole: "admin",
          locationRole: null,
        }),
        capability: "customer.manage",
        resource: { organizationId: "org-a", locationId: "location-b" },
      }),
      { allowed: true },
    );
  });

  it("denies an actor whose memberships grant no capabilities", () => {
    assert.deepEqual(
      evaluateCapabilityAccess({
        actor: actor({
          organizationRole: null,
          locationRole: null,
          capabilities: [],
        }),
        capability: "customer.view",
      }),
      { allowed: false, reason: "NO_MEMBERSHIP" },
    );
  });

  it("denies a capability that is not explicitly granted", () => {
    assert.deepEqual(
      evaluateCapabilityAccess({
        actor: actor(),
        capability: "commerce.reconcile",
      }),
      { allowed: false, reason: "CAPABILITY_NOT_GRANTED" },
    );
  });

  it("allows a granted capability in the exact active tenant and location", () => {
    assert.deepEqual(
      evaluateCapabilityAccess({
        actor: actor(),
        capability: "customer.manage",
        resource: { organizationId: "org-a", locationId: "location-a" },
      }),
      { allowed: true },
    );
  });
});
