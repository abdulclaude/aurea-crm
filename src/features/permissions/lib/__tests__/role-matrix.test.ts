import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LocationMemberRole as DatabaseLocationRole,
  OrganizationMemberRole as DatabaseOrganizationRole,
} from "@/db/enums";

import {
  CAPABILITY_REGISTRY,
  CAPABILITY_VALUES,
  capabilitySchema,
  type Capability,
} from "../../capabilities";
import {
  LOCATION_ROLE_CAPABILITIES,
  LOCATION_ROLE_VALUES,
  ORGANIZATION_ROLE_CAPABILITIES,
  ORGANIZATION_ROLE_VALUES,
  organizationRoleHasCapability,
  resolveRoleCapabilities,
  type LocationRole,
  type OrganizationRole,
} from "../../role-matrix";

describe("organization capability matrix", () => {
  const cases: Array<{
    role: OrganizationRole;
    granted: readonly Capability[];
    denied: readonly Capability[];
  }> = [
    {
      role: "owner",
      granted: CAPABILITY_VALUES,
      denied: [],
    },
    {
      role: "admin",
      granted: [
        "provider.manage",
        "demo.manage",
        "workflow.manage",
        "settings.manage",
      ],
      denied: ["commerce.manage", "commerce.reconcile"],
    },
    {
      role: "manager",
      granted: [
        "messaging.send",
        "messaging.assign",
        "customer.manage",
        "schedule.manage",
        "attendance.manage",
        "reports.export",
        "privacy.export",
      ],
      denied: [
        "provider.manage",
        "demo.manage",
        "team.manage",
        "workflow.manage",
        "messaging.manage",
        "privacy.erase",
      ],
    },
    {
      role: "staff",
      granted: [],
      denied: CAPABILITY_VALUES,
    },
    {
      role: "viewer",
      granted: ["commerce.view", "reports.view", "customer.view"],
      denied: [
        "commerce.manage",
        "messaging.send",
        "messaging.assign",
        "schedule.manage",
        "reports.export",
        "attendance.manage",
      ],
    },
  ];

  for (const testCase of cases) {
    it(`${testCase.role} grants only its explicit organization capabilities`, () => {
      const capabilities = resolveRoleCapabilities({
        organizationRole: testCase.role,
        locationRole: null,
      });

      for (const capability of testCase.granted) {
        assert.ok(capabilities.includes(capability));
      }
      for (const capability of testCase.denied) {
        assert.ok(!capabilities.includes(capability));
      }
    });
  }
});

describe("location capability matrix", () => {
  const cases: Array<{
    role: LocationRole;
    granted: readonly Capability[];
    denied: readonly Capability[];
  }> = [
    { role: "AGENCY", granted: CAPABILITY_VALUES, denied: [] },
    { role: "ADMIN", granted: CAPABILITY_VALUES, denied: [] },
    {
      role: "MANAGER",
      granted: [
        "messaging.send",
        "messaging.assign",
        "customer.manage",
        "schedule.manage",
        "attendance.manage",
        "reports.export",
        "privacy.export",
      ],
      denied: [
        "provider.manage",
        "demo.manage",
        "team.manage",
        "settings.manage",
        "messaging.manage",
        "privacy.erase",
      ],
    },
    {
      role: "STANDARD",
      granted: [
        "team.view",
        "customer.view",
        "schedule.view",
        "attendance.manage",
      ],
      denied: [
        "demo.manage",
        "messaging.send",
        "customer.manage",
        "schedule.manage",
      ],
    },
    {
      role: "LIMITED",
      granted: ["messaging.send", "customer.view", "schedule.view"],
      denied: [
        "commerce.view",
        "demo.manage",
        "customer.manage",
        "schedule.manage",
        "attendance.manage",
      ],
    },
    {
      role: "VIEWER",
      granted: ["commerce.view", "reports.view", "settings.view"],
      denied: [
        "commerce.manage",
        "demo.manage",
        "messaging.send",
        "settings.manage",
        "reports.export",
        "attendance.manage",
      ],
    },
  ];

  for (const testCase of cases) {
    it(`${testCase.role} grants only its explicit location capabilities`, () => {
      const capabilities = resolveRoleCapabilities({
        organizationRole: null,
        locationRole: testCase.role,
      });

      for (const capability of testCase.granted) {
        assert.ok(capabilities.includes(capability));
      }
      for (const capability of testCase.denied) {
        assert.ok(!capabilities.includes(capability));
      }
    });
  }
});

describe("capability registry invariants", () => {
  it("rejects unregistered capability strings at runtime", () => {
    assert.equal(capabilitySchema.safeParse("commerce.delete").success, false);
    assert.deepEqual(Object.keys(CAPABILITY_REGISTRY), [...CAPABILITY_VALUES]);
  });

  it("covers every current database role exactly once", () => {
    assert.deepEqual(
      [...ORGANIZATION_ROLE_VALUES].sort(),
      Object.values(DatabaseOrganizationRole).sort(),
    );
    assert.deepEqual(
      [...LOCATION_ROLE_VALUES].sort(),
      Object.values(DatabaseLocationRole).sort(),
    );
    assert.deepEqual(Object.keys(ORGANIZATION_ROLE_CAPABILITIES), [
      ...ORGANIZATION_ROLE_VALUES,
    ]);
    assert.deepEqual(Object.keys(LOCATION_ROLE_CAPABILITIES), [
      ...LOCATION_ROLE_VALUES,
    ]);
  });

  it("does not grant a capability when no role is present", () => {
    assert.deepEqual(
      resolveRoleCapabilities({ organizationRole: null, locationRole: null }),
      [],
    );
  });

  it("unions independent organization and location grants without duplicates", () => {
    const capabilities = resolveRoleCapabilities({
      organizationRole: "viewer",
      locationRole: "LIMITED",
    });

    assert.equal(capabilities.length, new Set(capabilities).size);
    assert.ok(capabilities.includes("reports.view"));
    assert.ok(capabilities.includes("messaging.send"));
    assert.ok(!capabilities.includes("settings.manage"));
  });

  it("does not promote a location administrator to organization management", () => {
    const locationCapabilities = resolveRoleCapabilities({
      organizationRole: null,
      locationRole: "ADMIN",
    });
    assert.ok(locationCapabilities.includes("provider.manage"));
    assert.equal(organizationRoleHasCapability(null, "provider.manage"), false);
    assert.equal(
      organizationRoleHasCapability("admin", "provider.manage"),
      true,
    );
  });
});
