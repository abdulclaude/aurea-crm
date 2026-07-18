import "server-only";

import { and, desc, eq, lt, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  commerceReconciliationIssue,
  commerceReconciliationRun,
  location,
} from "@/db/schema";
import type {
  ListReconciliationIssuesInput,
  ListReconciliationRunsInput,
} from "@/features/commerce/reconciliation-contracts";
import {
  reconciliationIssueDetailsSchema,
  type ReconciliationIssueListItem,
  type ReconciliationRunListItem,
} from "@/features/commerce/reconciliation-output-contracts";
import {
  type CommerceScope,
  locationCondition,
  type Page,
  pageResult,
} from "@/features/commerce/server/reconciliation-list-helpers";

export async function listReconciliationRuns(
  scope: CommerceScope,
  input: ListReconciliationRunsInput,
): Promise<Page<ReconciliationRunListItem>> {
  const conditions: SQL[] = [
    eq(commerceReconciliationRun.organizationId, scope.organizationId),
  ];
  const activeLocation = locationCondition(
    commerceReconciliationRun.locationId,
    scope.locationId,
  );
  if (activeLocation) conditions.push(activeLocation);
  if (input.status) conditions.push(eq(commerceReconciliationRun.status, input.status));
  if (input.cursor) {
    const cursorCondition = or(
      lt(commerceReconciliationRun.createdAt, input.cursor.at),
      and(
        eq(commerceReconciliationRun.createdAt, input.cursor.at),
        lt(commerceReconciliationRun.id, input.cursor.id),
      ),
    );
    if (cursorCondition) conditions.push(cursorCondition);
  }

  const rows = await db
    .select({
      id: commerceReconciliationRun.id,
      provider: commerceReconciliationRun.provider,
      locationId: commerceReconciliationRun.locationId,
      locationName: location.companyName,
      status: commerceReconciliationRun.status,
      windowStart: commerceReconciliationRun.windowStart,
      windowEnd: commerceReconciliationRun.windowEnd,
      providerRecords: commerceReconciliationRun.providerRecords,
      localRecords: commerceReconciliationRun.localRecords,
      issuesFound: commerceReconciliationRun.issuesFound,
      startedAt: commerceReconciliationRun.startedAt,
      completedAt: commerceReconciliationRun.completedAt,
      errorMessage: commerceReconciliationRun.errorMessage,
      createdAt: commerceReconciliationRun.createdAt,
    })
    .from(commerceReconciliationRun)
    .leftJoin(location, eq(location.id, commerceReconciliationRun.locationId))
    .where(and(...conditions))
    .orderBy(
      desc(commerceReconciliationRun.createdAt),
      desc(commerceReconciliationRun.id),
    )
    .limit(input.limit + 1);

  return pageResult({ rows, limit: input.limit, cursorDate: (row) => row.createdAt });
}

export async function listReconciliationIssues(
  scope: CommerceScope,
  input: ListReconciliationIssuesInput,
): Promise<Page<ReconciliationIssueListItem>> {
  const conditions: SQL[] = [
    eq(commerceReconciliationIssue.organizationId, scope.organizationId),
  ];
  const activeLocation = locationCondition(
    commerceReconciliationIssue.locationId,
    scope.locationId,
  );
  if (activeLocation) conditions.push(activeLocation);
  if (input.status) conditions.push(eq(commerceReconciliationIssue.status, input.status));
  if (input.type) conditions.push(eq(commerceReconciliationIssue.type, input.type));
  if (input.severity) conditions.push(eq(commerceReconciliationIssue.severity, input.severity));
  if (input.cursor) {
    const cursorCondition = or(
      lt(commerceReconciliationIssue.detectedAt, input.cursor.at),
      and(
        eq(commerceReconciliationIssue.detectedAt, input.cursor.at),
        lt(commerceReconciliationIssue.id, input.cursor.id),
      ),
    );
    if (cursorCondition) conditions.push(cursorCondition);
  }

  const rows = await db
    .select({
      id: commerceReconciliationIssue.id,
      type: commerceReconciliationIssue.type,
      severity: commerceReconciliationIssue.severity,
      status: commerceReconciliationIssue.status,
      locationId: commerceReconciliationIssue.locationId,
      locationName: location.companyName,
      ledgerEntryId: commerceReconciliationIssue.ledgerEntryId,
      stripeEventId: commerceReconciliationIssue.stripeEventId,
      localEntityType: commerceReconciliationIssue.localEntityType,
      localEntityId: commerceReconciliationIssue.localEntityId,
      providerObjectId: commerceReconciliationIssue.providerObjectId,
      expected: commerceReconciliationIssue.expected,
      actual: commerceReconciliationIssue.actual,
      recoveryAction: commerceReconciliationIssue.recoveryAction,
      detectedAt: commerceReconciliationIssue.detectedAt,
      lastSeenAt: commerceReconciliationIssue.lastSeenAt,
      acknowledgedAt: commerceReconciliationIssue.acknowledgedAt,
      resolvedAt: commerceReconciliationIssue.resolvedAt,
      resolutionNote: commerceReconciliationIssue.resolutionNote,
    })
    .from(commerceReconciliationIssue)
    .leftJoin(location, eq(location.id, commerceReconciliationIssue.locationId))
    .where(and(...conditions))
    .orderBy(
      desc(commerceReconciliationIssue.detectedAt),
      desc(commerceReconciliationIssue.id),
    )
    .limit(input.limit + 1);

  const items = rows.map((row) => ({
    ...row,
    expected: reconciliationIssueDetailsSchema.parse(row.expected),
    actual: reconciliationIssueDetailsSchema.parse(row.actual),
  }));

  return pageResult({
    rows: items,
    limit: input.limit,
    cursorDate: (row) => row.detectedAt,
  });
}
