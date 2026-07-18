import "server-only";

import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sum,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db";
import {
  client,
  locationMember,
  member,
  outboundDelivery,
  paymentRecoveryAction,
  paymentRecoveryAttempt,
  paymentRecoveryCase,
  user,
} from "@/db/schema";
import {
  recoveryCaseListInputSchema,
  recoveryCaseStatuses,
} from "@/features/commerce/recovery-contracts";

import {
  exactRecoveryLocation,
  type PaymentRecoveryScope,
} from "./payment-recovery-access";

type CaseListInput = z.infer<typeof recoveryCaseListInputSchema>;

export async function getPaymentRecoveryStats(
  scope: PaymentRecoveryScope,
): Promise<{
  statuses: Array<{
    status: (typeof recoveryCaseStatuses)[number];
    count: number;
  }>;
  activeAmounts: Array<{
    currency: string;
    currencyExponent: number;
    amountMinor: number;
  }>;
}> {
  const scopeWhere = and(
    eq(paymentRecoveryCase.organizationId, scope.organizationId),
    exactRecoveryLocation(paymentRecoveryCase.locationId, scope.locationId),
  );
  const [statusRows, amountRows] = await Promise.all([
    db
      .select({ status: paymentRecoveryCase.status, count: count() })
      .from(paymentRecoveryCase)
      .where(scopeWhere)
      .groupBy(paymentRecoveryCase.status),
    db
      .select({
        currency: paymentRecoveryCase.currency,
        currencyExponent: paymentRecoveryCase.currencyExponent,
        amountMinor: sum(paymentRecoveryCase.amountMinor),
      })
      .from(paymentRecoveryCase)
      .where(
        and(
          scopeWhere,
          inArray(paymentRecoveryCase.status, [
            "OPEN",
            "IN_PROGRESS",
            "EXHAUSTED",
          ]),
        ),
      )
      .groupBy(
        paymentRecoveryCase.currency,
        paymentRecoveryCase.currencyExponent,
      ),
  ]);
  return {
    statuses: recoveryCaseStatuses.map((status) => ({
      status,
      count: Number(
        statusRows.find((row) => row.status === status)?.count ?? 0,
      ),
    })),
    activeAmounts: amountRows.map((row) => ({
      currency: row.currency,
      currencyExponent: row.currencyExponent,
      amountMinor: Number(row.amountMinor ?? 0),
    })),
  };
}

export async function listPaymentRecoveryCases(
  scope: PaymentRecoveryScope,
  input: CaseListInput,
): Promise<{
  items: Awaited<ReturnType<typeof queryCasePage>>;
  nextCursor: { openedAt: Date; id: string } | null;
}> {
  const conditions: SQL[] = [
    eq(paymentRecoveryCase.organizationId, scope.organizationId),
    exactRecoveryLocation(paymentRecoveryCase.locationId, scope.locationId),
  ];
  if (input.status === "ACTIVE") {
    conditions.push(
      inArray(paymentRecoveryCase.status, ["OPEN", "IN_PROGRESS", "EXHAUSTED"]),
    );
  } else if (input.status !== "ALL") {
    conditions.push(eq(paymentRecoveryCase.status, input.status));
  }
  if (input.target)
    conditions.push(eq(paymentRecoveryCase.target, input.target));
  if (input.ownerUserId) {
    conditions.push(eq(paymentRecoveryCase.ownerUserId, input.ownerUserId));
  } else if (input.unassignedOnly) {
    conditions.push(isNull(paymentRecoveryCase.ownerUserId));
  }
  if (input.search) {
    const term = `%${input.search}%`;
    const search = or(
      ilike(paymentRecoveryCase.caseKey, term),
      ilike(paymentRecoveryCase.providerObjectId, term),
      ilike(client.name, term),
      ilike(client.email, term),
    );
    if (search) conditions.push(search);
  }
  if (input.cursor) {
    const cursor = or(
      lt(paymentRecoveryCase.openedAt, input.cursor.openedAt),
      and(
        eq(paymentRecoveryCase.openedAt, input.cursor.openedAt),
        lt(paymentRecoveryCase.id, input.cursor.id),
      ),
    );
    if (cursor) conditions.push(cursor);
  }

  const rows = await queryCasePage(scope, and(...conditions), input.limit + 1);
  const hasNext = rows.length > input.limit;
  const items = hasNext ? rows.slice(0, input.limit) : rows;
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      hasNext && last ? { openedAt: last.openedAt, id: last.id } : null,
  };
}

async function queryCasePage(
  scope: PaymentRecoveryScope,
  where: SQL | undefined,
  limit: number,
) {
  return db
    .select({
      id: paymentRecoveryCase.id,
      target: paymentRecoveryCase.target,
      status: paymentRecoveryCase.status,
      clientId: paymentRecoveryCase.clientId,
      clientName: client.name,
      clientEmail: client.email,
      invoiceId: paymentRecoveryCase.invoiceId,
      membershipId: paymentRecoveryCase.membershipId,
      bookingId: paymentRecoveryCase.bookingId,
      studioBookingId: paymentRecoveryCase.studioBookingId,
      amountMinor: paymentRecoveryCase.amountMinor,
      currency: paymentRecoveryCase.currency,
      currencyExponent: paymentRecoveryCase.currencyExponent,
      attemptCount: paymentRecoveryCase.attemptCount,
      nextActionAt: paymentRecoveryCase.nextActionAt,
      ownerUserId: paymentRecoveryCase.ownerUserId,
      ownerName: user.name,
      lastErrorCode: paymentRecoveryCase.lastErrorCode,
      lastErrorMessage: paymentRecoveryCase.lastErrorMessage,
      openedAt: paymentRecoveryCase.openedAt,
      recoveredAt: paymentRecoveryCase.recoveredAt,
      exhaustedAt: paymentRecoveryCase.exhaustedAt,
      cancelledAt: paymentRecoveryCase.cancelledAt,
      updatedAt: paymentRecoveryCase.updatedAt,
    })
    .from(paymentRecoveryCase)
    .leftJoin(
      client,
      and(
        eq(client.id, paymentRecoveryCase.clientId),
        eq(client.organizationId, paymentRecoveryCase.organizationId),
        exactRecoveryLocation(client.locationId, scope.locationId),
      ),
    )
    .leftJoin(user, eq(user.id, paymentRecoveryCase.ownerUserId))
    .where(where)
    .orderBy(desc(paymentRecoveryCase.openedAt), desc(paymentRecoveryCase.id))
    .limit(limit);
}

export async function getPaymentRecoveryCaseDetail(
  scope: PaymentRecoveryScope,
  caseId: string,
): Promise<{
  recoveryCase: Awaited<ReturnType<typeof findScopedCase>>;
  actions: Awaited<ReturnType<typeof listCaseActions>>;
  attempts: Awaited<ReturnType<typeof listCaseAttempts>>;
}> {
  const recoveryCase = await findScopedCase(scope, caseId);
  if (!recoveryCase) return { recoveryCase: null, actions: [], attempts: [] };
  const [actions, attempts] = await Promise.all([
    listCaseActions(scope, caseId),
    listCaseAttempts(scope, caseId),
  ]);
  return { recoveryCase, actions, attempts };
}

async function findScopedCase(scope: PaymentRecoveryScope, caseId: string) {
  const [row] = await db
    .select({
      id: paymentRecoveryCase.id,
      target: paymentRecoveryCase.target,
      status: paymentRecoveryCase.status,
      caseKey: paymentRecoveryCase.caseKey,
      clientId: paymentRecoveryCase.clientId,
      clientName: client.name,
      clientEmail: client.email,
      invoiceId: paymentRecoveryCase.invoiceId,
      membershipId: paymentRecoveryCase.membershipId,
      bookingId: paymentRecoveryCase.bookingId,
      studioBookingId: paymentRecoveryCase.studioBookingId,
      amountMinor: paymentRecoveryCase.amountMinor,
      currency: paymentRecoveryCase.currency,
      currencyExponent: paymentRecoveryCase.currencyExponent,
      attemptCount: paymentRecoveryCase.attemptCount,
      nextActionAt: paymentRecoveryCase.nextActionAt,
      ownerUserId: paymentRecoveryCase.ownerUserId,
      ownerName: user.name,
      provider: paymentRecoveryCase.provider,
      providerObjectId: paymentRecoveryCase.providerObjectId,
      providerAccountRef: paymentRecoveryCase.providerAccountRef,
      policyVersion: paymentRecoveryCase.policyVersion,
      lastErrorCode: paymentRecoveryCase.lastErrorCode,
      lastErrorMessage: paymentRecoveryCase.lastErrorMessage,
      openedAt: paymentRecoveryCase.openedAt,
      recoveredAt: paymentRecoveryCase.recoveredAt,
      exhaustedAt: paymentRecoveryCase.exhaustedAt,
      cancelledAt: paymentRecoveryCase.cancelledAt,
      updatedAt: paymentRecoveryCase.updatedAt,
    })
    .from(paymentRecoveryCase)
    .leftJoin(
      client,
      and(
        eq(client.id, paymentRecoveryCase.clientId),
        eq(client.organizationId, paymentRecoveryCase.organizationId),
        exactRecoveryLocation(client.locationId, scope.locationId),
      ),
    )
    .leftJoin(user, eq(user.id, paymentRecoveryCase.ownerUserId))
    .where(
      and(
        eq(paymentRecoveryCase.id, caseId),
        eq(paymentRecoveryCase.organizationId, scope.organizationId),
        exactRecoveryLocation(paymentRecoveryCase.locationId, scope.locationId),
      ),
    )
    .limit(1);
  if (!row) return null;
  const { providerAccountRef, ...safeRow } = row;
  return {
    ...safeRow,
    providerAccount: providerAccountRef
      ? `Ending ${providerAccountRef.slice(-4)}`
      : null,
  };
}

async function listCaseActions(scope: PaymentRecoveryScope, caseId: string) {
  return db
    .select({
      id: paymentRecoveryAction.id,
      type: paymentRecoveryAction.type,
      status: paymentRecoveryAction.status,
      sequence: paymentRecoveryAction.sequence,
      scheduledAt: paymentRecoveryAction.scheduledAt,
      availableAt: paymentRecoveryAction.availableAt,
      attemptCount: paymentRecoveryAction.attemptCount,
      maxAttempts: paymentRecoveryAction.maxAttempts,
      startedAt: paymentRecoveryAction.startedAt,
      completedAt: paymentRecoveryAction.completedAt,
      cancelledAt: paymentRecoveryAction.cancelledAt,
      lastErrorCode: paymentRecoveryAction.lastErrorCode,
      lastErrorMessage: paymentRecoveryAction.lastErrorMessage,
      deliveryStatus: outboundDelivery.status,
      deliveryProvider: outboundDelivery.provider,
      deliveryErrorCode: outboundDelivery.lastErrorCode,
      deliveryErrorMessage: outboundDelivery.lastErrorMessage,
    })
    .from(paymentRecoveryAction)
    .leftJoin(
      outboundDelivery,
      and(
        eq(outboundDelivery.id, paymentRecoveryAction.outboundDeliveryId),
        eq(outboundDelivery.organizationId, scope.organizationId),
        exactRecoveryLocation(outboundDelivery.locationId, scope.locationId),
      ),
    )
    .where(
      and(
        eq(paymentRecoveryAction.caseId, caseId),
        eq(paymentRecoveryAction.organizationId, scope.organizationId),
        exactRecoveryLocation(
          paymentRecoveryAction.locationId,
          scope.locationId,
        ),
      ),
    )
    .orderBy(desc(paymentRecoveryAction.sequence));
}

async function listCaseAttempts(scope: PaymentRecoveryScope, caseId: string) {
  return db
    .select({
      id: paymentRecoveryAttempt.id,
      actionId: paymentRecoveryAttempt.actionId,
      type: paymentRecoveryAttempt.type,
      status: paymentRecoveryAttempt.status,
      provider: paymentRecoveryAttempt.provider,
      providerObjectId: paymentRecoveryAttempt.providerObjectId,
      errorCode: paymentRecoveryAttempt.errorCode,
      errorMessage: paymentRecoveryAttempt.errorMessage,
      occurredAt: paymentRecoveryAttempt.occurredAt,
    })
    .from(paymentRecoveryAttempt)
    .where(
      and(
        eq(paymentRecoveryAttempt.caseId, caseId),
        eq(paymentRecoveryAttempt.organizationId, scope.organizationId),
        exactRecoveryLocation(
          paymentRecoveryAttempt.locationId,
          scope.locationId,
        ),
      ),
    )
    .orderBy(desc(paymentRecoveryAttempt.occurredAt));
}

export async function listPaymentRecoveryOwners(
  scope: PaymentRecoveryScope,
): Promise<Array<{ id: string; name: string; email: string }>> {
  if (scope.locationId) {
    return db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(locationMember)
      .innerJoin(user, eq(user.id, locationMember.userId))
      .where(eq(locationMember.locationId, scope.locationId))
      .orderBy(user.name);
  }
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, scope.organizationId))
    .orderBy(user.name);
}

export async function isAssignableRecoveryOwner(
  scope: PaymentRecoveryScope,
  userId: string,
): Promise<boolean> {
  const rows = scope.locationId
    ? await db
        .select({ id: locationMember.id })
        .from(locationMember)
        .where(
          and(
            eq(locationMember.locationId, scope.locationId),
            eq(locationMember.userId, userId),
          ),
        )
        .limit(1)
    : await db
        .select({ id: member.id })
        .from(member)
        .where(
          and(
            eq(member.organizationId, scope.organizationId),
            eq(member.userId, userId),
          ),
        )
        .limit(1);
  return rows.length > 0;
}
