import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateTaxedMinorAmount,
  resolveTaxAssignmentsForScope,
  type TaxAssignmentRow,
} from "../tax-runtime-policy";

function assignment(
  overrides: Partial<TaxAssignmentRow> = {},
): TaxAssignmentRow {
  return {
    organizationId: "org-1",
    locationId: "location-a",
    assignmentId: "assignment-1",
    subjectType: "LINE_TYPE",
    lineType: "RETAIL",
    productId: null,
    taxRateId: "tax-standard",
    taxRateName: "Standard",
    taxRateCode: "STANDARD",
    rateBasisPoints: 2_000,
    taxRateKind: "EXCLUSIVE",
    ...overrides,
  };
}

describe("commerce tax runtime resolver", () => {
  it("keeps location scopes isolated and gives product assignments precedence", () => {
    const rows: TaxAssignmentRow[] = [
      assignment(),
      assignment({
        assignmentId: "product-no-tax",
        subjectType: "PRODUCT",
        lineType: null,
        productId: "product-1",
        taxRateId: null,
        taxRateName: null,
        taxRateCode: null,
        rateBasisPoints: null,
        taxRateKind: null,
      }),
      assignment({
        locationId: "location-b",
        assignmentId: "location-b-retail",
        taxRateId: "tax-reduced",
        taxRateCode: "REDUCED",
        taxRateName: "Reduced",
        rateBasisPoints: 500,
        taxRateKind: "INCLUSIVE",
      }),
    ];

    const locationA = resolveTaxAssignmentsForScope(
      { organizationId: "org-1", locationId: "location-a" },
      [{ lineType: "RETAIL", productId: "product-1" }, { lineType: "RETAIL" }],
      rows,
    );
    const locationB = resolveTaxAssignmentsForScope(
      { organizationId: "org-1", locationId: "location-b" },
      [{ lineType: "RETAIL" }],
      rows,
    );

    assert.equal(locationA[0]?.source, "PRODUCT");
    assert.equal(locationA[0]?.rateBasisPoints, 0);
    assert.equal(locationA[1]?.taxRateId, "tax-standard");
    assert.equal(locationB[0]?.taxRateId, "tax-reduced");
    assert.equal(locationB[0]?.kind, "INCLUSIVE");
  });

  it("returns immutable historical values instead of live row references", () => {
    const row = assignment();
    const [snapshot] = resolveTaxAssignmentsForScope(
      { organizationId: "org-1", locationId: "location-a" },
      [{ lineType: "RETAIL" }],
      [row],
    );

    row.taxRateCode = "CHANGED";
    row.rateBasisPoints = 1_000;

    assert.equal(snapshot?.code, "STANDARD");
    assert.equal(snapshot?.rateBasisPoints, 2_000);
  });

  it("calculates exclusive and inclusive tax using minor units", () => {
    const exclusive = calculateTaxedMinorAmount({
      enteredAmountMinor: 10_00,
      tax: {
        assignmentId: "assignment-1",
        taxRateId: "tax-standard",
        code: "STANDARD",
        name: "Standard",
        rateBasisPoints: 2_000,
        kind: "EXCLUSIVE",
        source: "LINE_TYPE",
        overrideReason: null,
      },
    });
    const inclusive = calculateTaxedMinorAmount({
      enteredAmountMinor: 12_00,
      tax: {
        assignmentId: "assignment-1",
        taxRateId: "tax-standard",
        code: "STANDARD",
        name: "Standard",
        rateBasisPoints: 2_000,
        kind: "INCLUSIVE",
        source: "LINE_TYPE",
        overrideReason: null,
      },
    });

    assert.deepEqual(exclusive, {
      subtotalMinor: 10_00,
      taxMinor: 2_00,
      totalMinor: 12_00,
    });
    assert.deepEqual(inclusive, {
      subtotalMinor: 10_00,
      taxMinor: 2_00,
      totalMinor: 12_00,
    });
  });
});
