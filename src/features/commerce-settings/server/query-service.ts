import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  commerceDocumentDefaults,
  commerceGuestPassPolicyVersion,
  commerceOfflinePaymentMethod,
  commerceRevenueCategory,
  commerceTaxAssignment,
  commerceTaxRate,
  studioProduct,
} from "@/db/schema";
import { guestPassPolicyValuesSchema } from "@/features/commerce-settings/contracts";

import type { CommerceSettingsScope } from "./access";
import { inCommerceSettingsScope } from "./model";

export async function getCommerceSettings(
  scope: CommerceSettingsScope,
): Promise<{
  taxRates: Array<typeof commerceTaxRate.$inferSelect>;
  taxAssignments: Array<{
    id: string;
    subjectType: string;
    lineType: string | null;
    productId: string | null;
    productName: string | null;
    taxRateId: string | null;
    taxRateName: string | null;
    archivedAt: Date | null;
  }>;
  products: Array<{ id: string; name: string }>;
  revenueCategories: Array<typeof commerceRevenueCategory.$inferSelect>;
  offlinePaymentMethods: Array<
    typeof commerceOfflinePaymentMethod.$inferSelect
  >;
  documentDefaults: typeof commerceDocumentDefaults.$inferSelect | null;
  activeGuestPassPolicy: {
    id: string;
    version: number;
    values: ReturnType<typeof guestPassPolicyValuesSchema.parse>;
    changeNote: string | null;
    createdAt: Date;
  } | null;
  guestPassPolicyHistory: Array<{
    id: string;
    version: number;
    values: ReturnType<typeof guestPassPolicyValuesSchema.parse>;
    isActive: boolean;
    changeNote: string | null;
    createdAt: Date;
  }>;
  readiness: {
    tax: "READY" | "INCOMPLETE";
    revenueMapping: "REFERENCE_ONLY" | "NOT_CONFIGURED";
    offlinePayments: "READY" | "NOT_CONFIGURED";
    documents: "READY" | "INCOMPLETE";
    guestPasses: "READY" | "NOT_CONFIGURED";
  };
}> {
  const scopedTaxRate = inCommerceSettingsScope(
    commerceTaxRate.organizationId,
    commerceTaxRate.locationId,
    scope,
  );
  const scopedAssignment = inCommerceSettingsScope(
    commerceTaxAssignment.organizationId,
    commerceTaxAssignment.locationId,
    scope,
  );
  const scopedCategory = inCommerceSettingsScope(
    commerceRevenueCategory.organizationId,
    commerceRevenueCategory.locationId,
    scope,
  );
  const scopedOfflineMethod = inCommerceSettingsScope(
    commerceOfflinePaymentMethod.organizationId,
    commerceOfflinePaymentMethod.locationId,
    scope,
  );
  const scopedDocuments = inCommerceSettingsScope(
    commerceDocumentDefaults.organizationId,
    commerceDocumentDefaults.locationId,
    scope,
  );
  const scopedPolicy = inCommerceSettingsScope(
    commerceGuestPassPolicyVersion.organizationId,
    commerceGuestPassPolicyVersion.locationId,
    scope,
  );

  const [
    taxRates,
    assignments,
    products,
    revenueCategories,
    offlinePaymentMethods,
    documentRows,
    policyRows,
  ] = await Promise.all([
    db
      .select()
      .from(commerceTaxRate)
      .where(scopedTaxRate)
      .orderBy(asc(commerceTaxRate.name)),
    db
      .select({
        id: commerceTaxAssignment.id,
        subjectType: commerceTaxAssignment.subjectType,
        lineType: commerceTaxAssignment.lineType,
        productId: commerceTaxAssignment.productId,
        productName: studioProduct.name,
        taxRateId: commerceTaxAssignment.taxRateId,
        taxRateName: commerceTaxRate.name,
        archivedAt: commerceTaxAssignment.archivedAt,
      })
      .from(commerceTaxAssignment)
      .leftJoin(
        studioProduct,
        and(
          eq(studioProduct.id, commerceTaxAssignment.productId),
          eq(
            studioProduct.organizationId,
            commerceTaxAssignment.organizationId,
          ),
          sql`${studioProduct.locationId} IS NOT DISTINCT FROM ${commerceTaxAssignment.locationId}`,
        ),
      )
      .leftJoin(
        commerceTaxRate,
        and(
          eq(commerceTaxRate.id, commerceTaxAssignment.taxRateId),
          eq(
            commerceTaxRate.organizationId,
            commerceTaxAssignment.organizationId,
          ),
          sql`${commerceTaxRate.locationId} IS NOT DISTINCT FROM ${commerceTaxAssignment.locationId}`,
        ),
      )
      .where(scopedAssignment)
      .orderBy(asc(commerceTaxAssignment.subjectType)),
    db
      .select({ id: studioProduct.id, name: studioProduct.name })
      .from(studioProduct)
      .where(
        and(
          eq(studioProduct.organizationId, scope.organizationId),
          scope.locationId
            ? eq(studioProduct.locationId, scope.locationId)
            : isNull(studioProduct.locationId),
          eq(studioProduct.isActive, true),
          isNull(studioProduct.deletedAt),
        ),
      )
      .orderBy(asc(studioProduct.name)),
    db
      .select()
      .from(commerceRevenueCategory)
      .where(scopedCategory)
      .orderBy(asc(commerceRevenueCategory.name)),
    db
      .select()
      .from(commerceOfflinePaymentMethod)
      .where(scopedOfflineMethod)
      .orderBy(asc(commerceOfflinePaymentMethod.name)),
    db.select().from(commerceDocumentDefaults).where(scopedDocuments).limit(1),
    db
      .select({
        id: commerceGuestPassPolicyVersion.id,
        version: commerceGuestPassPolicyVersion.version,
        values: commerceGuestPassPolicyVersion.values,
        isActive: commerceGuestPassPolicyVersion.isActive,
        changeNote: commerceGuestPassPolicyVersion.changeNote,
        createdAt: commerceGuestPassPolicyVersion.createdAt,
      })
      .from(commerceGuestPassPolicyVersion)
      .where(scopedPolicy)
      .orderBy(desc(commerceGuestPassPolicyVersion.version)),
  ]);
  const guestPassPolicyHistory = policyRows.map((policy) => ({
    ...policy,
    values: guestPassPolicyValuesSchema.parse(policy.values),
  }));
  const activeGuestPassPolicy =
    guestPassPolicyHistory.find((policy) => policy.isActive) ?? null;
  const activeTaxRates = taxRates.filter((rate) => rate.archivedAt === null);
  const activeAssignments = assignments.filter(
    (assignment) => assignment.archivedAt === null,
  );
  const activeCategories = revenueCategories.filter(
    (category) => category.archivedAt === null,
  );
  const activeOfflineMethods = offlinePaymentMethods.filter(
    (method) => method.archivedAt === null && method.enabled,
  );
  const documentDefaults = documentRows[0] ?? null;

  return {
    taxRates,
    taxAssignments: assignments,
    products,
    revenueCategories,
    offlinePaymentMethods,
    documentDefaults,
    activeGuestPassPolicy,
    guestPassPolicyHistory,
    readiness: {
      tax:
        activeTaxRates.length > 0 &&
        activeAssignments.every(
          (assignment) =>
            assignment.taxRateId === null ||
            activeTaxRates.some((rate) => rate.id === assignment.taxRateId),
        )
          ? "READY"
          : "INCOMPLETE",
      revenueMapping: activeCategories.some(
        (category) => category.accountingAccountReference,
      )
        ? "REFERENCE_ONLY"
        : "NOT_CONFIGURED",
      offlinePayments:
        activeOfflineMethods.length > 0 ? "READY" : "NOT_CONFIGURED",
      documents:
        documentDefaults && documentDefaults.invoiceDueDays !== null
          ? "READY"
          : "INCOMPLETE",
      guestPasses: activeGuestPassPolicy ? "READY" : "NOT_CONFIGURED",
    },
  };
}
