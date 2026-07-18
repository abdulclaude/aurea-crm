import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { cancellationCharge, cancellationPolicy } from "@/db/schema";
import { NodeType } from "@/db/enums";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

import {
  exactCancellationLocation,
  requireCancellationAccess,
  type CancellationContext,
} from "./cancellation-access";
import { enqueueCancellationCollections } from "./cancellation-collection-enqueue";
import {
  applyCancellationOutcome,
  type CancellationOutcome,
  type CancellationOutcomeResult,
} from "./cancellation-outcome-service";
import type { CancellationTransaction } from "./cancellation-domain-types";

export type CancellationScope = {
  organizationId: string;
  locationId: string | null;
};

export async function applySingleCancellationCharge(
  ctx: CancellationContext,
  bookingId: string,
  outcome: CancellationOutcome,
) {
  const scope = await requireCancellationAccess(ctx, "commerce.manage");
  const result = await applyCancellationOutcome({
    ...scope,
    bookingIds: [bookingId],
    outcome,
    requirePolicy: true,
  });
  await enqueueCancellationCollections(result.autoCollectChargeIds);
  await dispatchCancellationOutcomeWorkflows(
    scope.organizationId,
    outcome,
    result,
  );
  return result.charges[0];
}

export async function dispatchCancellationOutcomeWorkflows(
  organizationId: string,
  outcome: CancellationOutcome,
  result: CancellationOutcomeResult,
): Promise<void> {
  await Promise.all(
    result.workflowEvents
      .filter((event) => event.sendNotification)
      .map((event) =>
        triggerWorkflowsForNodeType({
          nodeType:
            outcome === "NO_SHOW"
              ? NodeType.MEMBER_NO_SHOW_TRIGGER
              : NodeType.CLASS_CANCELLED_TRIGGER,
          organizationId,
          locationId: event.locationId,
          idempotencyKey: `cancellation-outcome:${outcome}:${event.bookingId}`,
          triggerData: {
            bookingId: event.bookingId,
            clientId: event.clientId,
            classId: event.classId,
            status: outcome,
            isLateCancellation: outcome === "LATE_CANCEL",
            client: {
              id: event.clientId,
              name: event.clientName,
              email: event.clientEmail,
            },
            class: {
              id: event.classId,
              name: event.className,
              startTime: event.classStartTime.toISOString(),
            },
          },
        }),
      ),
  );
}

export async function findScopedCancellationPolicy(
  scope: CancellationScope,
  id: string,
) {
  return db.query.cancellationPolicy.findFirst({
    where: and(
      eq(cancellationPolicy.id, id),
      eq(cancellationPolicy.organizationId, scope.organizationId),
      exactCancellationLocation(
        cancellationPolicy.locationId,
        scope.locationId,
      ),
    ),
  });
}

export async function findScopedCancellationCharge(
  scope: CancellationScope,
  id: string,
) {
  return db.query.cancellationCharge.findFirst({
    where: and(
      eq(cancellationCharge.id, id),
      eq(cancellationCharge.organizationId, scope.organizationId),
      exactCancellationLocation(
        cancellationCharge.locationId,
        scope.locationId,
      ),
    ),
  });
}

export async function clearDefaultCancellationPolicies(
  tx: CancellationTransaction,
  scope: CancellationScope,
  now: Date,
): Promise<void> {
  await tx
    .update(cancellationPolicy)
    .set({ isDefault: false, updatedAt: now })
    .where(
      and(
        eq(cancellationPolicy.organizationId, scope.organizationId),
        exactCancellationLocation(
          cancellationPolicy.locationId,
          scope.locationId,
        ),
      ),
    );
}

export function notFoundCancellationPolicy(): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Cancellation policy not found.",
  });
}

export function notFoundCancellationCharge(): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Cancellation charge not found.",
  });
}
