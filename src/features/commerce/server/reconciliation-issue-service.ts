import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { commerceReconciliationIssue } from "@/db/schema";
import {
  canAcknowledgeIssue,
  canResolveIssue,
} from "@/features/commerce/lib/reconciliation-transitions";
import type {
  AcknowledgedIssueOutput,
  ResolvedIssueOutput,
} from "@/features/commerce/reconciliation-output-contracts";
import {
  type CommerceScope,
  locationCondition,
} from "@/features/commerce/server/reconciliation-list-helpers";

export async function acknowledgeReconciliationIssue(input: {
  scope: CommerceScope;
  issueId: string;
  actorId: string;
}): Promise<AcknowledgedIssueOutput> {
  const conditions = issueMutationConditions(input.scope, input.issueId);
  conditions.push(eq(commerceReconciliationIssue.status, "OPEN"));
  const now = new Date();
  const [updated] = await db
    .update(commerceReconciliationIssue)
    .set({
      status: "ACKNOWLEDGED",
      acknowledgedAt: now,
      acknowledgedBy: input.actorId,
      updatedAt: now,
    })
    .where(and(...conditions))
    .returning({ id: commerceReconciliationIssue.id });

  if (updated) return { id: updated.id, status: "ACKNOWLEDGED" };
  const existing = await findScopedIssue(input.scope, input.issueId);
  if (existing?.status === "ACKNOWLEDGED") {
    return { id: existing.id, status: "ACKNOWLEDGED" };
  }
  return throwIssueMutationError(input.scope, input.issueId, "acknowledge");
}

export async function resolveReconciliationIssue(input: {
  scope: CommerceScope;
  issueId: string;
  actorId: string;
  resolutionNote: string;
}): Promise<ResolvedIssueOutput> {
  const conditions = issueMutationConditions(input.scope, input.issueId);
  conditions.push(
    inArray(commerceReconciliationIssue.status, ["OPEN", "ACKNOWLEDGED"]),
  );
  const now = new Date();
  const [updated] = await db
    .update(commerceReconciliationIssue)
    .set({
      status: "RESOLVED",
      resolvedAt: now,
      resolvedBy: input.actorId,
      resolutionNote: input.resolutionNote,
      updatedAt: now,
    })
    .where(and(...conditions))
    .returning({ id: commerceReconciliationIssue.id });

  if (updated) return { id: updated.id, status: "RESOLVED" };
  const existing = await findScopedIssue(input.scope, input.issueId);
  if (existing?.status === "RESOLVED") {
    return { id: existing.id, status: "RESOLVED" };
  }
  return throwIssueMutationError(input.scope, input.issueId, "resolve");
}

function issueMutationConditions(
  scope: CommerceScope,
  issueId: string,
): SQL[] {
  const conditions: SQL[] = [
    eq(commerceReconciliationIssue.id, issueId),
    eq(commerceReconciliationIssue.organizationId, scope.organizationId),
  ];
  const activeLocation = locationCondition(
    commerceReconciliationIssue.locationId,
    scope.locationId,
  );
  if (activeLocation) conditions.push(activeLocation);
  return conditions;
}

async function findScopedIssue(
  scope: CommerceScope,
  issueId: string,
): Promise<{
  id: string;
  status: typeof commerceReconciliationIssue.$inferSelect.status;
} | null> {
  const [issue] = await db
    .select({
      id: commerceReconciliationIssue.id,
      status: commerceReconciliationIssue.status,
    })
    .from(commerceReconciliationIssue)
    .where(and(...issueMutationConditions(scope, issueId)))
    .limit(1);
  return issue ?? null;
}

async function throwIssueMutationError(
  scope: CommerceScope,
  issueId: string,
  action: "acknowledge" | "resolve",
): Promise<never> {
  const issue = await findScopedIssue(scope, issueId);
  if (!issue) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Reconciliation issue not found.",
    });
  }
  const allowed =
    action === "acknowledge"
      ? canAcknowledgeIssue(issue.status)
      : canResolveIssue(issue.status);
  if (!allowed) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `This issue cannot be ${action}d from its current status.`,
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Failed to ${action} the reconciliation issue.`,
  });
}
