import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertInvoiceAccessGrant,
  buildInvoiceCheckoutIdempotencyKey,
  InvoiceAccessValidationError,
  type InvoiceAccessGrant,
} from "../public-invoice-access";

const NOW = new Date("2026-07-13T12:00:00.000Z");

function grant(overrides: Partial<InvoiceAccessGrant> = {}): InvoiceAccessGrant {
  return {
    id: "grant-a",
    invoiceId: "invoice-a",
    organizationId: "org-a",
    locationId: "location-a",
    purpose: "PAY",
    expiresAt: new Date("2026-08-13T12:00:00.000Z"),
    revokedAt: null,
    ...overrides,
  };
}

function assertAccessError(
  expectedCode: InvoiceAccessValidationError["code"],
  run: () => void,
): void {
  assert.throws(run, (error: unknown) => {
    return (
      error instanceof InvoiceAccessValidationError && error.code === expectedCode
    );
  });
}

describe("public invoice access grants", () => {
  it("rejects a token issued for the wrong purpose", () => {
    assertAccessError("WRONG_PURPOSE", () =>
      assertInvoiceAccessGrant({
        grant: grant({ purpose: "VIEW" }),
        requiredPurpose: "PAY",
        invoiceOrganizationId: "org-a",
        invoiceLocationId: "location-a",
        now: NOW,
      }),
    );
  });

  it("rejects an expired token", () => {
    assertAccessError("EXPIRED", () =>
      assertInvoiceAccessGrant({
        grant: grant({ expiresAt: NOW }),
        requiredPurpose: "PAY",
        invoiceOrganizationId: "org-a",
        invoiceLocationId: "location-a",
        now: NOW,
      }),
    );
  });

  it("rejects a revoked token", () => {
    assertAccessError("REVOKED", () =>
      assertInvoiceAccessGrant({
        grant: grant({ revokedAt: new Date("2026-07-13T11:00:00.000Z") }),
        requiredPurpose: "PAY",
        invoiceOrganizationId: "org-a",
        invoiceLocationId: "location-a",
        now: NOW,
      }),
    );
  });

  it("rejects a grant whose duplicated scope does not match the invoice", () => {
    assertAccessError("SCOPE_MISMATCH", () =>
      assertInvoiceAccessGrant({
        grant: grant({ organizationId: "org-b" }),
        requiredPurpose: "PAY",
        invoiceOrganizationId: "org-a",
        invoiceLocationId: "location-a",
        now: NOW,
      }),
    );
  });

  it("allows reuse without changing the stable checkout operation key", () => {
    const reusableGrant = grant();
    const validate = (): void =>
      assertInvoiceAccessGrant({
        grant: reusableGrant,
        requiredPurpose: "PAY",
        invoiceOrganizationId: "org-a",
        invoiceLocationId: "location-a",
        now: NOW,
      });

    assert.doesNotThrow(validate);
    assert.doesNotThrow(validate);

    const first = buildInvoiceCheckoutIdempotencyKey({
      grantId: reusableGrant.id,
      invoiceId: reusableGrant.invoiceId,
      providerAccountId: "acct_a",
      amountMinor: 12500,
      currency: "gbp",
    });
    const second = buildInvoiceCheckoutIdempotencyKey({
      grantId: reusableGrant.id,
      invoiceId: reusableGrant.invoiceId,
      providerAccountId: "acct_a",
      amountMinor: 12500,
      currency: "GBP",
    });

    assert.equal(first, second);
  });
});
