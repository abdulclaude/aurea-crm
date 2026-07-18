import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { commerceTaxAssignment, commerceTaxRate } from "@/db/schema";
import type { CommerceSettingsScope } from "@/features/commerce-settings/server/access";

import { inCommerceSettingsScope } from "./model";
import {
  resolveTaxAssignmentsForScope,
  type TaxRateSnapshot,
  type TaxableInvoiceLine,
} from "./tax-runtime-policy";

export {
  calculateTaxedMinorAmount,
  manualTaxSnapshot,
  type CommerceLineType,
  type TaxAssignmentRow,
  type TaxRateSnapshot,
} from "./tax-runtime-policy";

export async function resolveTaxForInvoiceLines(input: {
  scope: CommerceSettingsScope;
  lines: TaxableInvoiceLine[];
}): Promise<TaxRateSnapshot[]> {
  const rows = await db
    .select({
      organizationId: commerceTaxAssignment.organizationId,
      locationId: commerceTaxAssignment.locationId,
      assignmentId: commerceTaxAssignment.id,
      subjectType: commerceTaxAssignment.subjectType,
      lineType: commerceTaxAssignment.lineType,
      productId: commerceTaxAssignment.productId,
      taxRateId: commerceTaxAssignment.taxRateId,
      taxRateName: commerceTaxRate.name,
      taxRateCode: commerceTaxRate.code,
      rateBasisPoints: commerceTaxRate.rateBasisPoints,
      taxRateKind: commerceTaxRate.kind,
    })
    .from(commerceTaxAssignment)
    .leftJoin(
      commerceTaxRate,
      and(
        eq(commerceTaxRate.id, commerceTaxAssignment.taxRateId),
        inCommerceSettingsScope(
          commerceTaxRate.organizationId,
          commerceTaxRate.locationId,
          input.scope,
        ),
        isNull(commerceTaxRate.archivedAt),
      ),
    )
    .where(
      and(
        inCommerceSettingsScope(
          commerceTaxAssignment.organizationId,
          commerceTaxAssignment.locationId,
          input.scope,
        ),
        isNull(commerceTaxAssignment.archivedAt),
      ),
    );
  return resolveTaxAssignmentsForScope(input.scope, input.lines, rows);
}
