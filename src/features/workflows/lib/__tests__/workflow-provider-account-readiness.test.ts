import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getWorkflowProviderAccountReadiness,
  isWorkflowProviderAccountAvailableToScope,
} from "../workflow-provider-account-readiness";

const locationScope = {
  organizationId: "org-a",
  locationId: "location-a",
};

describe("workflow provider account scope and readiness", () => {
  it("only admits exact location accounts or explicitly inherited org accounts", () => {
    assert.equal(
      isWorkflowProviderAccountAvailableToScope(
        { ...locationScope, inheritToLocations: false },
        locationScope,
      ),
      true,
    );
    assert.equal(
      isWorkflowProviderAccountAvailableToScope(
        {
          organizationId: "org-a",
          locationId: null,
          inheritToLocations: false,
        },
        locationScope,
      ),
      false,
    );
    assert.equal(
      isWorkflowProviderAccountAvailableToScope(
        {
          organizationId: "org-a",
          locationId: null,
          inheritToLocations: true,
        },
        locationScope,
      ),
      true,
    );
    assert.equal(
      isWorkflowProviderAccountAvailableToScope(
        {
          organizationId: "org-b",
          locationId: "location-a",
          inheritToLocations: true,
        },
        locationScope,
      ),
      false,
    );
  });

  it("requires an active account, OAuth grant, and every required scope", () => {
    const requiredScopes = ["mail.read", "mail.send"];
    assert.deepEqual(
      getWorkflowProviderAccountReadiness(
        { status: "ACTIVE", grantedScopes: requiredScopes },
        requiredScopes,
      ),
      { status: "READY", ready: true, missingScopes: [] },
    );
    assert.deepEqual(
      getWorkflowProviderAccountReadiness(
        { status: "DISCONNECTED", grantedScopes: requiredScopes },
        requiredScopes,
      ),
      { status: "INACTIVE", ready: false, missingScopes: [] },
    );
    assert.deepEqual(
      getWorkflowProviderAccountReadiness(
        { status: "ACTIVE", grantedScopes: null },
        requiredScopes,
      ),
      {
        status: "MISSING_GRANT",
        ready: false,
        missingScopes: requiredScopes,
      },
    );
    assert.deepEqual(
      getWorkflowProviderAccountReadiness(
        { status: "ACTIVE", grantedScopes: ["mail.read"] },
        requiredScopes,
      ),
      {
        status: "MISSING_SCOPES",
        ready: false,
        missingScopes: ["mail.send"],
      },
    );
  });
});
