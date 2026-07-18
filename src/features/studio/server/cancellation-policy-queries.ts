import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt, or } from "drizzle-orm";

import { db } from "@/db";
import {
  cancellationCharge,
  cancellationPolicy,
  client,
  studioClass,
} from "@/db/schema";
import type { CancellationChargeStatus } from "@/features/studio/lib/cancellation-charge-rules";

import { exactCancellationLocation } from "./cancellation-access";
import type { CancellationScope } from "./cancellation-policy-router-helpers";

export function listCancellationPolicies(scope: CancellationScope) {
  return db
    .select()
    .from(cancellationPolicy)
    .where(policyScope(scope))
    .orderBy(
      desc(cancellationPolicy.isDefault),
      desc(cancellationPolicy.createdAt),
    );
}

export function listAssignableCancellationPolicies(scope: CancellationScope) {
  return db
    .select({
      id: cancellationPolicy.id,
      name: cancellationPolicy.name,
      isDefault: cancellationPolicy.isDefault,
    })
    .from(cancellationPolicy)
    .where(and(policyScope(scope), eq(cancellationPolicy.isActive, true)))
    .orderBy(
      desc(cancellationPolicy.isDefault),
      desc(cancellationPolicy.createdAt),
    );
}

export async function getCancellationOutcomePolicyPreview(
  scope: CancellationScope,
  classId: string,
) {
  const targetClass = await db.query.studioClass.findFirst({
    where: and(
      eq(studioClass.id, classId),
      eq(studioClass.organizationId, scope.organizationId),
      exactCancellationLocation(studioClass.locationId, scope.locationId),
    ),
    columns: { cancellationPolicyId: true },
  });
  if (!targetClass) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
  }

  return (
    (await db.query.cancellationPolicy.findFirst({
      where: and(
        policyScope(scope),
        targetClass.cancellationPolicyId
          ? eq(cancellationPolicy.id, targetClass.cancellationPolicyId)
          : and(
              eq(cancellationPolicy.isDefault, true),
              eq(cancellationPolicy.isActive, true),
            ),
      ),
      columns: {
        chargeCard: true,
        creditsDeducted: true,
        currency: true,
        deductCredits: true,
        lateCancelFee: true,
        name: true,
        noShowFeeAmount: true,
      },
    })) ?? null
  );
}

export async function getCancellationChargesPage(
  scope: CancellationScope,
  input: {
    clientId?: string;
    classId?: string;
    status?: CancellationChargeStatus;
    cursor?: { at: Date; id: string };
    limit: number;
  },
) {
  const rows = await db
    .select({
      charge: cancellationCharge,
      clientName: client.name,
      className: studioClass.name,
    })
    .from(cancellationCharge)
    .innerJoin(client, eq(client.id, cancellationCharge.clientId))
    .innerJoin(studioClass, eq(studioClass.id, cancellationCharge.classId))
    .where(
      and(
        eq(cancellationCharge.organizationId, scope.organizationId),
        exactCancellationLocation(
          cancellationCharge.locationId,
          scope.locationId,
        ),
        input.clientId
          ? eq(cancellationCharge.clientId, input.clientId)
          : undefined,
        input.classId
          ? eq(cancellationCharge.classId, input.classId)
          : undefined,
        input.status ? eq(cancellationCharge.status, input.status) : undefined,
        input.cursor
          ? or(
              lt(cancellationCharge.createdAt, input.cursor.at),
              and(
                eq(cancellationCharge.createdAt, input.cursor.at),
                lt(cancellationCharge.id, input.cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(cancellationCharge.createdAt), desc(cancellationCharge.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      hasMore && last
        ? { at: last.charge.createdAt, id: last.charge.id }
        : null,
  };
}

function policyScope(scope: CancellationScope) {
  return and(
    eq(cancellationPolicy.organizationId, scope.organizationId),
    exactCancellationLocation(cancellationPolicy.locationId, scope.locationId),
  );
}
