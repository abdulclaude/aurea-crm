import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TRPCError } from "@trpc/server";

import { assertInvoiceScopeAccess } from "../invoice-scope";

function assertNotFound(run: () => void): void {
  assert.throws(run, (error: unknown) => {
    return error instanceof TRPCError && error.code === "NOT_FOUND";
  });
}

describe("assertInvoiceScopeAccess", () => {
  it("rejects an invoice from another organization even when the location matches", () => {
    assertNotFound(() =>
      assertInvoiceScopeAccess(
        { organizationId: "org-b", locationId: "location-a" },
        { organizationId: "org-a", locationId: "location-a" },
      ),
    );
  });

  it("rejects access when there is no active organization", () => {
    assertNotFound(() =>
      assertInvoiceScopeAccess(
        { organizationId: "org-a", locationId: null },
        { organizationId: null, locationId: null },
      ),
    );
  });

  it("rejects a same-organization invoice from another active location", () => {
    assertNotFound(() =>
      assertInvoiceScopeAccess(
        { organizationId: "org-a", locationId: "location-b" },
        { organizationId: "org-a", locationId: "location-a" },
      ),
    );
  });

  it("rejects an organization-level invoice while a location is active", () => {
    assertNotFound(() =>
      assertInvoiceScopeAccess(
        { organizationId: "org-a", locationId: null },
        { organizationId: "org-a", locationId: "location-a" },
      ),
    );
  });

  it("allows an invoice in the active organization and location", () => {
    assert.doesNotThrow(() =>
      assertInvoiceScopeAccess(
        { organizationId: "org-a", locationId: "location-a" },
        { organizationId: "org-a", locationId: "location-a" },
      ),
    );
  });

  it("allows organization-level access to a location-scoped invoice", () => {
    assert.doesNotThrow(() =>
      assertInvoiceScopeAccess(
        { organizationId: "org-a", locationId: "location-a" },
        { organizationId: "org-a", locationId: null },
      ),
    );
  });

  it("allows organization-level access to an organization-level invoice", () => {
    assert.doesNotThrow(() =>
      assertInvoiceScopeAccess(
        { organizationId: "org-a", locationId: null },
        { organizationId: "org-a", locationId: null },
      ),
    );
  });
});
