import "server-only";

import {
  and,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  commerceLedgerEntry,
  communicationSuppression,
  studioBooking,
  studioClass,
  studioMembership,
} from "@/db/schema";
import type { SavedAudienceDefinition } from "@/features/audiences/lib/audience-definition";
import type { AudienceScope } from "@/features/audiences/server/audience-query";
import {
  currencyExponent,
  decimalToMinorUnits,
} from "@/features/commerce/lib/money";

function exactLocationCondition(
  column:
    | typeof studioMembership.locationId
    | typeof commerceLedgerEntry.locationId
    | typeof studioClass.locationId,
  scope: AudienceScope,
): SQL | undefined {
  return scope.locationId ? eq(column, scope.locationId) : undefined;
}

export function activeEmailSuppression(scope: AudienceScope): SQL {
  return exists(
    db
      .select({ id: communicationSuppression.id })
      .from(communicationSuppression)
      .where(
        and(
          eq(communicationSuppression.organizationId, scope.organizationId),
          eq(communicationSuppression.clientId, client.id),
          eq(communicationSuppression.channel, "EMAIL"),
          isNull(communicationSuppression.revokedAt),
          or(
            isNull(communicationSuppression.locationId),
            scope.locationId
              ? eq(communicationSuppression.locationId, scope.locationId)
              : eq(communicationSuppression.locationId, client.locationId),
          ),
        ),
      ),
  );
}

export function validEmailCondition(): SQL {
  return and(
    isNotNull(client.email),
    sql`${client.email} ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'`,
  )!;
}

function successfulPaymentCondition(scope: AudienceScope): SQL {
  return exists(
    db
      .select({ id: commerceLedgerEntry.id })
      .from(commerceLedgerEntry)
      .where(
        and(
          eq(commerceLedgerEntry.organizationId, scope.organizationId),
          exactLocationCondition(commerceLedgerEntry.locationId, scope),
          eq(commerceLedgerEntry.clientId, client.id),
          eq(commerceLedgerEntry.kind, "PAYMENT"),
          inArray(commerceLedgerEntry.status, [
            "SUCCEEDED",
            "PARTIALLY_REFUNDED",
            "REFUNDED",
          ]),
        ),
      ),
  );
}

export function buildCommerceConditions(
  scope: AudienceScope,
  definition: SavedAudienceDefinition,
): SQL[] {
  const conditions: SQL[] = [];
  const successfulPayment = successfulPaymentCondition(scope);
  if (definition.commerce.paymentState === "SUCCEEDED") {
    conditions.push(successfulPayment);
  } else if (definition.commerce.paymentState === "NEVER_PAID") {
    conditions.push(not(successfulPayment));
  } else if (definition.commerce.paymentState === "FAILED") {
    conditions.push(
      exists(
        db
          .select({ id: commerceLedgerEntry.id })
          .from(commerceLedgerEntry)
          .where(
            and(
              eq(commerceLedgerEntry.organizationId, scope.organizationId),
              exactLocationCondition(commerceLedgerEntry.locationId, scope),
              eq(commerceLedgerEntry.clientId, client.id),
              eq(commerceLedgerEntry.kind, "PAYMENT"),
              eq(commerceLedgerEntry.status, "FAILED"),
            ),
          ),
      ),
    );
  }

  const minimumSpend = definition.commerce.minimumLifetimeSpend;
  if (!minimumSpend) return conditions;
  const amountMinor = decimalToMinorUnits(
    minimumSpend.amount,
    currencyExponent(minimumSpend.currency),
  );
  conditions.push(sql`(
    select coalesce(sum(
      case
        when ${commerceLedgerEntry.kind} = 'PAYMENT'
          and ${commerceLedgerEntry.status} in ('SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED')
          then ${commerceLedgerEntry.amountMinor}
        when ${commerceLedgerEntry.kind} = 'REFUND'
          and ${commerceLedgerEntry.status} = 'SUCCEEDED'
          then -${commerceLedgerEntry.amountMinor}
        else 0
      end
    ), 0)
    from ${commerceLedgerEntry}
    where ${commerceLedgerEntry.organizationId} = ${scope.organizationId}
      and ${commerceLedgerEntry.clientId} = ${client.id}
      and ${commerceLedgerEntry.currency} = ${minimumSpend.currency}
      ${scope.locationId
        ? sql`and ${commerceLedgerEntry.locationId} = ${scope.locationId}`
        : sql``}
  ) >= ${amountMinor}`);
  return conditions;
}

export function buildMembershipConditions(
  scope: AudienceScope,
  definition: SavedAudienceDefinition,
): SQL[] {
  const membership = definition.membership;
  if (membership.statuses.length === 0 && membership.planIds.length === 0) {
    return [];
  }
  return [
    exists(
      db
        .select({ id: studioMembership.id })
        .from(studioMembership)
        .where(
          and(
            eq(studioMembership.organizationId, scope.organizationId),
            exactLocationCondition(studioMembership.locationId, scope),
            eq(studioMembership.clientId, client.id),
            membership.statuses.length > 0
              ? inArray(studioMembership.status, membership.statuses)
              : undefined,
            membership.planIds.length > 0
              ? inArray(studioMembership.planId, membership.planIds)
              : undefined,
          ),
        ),
    ),
  ];
}

function upcomingBookingCondition(scope: AudienceScope): SQL {
  return exists(
    db
      .select({ id: studioBooking.id })
      .from(studioBooking)
      .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
      .where(
        and(
          eq(studioBooking.clientId, client.id),
          eq(studioBooking.status, "BOOKED"),
          eq(studioClass.organizationId, scope.organizationId),
          exactLocationCondition(studioClass.locationId, scope),
          sql`${studioClass.startTime} > CURRENT_TIMESTAMP`,
        ),
      ),
  );
}

export function buildAttendanceConditions(
  scope: AudienceScope,
  definition: SavedAudienceDefinition,
): SQL[] {
  const attendance = definition.attendance;
  const conditions: SQL[] = [];
  if (attendance.minimumVisits !== null) {
    conditions.push(gte(client.attendanceCount, attendance.minimumVisits));
  }
  if (attendance.maximumVisits !== null) {
    conditions.push(lte(client.attendanceCount, attendance.maximumVisits));
  }
  if (attendance.noVisitInDays !== null) {
    conditions.push(
      not(
        exists(
          db
            .select({ id: studioBooking.id })
            .from(studioBooking)
            .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
            .where(
              and(
                eq(studioBooking.clientId, client.id),
                eq(studioBooking.status, "ATTENDED"),
                eq(studioClass.organizationId, scope.organizationId),
                exactLocationCondition(studioClass.locationId, scope),
                sql`${studioClass.startTime} >= CURRENT_TIMESTAMP - (${attendance.noVisitInDays} * INTERVAL '1 day')`,
              ),
            ),
        ),
      ),
    );
  }
  if (attendance.hasUpcomingBooking !== null) {
    const upcomingBooking = upcomingBookingCondition(scope);
    conditions.push(
      attendance.hasUpcomingBooking ? upcomingBooking : not(upcomingBooking),
    );
  }
  return conditions;
}

export function buildEmailEligibilityCondition(
  scope: AudienceScope,
  state: SavedAudienceDefinition["emailEligibility"],
): SQL | undefined {
  if (state === "ANY") return undefined;
  const validEmail = validEmailCondition();
  const suppression = activeEmailSuppression(scope);
  if (state === "INVALID") return not(validEmail);
  if (state === "SUPPRESSED") {
    return and(
      validEmail,
      or(eq(client.emailUnsubscribed, true), suppression),
    );
  }
  return and(
    validEmail,
    eq(client.emailUnsubscribed, false),
    not(suppression),
  );
}
