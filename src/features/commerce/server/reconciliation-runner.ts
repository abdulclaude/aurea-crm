import "server-only";

import { createHash, randomUUID } from "crypto";
import {
  and,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  commerceLedgerEntry,
  commerceReconciliationIssue,
  commerceReconciliationRun,
  stripeEvent,
} from "@/db/schema";
import {
  findReconciliationCandidates,
  LEDGER_REQUIRED_STRIPE_EVENT_TYPES,
} from "@/features/commerce/lib/reconciliation-matcher";
import { RECEIPT_RECONCILIATION_PROVIDER } from "@/features/commerce/reconciliation-contracts";
import { locationCondition } from "@/features/commerce/server/reconciliation-list-helpers";

type ReconciliationResult = {
  providerRecords: number;
  localRecords: number;
  issuesFound: number;
};

type IssueInsert = typeof commerceReconciliationIssue.$inferInsert;

function issueFingerprint(input: {
  organizationId: string;
  locationId: string | null;
  type: string;
  sourceId: string;
}): string {
  return createHash("sha256")
    .update(
      [
        "receipt-reconciliation-v1",
        input.organizationId,
        input.locationId ?? "organization",
        input.type,
        input.sourceId,
      ].join(":"),
    )
    .digest("hex");
}

export async function executeReceiptReconciliation(input: {
  runId: string;
  organizationId: string;
}): Promise<ReconciliationResult> {
  const [run] = await db
    .select({
      id: commerceReconciliationRun.id,
      organizationId: commerceReconciliationRun.organizationId,
      locationId: commerceReconciliationRun.locationId,
      provider: commerceReconciliationRun.provider,
      status: commerceReconciliationRun.status,
      windowStart: commerceReconciliationRun.windowStart,
      windowEnd: commerceReconciliationRun.windowEnd,
      providerRecords: commerceReconciliationRun.providerRecords,
      localRecords: commerceReconciliationRun.localRecords,
      issuesFound: commerceReconciliationRun.issuesFound,
    })
    .from(commerceReconciliationRun)
    .where(
      and(
        eq(commerceReconciliationRun.id, input.runId),
        eq(commerceReconciliationRun.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (!run) throw new Error("Reconciliation run not found");
  if (run.provider !== RECEIPT_RECONCILIATION_PROVIDER) {
    throw new Error("Unsupported reconciliation provider");
  }
  if (run.status === "COMPLETED") {
    return {
      providerRecords: run.providerRecords,
      localRecords: run.localRecords,
      issuesFound: run.issuesFound,
    };
  }
  if (run.status === "FAILED") {
    throw new Error("Reconciliation run is already failed");
  }

  if (run.status === "PENDING") {
    await db
      .update(commerceReconciliationRun)
      .set({
        status: "RUNNING",
        startedAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commerceReconciliationRun.id, run.id),
          eq(commerceReconciliationRun.status, "PENDING"),
        ),
      );
  }

  const receiptConditions: SQL[] = [
    eq(stripeEvent.organizationId, run.organizationId),
    eq(stripeEvent.status, "PROCESSED"),
    isNotNull(stripeEvent.objectId),
    inArray(stripeEvent.type, [...LEDGER_REQUIRED_STRIPE_EVENT_TYPES]),
    gte(stripeEvent.receivedAt, run.windowStart),
    lt(stripeEvent.receivedAt, run.windowEnd),
  ];
  const receiptLocation = locationCondition(
    stripeEvent.locationId,
    run.locationId,
  );
  if (receiptLocation) receiptConditions.push(receiptLocation);

  const ledgerConditions: SQL[] = [
    eq(commerceLedgerEntry.organizationId, run.organizationId),
    ilike(commerceLedgerEntry.provider, "STRIPE"),
    gte(commerceLedgerEntry.occurredAt, run.windowStart),
    lt(commerceLedgerEntry.occurredAt, run.windowEnd),
  ];
  const ledgerLocation = locationCondition(
    commerceLedgerEntry.locationId,
    run.locationId,
  );
  if (ledgerLocation) ledgerConditions.push(ledgerLocation);

  const [receiptRows, ledgerRows] = await Promise.all([
    db
      .select({
        id: stripeEvent.id,
        type: stripeEvent.type,
        objectId: stripeEvent.objectId,
        locationId: stripeEvent.locationId,
      })
      .from(stripeEvent)
      .where(and(...receiptConditions)),
    db
      .select({
        id: commerceLedgerEntry.id,
        stripeEventId: commerceLedgerEntry.stripeEventId,
        providerObjectId: commerceLedgerEntry.providerObjectId,
        paymentIntentId: commerceLedgerEntry.paymentIntentId,
        chargeId: commerceLedgerEntry.chargeId,
        checkoutSessionId: commerceLedgerEntry.checkoutSessionId,
        locationId: commerceLedgerEntry.locationId,
      })
      .from(commerceLedgerEntry)
      .where(and(...ledgerConditions)),
  ]);

  const receipts = receiptRows.flatMap((receipt) =>
    receipt.objectId
      ? [{
          id: receipt.id,
          type: receipt.type,
          objectId: receipt.objectId,
          locationId: receipt.locationId,
        }]
      : [],
  );
  const candidates = findReconciliationCandidates({
    receipts,
    ledgerRecords: ledgerRows,
  });
  const now = new Date();
  const issueRows: IssueInsert[] = candidates.map((candidate) => {
    const sourceId = candidate.receiptId ?? candidate.ledgerEntryId ?? "unknown";
    const base = {
      id: randomUUID(),
      organizationId: run.organizationId,
      locationId: candidate.locationId ?? run.locationId,
      runId: run.id,
      ledgerEntryId: candidate.ledgerEntryId,
      stripeEventId: candidate.receiptId,
      fingerprint: issueFingerprint({
        organizationId: run.organizationId,
        locationId: candidate.locationId ?? run.locationId,
        type: candidate.type,
        sourceId,
      }),
      type: candidate.type,
      providerObjectId: candidate.providerObjectId,
      detectedAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    } satisfies Partial<IssueInsert>;

    if (candidate.type === "MISSING_LOCAL_RECORD") {
      return {
        ...base,
        severity: "CRITICAL",
        status: "OPEN",
        expected: { ledgerEntry: true },
        actual: { stripeEventId: candidate.receiptId },
        recoveryAction: "Review the Stripe receipt and replay it after validating scope.",
      } satisfies IssueInsert;
    }

    if (candidate.type === "ORPHANED_REFERENCE") {
      return {
        ...base,
        severity: "CRITICAL",
        status: "OPEN",
        localEntityType: "COMMERCE_LEDGER_ENTRY",
        localEntityId: candidate.ledgerEntryId,
        expected: { locationId: candidate.locationId },
        actual: { locationId: candidate.actualLocationId },
        recoveryAction: "Review the receipt and ledger tenant scope before replaying.",
      } satisfies IssueInsert;
    }

    return {
      ...base,
      severity: "WARNING",
      status: "OPEN",
      localEntityType: "COMMERCE_LEDGER_ENTRY",
      localEntityId: candidate.ledgerEntryId,
      expected: { stripeReceipt: true },
      actual: { ledgerEntryId: candidate.ledgerEntryId },
      recoveryAction: "Confirm the provider object and attach its retained receipt.",
    } satisfies IssueInsert;
  });

  await db.transaction(async (tx) => {
    const batchSize = 250;
    for (let index = 0; index < issueRows.length; index += batchSize) {
      const batch = issueRows.slice(index, index + batchSize);
      await tx
        .insert(commerceReconciliationIssue)
        .values(batch)
        .onConflictDoUpdate({
          target: commerceReconciliationIssue.fingerprint,
          set: {
            runId: sql`excluded."runId"`,
            ledgerEntryId: sql`excluded."ledgerEntryId"`,
            stripeEventId: sql`excluded."stripeEventId"`,
            providerObjectId: sql`excluded."providerObjectId"`,
            expected: sql`excluded."expected"`,
            actual: sql`excluded."actual"`,
            recoveryAction: sql`excluded."recoveryAction"`,
            lastSeenAt: now,
            status: sql`case when ${commerceReconciliationIssue.status} = 'RESOLVED' then 'OPEN'::"CommerceReconciliationStatus" else ${commerceReconciliationIssue.status} end`,
            acknowledgedAt: sql`case when ${commerceReconciliationIssue.status} = 'RESOLVED' then null else ${commerceReconciliationIssue.acknowledgedAt} end`,
            acknowledgedBy: sql`case when ${commerceReconciliationIssue.status} = 'RESOLVED' then null else ${commerceReconciliationIssue.acknowledgedBy} end`,
            resolvedAt: sql`case when ${commerceReconciliationIssue.status} = 'RESOLVED' then null else ${commerceReconciliationIssue.resolvedAt} end`,
            resolvedBy: sql`case when ${commerceReconciliationIssue.status} = 'RESOLVED' then null else ${commerceReconciliationIssue.resolvedBy} end`,
            resolutionNote: sql`case when ${commerceReconciliationIssue.status} = 'RESOLVED' then null else ${commerceReconciliationIssue.resolutionNote} end`,
            updatedAt: now,
          },
        });
    }

    await tx
      .update(commerceReconciliationRun)
      .set({
        status: "COMPLETED",
        providerRecords: receipts.length,
        localRecords: ledgerRows.length,
        issuesFound: candidates.length,
        completedAt: now,
        errorMessage: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(commerceReconciliationRun.id, run.id),
          eq(commerceReconciliationRun.organizationId, run.organizationId),
        ),
      );
  });

  return {
    providerRecords: receipts.length,
    localRecords: ledgerRows.length,
    issuesFound: candidates.length,
  };
}

export async function failReceiptReconciliation(input: {
  runId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(commerceReconciliationRun)
    .set({
      status: "FAILED",
      errorMessage: "The receipt reconciliation job failed.",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(commerceReconciliationRun.id, input.runId),
        eq(commerceReconciliationRun.organizationId, input.organizationId),
        inArray(commerceReconciliationRun.status, ["PENDING", "RUNNING"]),
      ),
    );
}
