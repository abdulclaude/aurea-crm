import type { commerceReconciliationIssue } from "@/db/schema";
import {
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import { RECONCILIATION_ISSUE_TYPES } from "./constants";
import { before, pick } from "./helpers";
import type { FinanceFixturePlan } from "./types";

export function buildReconciliationFixtures(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
): void {
  const runCount = context.profile === "QA_EXHAUSTIVE" ? 24 : 8;
  const issueCount = context.profile === "QA_EXHAUSTIVE" ? 100 : 32;
  for (let index = 0; index < runCount; index += 1) {
    const end = before(context.referenceDate, index * 30);
    plan.reconciliationRuns.push({
      id: deterministicDemoId(context.runId, "reconciliation-run", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      provider: "AUREA_DEMO_RECEIPTS",
      status: index % 5 === 4 ? "FAILED" : "COMPLETED",
      requestedBy: context.actorUserId,
      windowStart: before(end, 30),
      windowEnd: end,
      providerRecords: 100 + index * 3,
      localRecords: 98 + index * 3,
      issuesFound: Math.ceil(issueCount / runCount),
      startedAt: end,
      completedAt: end,
      errorMessage: index % 5 === 4 ? "Synthetic reconciliation failure" : null,
      createdAt: end,
      updatedAt: end,
    });
  }
  for (let index = 0; index < issueCount; index += 1) {
    const status = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "IGNORED"][
      index % 4
    ] as typeof commerceReconciliationIssue.$inferInsert.status;
    const entry = pick(plan.ledgerEntries, index * 17, "ledger entry");
    const detectedAt = before(context.referenceDate, index * 4);
    const acknowledged = status === "ACKNOWLEDGED" || status === "RESOLVED";
    const resolved = status === "RESOLVED" || status === "IGNORED";
    plan.reconciliationIssues.push({
      id: deterministicDemoId(context.runId, "reconciliation-issue", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      runId: pick(plan.reconciliationRuns, index, "reconciliation run").id,
      ledgerEntryId: entry.id,
      fingerprint: `demo:${context.runId}:reconciliation:${index}`,
      type: RECONCILIATION_ISSUE_TYPES[
        index % RECONCILIATION_ISSUE_TYPES.length
      ],
      severity: ["INFO", "WARNING", "CRITICAL"][
        index % 3
      ] as typeof commerceReconciliationIssue.$inferInsert.severity,
      status,
      localEntityType: "CommerceLedgerEntry",
      localEntityId: entry.id,
      providerObjectId: entry.providerObjectId,
      expected: { amountMinor: entry.amountMinor, currency: entry.currency },
      actual:
        index % 2 === 0
          ? { amountMinor: entry.amountMinor + 100, currency: entry.currency }
          : { amountMinor: entry.amountMinor, currency: "ZZZ" },
      recoveryAction: "Review synthetic demo receipt only",
      detectedAt,
      lastSeenAt: detectedAt,
      acknowledgedAt: acknowledged ? detectedAt : null,
      acknowledgedBy: acknowledged ? context.actorUserId : null,
      resolvedAt: resolved ? detectedAt : null,
      resolvedBy: resolved ? context.actorUserId : null,
      resolutionNote: resolved
        ? "Synthetic issue closed for demonstration"
        : null,
      createdAt: detectedAt,
      updatedAt: detectedAt,
    });
  }
}
