import "server-only";

import { and, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  clientAccountBalance,
  commerceLedgerEntry,
  commerceReconciliationIssue,
  commerceReconciliationRun,
  giftCard,
  instructor,
  studioMembership,
  studioPayment,
  studioPaymentLineItem,
  studioProduct,
  studioStaffMember,
} from "@/db/schema";
import type { ReportGroupId } from "@/features/reports/types";

import type { ReportDataHealth } from "../contracts";
import { getReportLocale, type ReportScope } from "./report-scope";

const FINANCIAL_GROUPS: readonly ReportGroupId[] = [
  "sales",
  "payment-processing",
  "inventory",
];

export async function getReportDataHealth(input: {
  scope: ReportScope;
  groupId: ReportGroupId;
  reportId?: string;
}): Promise<ReportDataHealth> {
  const financial =
    FINANCIAL_GROUPS.includes(input.groupId) ||
    ["account-balances", "new-members"].includes(input.reportId ?? "");
  const currencyAware =
    financial ||
    (input.groupId === "staff" && input.reportId === "pay-rates");
  const [
    locale,
    dataAsOf,
    currencies,
    lastReconciledAt,
    openIssues,
    unlinked,
    failed,
  ] = await Promise.all([
    getReportLocale(input.scope),
    getDataAsOf(input.scope, input.groupId),
    currencyAware
      ? getCurrencies(input.scope, input.groupId, input.reportId)
      : Promise.resolve([]),
    financial ? getLastReconciledAt(input.scope) : Promise.resolve(null),
    financial ? countOpenIssues(input.scope) : Promise.resolve(0),
    financial ? countUnlinkedPayments(input.scope) : Promise.resolve(0),
    financial ? countFailedPayments(input.scope) : Promise.resolve(0),
  ]);

  const resolvedCurrencies =
    currencies.length > 0 ? currencies : [locale.currency];
  const gaps: ReportDataHealth["gaps"] = [];

  if (
    input.groupId === "payment-processing" &&
    input.reportId &&
    ["approved-transactions", "settled-transactions", "card-updater"].includes(
      input.reportId,
    )
  ) {
    gaps.push({
      id: "provider-settlement-state-unavailable",
      severity: "WARNING",
      label: "Provider state unavailable",
      detail:
        "Aurea does not yet store the provider authorization, settlement batch, or card-updater state required for this report, so no rows are inferred.",
      count: null,
    });
  }

  if (resolvedCurrencies.length > 1) {
    gaps.push({
      id: "mixed-currency",
      severity: "CRITICAL",
      label: "Multiple currencies",
      detail:
        "Values are not converted. Filter or export one currency at a time.",
      count: resolvedCurrencies.length,
    });
  }
  if (openIssues > 0) {
    gaps.push({
      id: "open-reconciliation-issues",
      severity: "CRITICAL",
      label: "Open payment mismatches",
      detail:
        "Provider and Aurea records still have unresolved reconciliation issues.",
      count: openIssues,
    });
  }
  if (unlinked > 0) {
    gaps.push({
      id: "unlinked-provider-payments",
      severity: "WARNING",
      label: "Unlinked provider payments",
      detail:
        "Successful provider payments are missing a linked local payment record.",
      count: unlinked,
    });
  }
  if (failed > 0) {
    gaps.push({
      id: "failed-payments",
      severity: "INFO",
      label: "Failed payments excluded",
      detail:
        "Failed payments are visible in payment reports but excluded from collected revenue.",
      count: failed,
    });
  }

  return {
    generatedAt: new Date(),
    dataAsOf,
    lastReconciledAt,
    freshness: freshnessState({ dataAsOf, lastReconciledAt, financial }),
    timezone: locale.timezone,
    locale: locale.locale,
    currency: resolvedCurrencies[0] ?? locale.currency,
    weekStart: locale.weekStart,
    dateFormat: locale.dateFormat,
    timeFormat: locale.timeFormat,
    currencies: resolvedCurrencies,
    gaps,
  };
}

async function getDataAsOf(
  scope: ReportScope,
  groupId: ReportGroupId,
): Promise<Date | null> {
  if (groupId === "clients") {
    const [row] = await db
      .select({ value: max(client.updatedAt) })
      .from(client)
      .where(
        and(
          eq(client.organizationId, scope.organizationId),
          eq(client.locationId, scope.locationId),
        ),
      );
    return row?.value ?? null;
  }
  if (groupId === "staff") {
    const [teacher, staff] = await Promise.all([
      db
        .select({ value: max(instructor.updatedAt) })
        .from(instructor)
        .where(
          and(
            eq(instructor.organizationId, scope.organizationId),
            eq(instructor.locationId, scope.locationId),
          ),
        ),
      db
        .select({ value: max(studioStaffMember.updatedAt) })
        .from(studioStaffMember)
        .where(
          and(
            eq(studioStaffMember.organizationId, scope.organizationId),
            eq(studioStaffMember.locationId, scope.locationId),
          ),
        ),
    ]);
    return latestDate(teacher[0]?.value ?? null, staff[0]?.value ?? null);
  }
  if (groupId === "inventory") {
    const [products, lineItems] = await Promise.all([
      db
        .select({ value: max(studioProduct.updatedAt) })
        .from(studioProduct)
        .where(
          and(
            eq(studioProduct.organizationId, scope.organizationId),
            eq(studioProduct.locationId, scope.locationId),
            isNull(studioProduct.deletedAt),
          ),
        ),
      db
        .select({ value: max(studioPaymentLineItem.updatedAt) })
        .from(studioPaymentLineItem)
        .where(
          and(
            eq(studioPaymentLineItem.organizationId, scope.organizationId),
            eq(studioPaymentLineItem.locationId, scope.locationId),
            isNull(studioPaymentLineItem.deletedAt),
          ),
        ),
    ]);
    return latestDate(products[0]?.value ?? null, lineItems[0]?.value ?? null);
  }
  if (groupId === "sales") {
    const [lineItems, giftCards, memberships] = await Promise.all([
      db
        .select({ value: max(studioPaymentLineItem.updatedAt) })
        .from(studioPaymentLineItem)
        .where(
          and(
            eq(studioPaymentLineItem.organizationId, scope.organizationId),
            eq(studioPaymentLineItem.locationId, scope.locationId),
            isNull(studioPaymentLineItem.deletedAt),
          ),
        ),
      db
        .select({ value: max(giftCard.updatedAt) })
        .from(giftCard)
        .where(
          and(
            eq(giftCard.organizationId, scope.organizationId),
            eq(giftCard.locationId, scope.locationId),
          ),
        ),
      db
        .select({ value: max(studioMembership.updatedAt) })
        .from(studioMembership)
        .where(
          and(
            eq(studioMembership.organizationId, scope.organizationId),
            eq(studioMembership.locationId, scope.locationId),
          ),
        ),
    ]);
    return latestDate(
      latestDate(lineItems[0]?.value ?? null, giftCards[0]?.value ?? null),
      memberships[0]?.value ?? null,
    );
  }

  const [ledger, payment] = await Promise.all([
    db
      .select({ value: max(commerceLedgerEntry.occurredAt) })
      .from(commerceLedgerEntry)
      .where(
        and(
          eq(commerceLedgerEntry.organizationId, scope.organizationId),
          eq(commerceLedgerEntry.locationId, scope.locationId),
        ),
      ),
    db
      .select({ value: max(studioPayment.updatedAt) })
      .from(studioPayment)
      .where(
        and(
          eq(studioPayment.organizationId, scope.organizationId),
          eq(studioPayment.locationId, scope.locationId),
        ),
      ),
  ]);
  return latestDate(ledger[0]?.value ?? null, payment[0]?.value ?? null);
}

async function getCurrencies(
  scope: ReportScope,
  groupId: ReportGroupId,
  reportId?: string,
): Promise<string[]> {
  if (groupId === "payment-processing") {
    const rows = await db
      .selectDistinct({ currency: commerceLedgerEntry.currency })
      .from(commerceLedgerEntry)
      .where(
        and(
          eq(commerceLedgerEntry.organizationId, scope.organizationId),
          eq(commerceLedgerEntry.locationId, scope.locationId),
        ),
      );
    return uniqueCurrencies(rows.map((row) => row.currency));
  }

  if (groupId === "inventory") {
    const [products, lineItems] = await Promise.all([
      db
        .selectDistinct({ currency: studioProduct.currency })
        .from(studioProduct)
        .where(
          and(
            eq(studioProduct.organizationId, scope.organizationId),
            eq(studioProduct.locationId, scope.locationId),
            isNull(studioProduct.deletedAt),
          ),
        ),
      db
        .selectDistinct({ currency: studioPaymentLineItem.currency })
        .from(studioPaymentLineItem)
        .where(
          and(
            eq(studioPaymentLineItem.organizationId, scope.organizationId),
            eq(studioPaymentLineItem.locationId, scope.locationId),
            isNull(studioPaymentLineItem.deletedAt),
          ),
        ),
    ]);
    return uniqueCurrencies([
      ...products.map((row) => row.currency),
      ...lineItems.map((row) => row.currency),
    ]);
  }

  if (groupId === "clients") {
    if (reportId === "account-balances") {
      const rows = await db
        .selectDistinct({ currency: clientAccountBalance.currency })
        .from(clientAccountBalance)
        .where(
          and(
            eq(clientAccountBalance.organizationId, scope.organizationId),
            eq(clientAccountBalance.locationId, scope.locationId),
          ),
        );
      return uniqueCurrencies(rows.map((row) => row.currency));
    }
    const rows = await db
      .selectDistinct({ currency: studioMembership.currency })
      .from(studioMembership)
      .where(
        and(
          eq(studioMembership.organizationId, scope.organizationId),
          eq(studioMembership.locationId, scope.locationId),
        ),
      );
    return uniqueCurrencies(rows.map((row) => row.currency));
  }

  if (groupId === "staff" && reportId === "pay-rates") {
    const [teachers, staff] = await Promise.all([
      db
        .selectDistinct({ currency: instructor.currency })
        .from(instructor)
        .where(
          and(
            eq(instructor.organizationId, scope.organizationId),
            eq(instructor.locationId, scope.locationId),
          ),
        ),
      db
        .selectDistinct({ currency: studioStaffMember.currency })
        .from(studioStaffMember)
        .where(
          and(
            eq(studioStaffMember.organizationId, scope.organizationId),
            eq(studioStaffMember.locationId, scope.locationId),
            isNull(studioStaffMember.deletedAt),
          ),
        ),
    ]);
    return uniqueCurrencies([
      ...teachers.map((row) => row.currency),
      ...staff.map((row) => row.currency),
    ]);
  }

  const [lineItems, giftCards, memberships] = await Promise.all([
    db
      .selectDistinct({ currency: studioPaymentLineItem.currency })
      .from(studioPaymentLineItem)
      .where(
        and(
          eq(studioPaymentLineItem.organizationId, scope.organizationId),
          eq(studioPaymentLineItem.locationId, scope.locationId),
          isNull(studioPaymentLineItem.deletedAt),
        ),
      ),
    db
      .selectDistinct({ currency: giftCard.currency })
      .from(giftCard)
      .where(
        and(
          eq(giftCard.organizationId, scope.organizationId),
          eq(giftCard.locationId, scope.locationId),
        ),
      ),
    db
      .selectDistinct({ currency: studioMembership.currency })
      .from(studioMembership)
      .where(
        and(
          eq(studioMembership.organizationId, scope.organizationId),
          eq(studioMembership.locationId, scope.locationId),
        ),
      ),
  ]);
  return uniqueCurrencies([
    ...lineItems.map((row) => row.currency),
    ...giftCards.map((row) => row.currency),
    ...memberships.map((row) => row.currency),
  ]);
}

function uniqueCurrencies(values: readonly (string | null)[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim().toUpperCase() ?? "")
        .filter((value) => /^[A-Z]{3}$/.test(value)),
    ),
  ).sort();
}

async function getLastReconciledAt(scope: ReportScope): Promise<Date | null> {
  const [row] = await db
    .select({ completedAt: commerceReconciliationRun.completedAt })
    .from(commerceReconciliationRun)
    .where(
      and(
        eq(commerceReconciliationRun.organizationId, scope.organizationId),
        eq(commerceReconciliationRun.locationId, scope.locationId),
        eq(commerceReconciliationRun.status, "COMPLETED"),
      ),
    )
    .orderBy(desc(commerceReconciliationRun.completedAt))
    .limit(1);
  return row?.completedAt ?? null;
}

async function countOpenIssues(scope: ReportScope): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(commerceReconciliationIssue)
    .where(
      and(
        eq(commerceReconciliationIssue.organizationId, scope.organizationId),
        eq(commerceReconciliationIssue.locationId, scope.locationId),
        inArray(commerceReconciliationIssue.status, ["OPEN", "ACKNOWLEDGED"]),
      ),
    );
  return row?.count ?? 0;
}

async function countUnlinkedPayments(scope: ReportScope): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(commerceLedgerEntry)
    .where(
      and(
        eq(commerceLedgerEntry.organizationId, scope.organizationId),
        eq(commerceLedgerEntry.locationId, scope.locationId),
        eq(commerceLedgerEntry.kind, "PAYMENT"),
        inArray(commerceLedgerEntry.status, [
          "SUCCEEDED",
          "PARTIALLY_REFUNDED",
          "REFUNDED",
        ]),
        isNull(commerceLedgerEntry.studioPaymentId),
      ),
    );
  return row?.count ?? 0;
}

async function countFailedPayments(scope: ReportScope): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studioPayment)
    .where(
      and(
        eq(studioPayment.organizationId, scope.organizationId),
        eq(studioPayment.locationId, scope.locationId),
        eq(studioPayment.status, "FAILED"),
        isNull(studioPayment.deletedAt),
      ),
    );
  return row?.count ?? 0;
}

function freshnessState(input: {
  dataAsOf: Date | null;
  lastReconciledAt: Date | null;
  financial: boolean;
}): ReportDataHealth["freshness"] {
  if (!input.dataAsOf) return "NO_DATA";
  if (!input.financial) return "CURRENT";
  if (!input.lastReconciledAt) return "NOT_RECONCILED";
  return Date.now() - input.lastReconciledAt.getTime() > 24 * 60 * 60 * 1_000
    ? "STALE"
    : "CURRENT";
}

function latestDate(first: Date | null, second: Date | null): Date | null {
  if (!first) return second;
  if (!second) return first;
  return first > second ? first : second;
}
