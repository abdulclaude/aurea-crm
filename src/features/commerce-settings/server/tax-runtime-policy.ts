import type { CommerceSettingsScope } from "./access";

export type CommerceLineType =
  | "MEMBERSHIP"
  | "CLASS"
  | "ADD_ON"
  | "GIFT_CARD"
  | "RETAIL"
  | "OTHER";

export type TaxRateSnapshot = {
  assignmentId: string | null;
  taxRateId: string | null;
  code: string | null;
  name: string | null;
  rateBasisPoints: number;
  kind: "EXCLUSIVE" | "INCLUSIVE";
  source: "PRODUCT" | "LINE_TYPE" | "UNASSIGNED" | "MANUAL_OVERRIDE";
  overrideReason: string | null;
};

export type TaxableInvoiceLine = {
  productId?: string | null;
  lineType: CommerceLineType;
};

export type TaxAssignmentRow = {
  organizationId: string;
  locationId: string | null;
  assignmentId: string;
  subjectType: "LINE_TYPE" | "PRODUCT";
  lineType: CommerceLineType | null;
  productId: string | null;
  taxRateId: string | null;
  taxRateName: string | null;
  taxRateCode: string | null;
  rateBasisPoints: number | null;
  taxRateKind: "EXCLUSIVE" | "INCLUSIVE" | null;
};

const NO_TAX: TaxRateSnapshot = {
  assignmentId: null,
  taxRateId: null,
  code: null,
  name: null,
  rateBasisPoints: 0,
  kind: "EXCLUSIVE",
  source: "UNASSIGNED",
  overrideReason: null,
};

function snapshotFromAssignment(row: TaxAssignmentRow): TaxRateSnapshot {
  if (
    row.taxRateId === null ||
    row.rateBasisPoints === null ||
    row.taxRateKind === null
  ) {
    return {
      ...NO_TAX,
      assignmentId: row.assignmentId,
      source: row.subjectType,
    };
  }
  return {
    assignmentId: row.assignmentId,
    taxRateId: row.taxRateId,
    code: row.taxRateCode,
    name: row.taxRateName,
    rateBasisPoints: row.rateBasisPoints,
    kind: row.taxRateKind,
    source: row.subjectType,
    overrideReason: null,
  };
}

function resolveTaxAssignmentsFromRows(
  lines: TaxableInvoiceLine[],
  rows: TaxAssignmentRow[],
): TaxRateSnapshot[] {
  const productAssignments = new Map(
    rows
      .filter(
        (row): row is TaxAssignmentRow & { productId: string } =>
          row.subjectType === "PRODUCT" && row.productId !== null,
      )
      .map((row) => [row.productId, row]),
  );
  const lineTypeAssignments = new Map(
    rows
      .filter(
        (row): row is TaxAssignmentRow & { lineType: CommerceLineType } =>
          row.subjectType === "LINE_TYPE" && row.lineType !== null,
      )
      .map((row) => [row.lineType, row]),
  );
  return lines.map((line) => {
    const productAssignment = line.productId
      ? productAssignments.get(line.productId)
      : undefined;
    if (productAssignment) return snapshotFromAssignment(productAssignment);
    const lineTypeAssignment = lineTypeAssignments.get(line.lineType);
    return lineTypeAssignment
      ? snapshotFromAssignment(lineTypeAssignment)
      : { ...NO_TAX };
  });
}

export function resolveTaxAssignmentsForScope(
  scope: CommerceSettingsScope,
  lines: TaxableInvoiceLine[],
  rows: TaxAssignmentRow[],
): TaxRateSnapshot[] {
  return resolveTaxAssignmentsFromRows(
    lines,
    rows.filter(
      (row) =>
        row.organizationId === scope.organizationId &&
        row.locationId === scope.locationId,
    ),
  );
}

export function manualTaxSnapshot(input: {
  rateBasisPoints: number;
  kind: "EXCLUSIVE" | "INCLUSIVE";
  reason: string;
}): TaxRateSnapshot {
  return {
    assignmentId: null,
    taxRateId: null,
    code: "MANUAL",
    name: "Manual override",
    rateBasisPoints: input.rateBasisPoints,
    kind: input.kind,
    source: "MANUAL_OVERRIDE",
    overrideReason: input.reason,
  };
}

export function calculateTaxedMinorAmount(input: {
  enteredAmountMinor: number;
  tax: TaxRateSnapshot;
}): { subtotalMinor: number; taxMinor: number; totalMinor: number } {
  const { enteredAmountMinor, tax } = input;
  if (!Number.isSafeInteger(enteredAmountMinor) || enteredAmountMinor < 0) {
    throw new Error("Invoice line amount must be non-negative minor units.");
  }
  if (tax.rateBasisPoints === 0) {
    return {
      subtotalMinor: enteredAmountMinor,
      taxMinor: 0,
      totalMinor: enteredAmountMinor,
    };
  }
  if (tax.kind === "INCLUSIVE") {
    const taxMinor = Math.round(
      (enteredAmountMinor * tax.rateBasisPoints) /
        (10_000 + tax.rateBasisPoints),
    );
    return {
      subtotalMinor: enteredAmountMinor - taxMinor,
      taxMinor,
      totalMinor: enteredAmountMinor,
    };
  }
  const taxMinor = Math.round(
    (enteredAmountMinor * tax.rateBasisPoints) / 10_000,
  );
  return {
    subtotalMinor: enteredAmountMinor,
    taxMinor,
    totalMinor: enteredAmountMinor + taxMinor,
  };
}
