import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  clientAccountCreditTransaction,
  commerceLedgerEntry,
} from "@/db/schema";
import {
  currencyExponent,
  decimalToMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import type {
  CustomerTimelineCursor,
  CustomerTimelineEvent,
} from "@/features/customer-timeline/contracts";
import {
  locationScopeCondition,
  timelineCursorCondition,
  type CustomerTimelineScope,
} from "@/features/customer-timeline/server/timeline-query";

function ledgerTitle(kind: string): string {
  switch (kind) {
    case "REFUND":
      return "Payment refunded";
    case "DISPUTE":
      return "Payment disputed";
    case "CREDIT":
      return "Credit recorded";
    case "ADJUSTMENT":
      return "Payment adjusted";
    default:
      return "Payment received";
  }
}

export async function listCommerceTimelineEvents(input: {
  scope: CustomerTimelineScope;
  cursor?: CustomerTimelineCursor;
  limit: number;
}): Promise<CustomerTimelineEvent[]> {
  const [ledgerRows, creditRows] = await Promise.all([
    db
      .select({
        id: commerceLedgerEntry.id,
        kind: commerceLedgerEntry.kind,
        status: commerceLedgerEntry.status,
        provider: commerceLedgerEntry.provider,
        amountMinor: commerceLedgerEntry.amountMinor,
        currency: commerceLedgerEntry.currency,
        currencyExponent: commerceLedgerEntry.currencyExponent,
        occurredAt: commerceLedgerEntry.occurredAt,
      })
      .from(commerceLedgerEntry)
      .where(
        and(
          eq(commerceLedgerEntry.organizationId, input.scope.organizationId),
          locationScopeCondition(
            commerceLedgerEntry.locationId,
            input.scope.locationId,
          ),
          eq(commerceLedgerEntry.clientId, input.scope.clientId),
          inArray(commerceLedgerEntry.kind, [
            "PAYMENT",
            "REFUND",
            "DISPUTE",
            "CREDIT",
            "ADJUSTMENT",
          ]),
          timelineCursorCondition({
            occurredAt: commerceLedgerEntry.occurredAt,
            id: commerceLedgerEntry.id,
            prefix: "commerce",
            cursor: input.cursor,
          }),
        ),
      )
      .orderBy(
        desc(commerceLedgerEntry.occurredAt),
        desc(commerceLedgerEntry.id),
      )
      .limit(input.limit + 1),
    db
      .select({
        id: clientAccountCreditTransaction.id,
        type: clientAccountCreditTransaction.type,
        amount: clientAccountCreditTransaction.amount,
        currency: clientAccountCreditTransaction.currency,
        description: clientAccountCreditTransaction.description,
        createdAt: clientAccountCreditTransaction.createdAt,
      })
      .from(clientAccountCreditTransaction)
      .where(
        and(
          eq(
            clientAccountCreditTransaction.organizationId,
            input.scope.organizationId,
          ),
          locationScopeCondition(
            clientAccountCreditTransaction.locationId,
            input.scope.locationId,
          ),
          eq(clientAccountCreditTransaction.clientId, input.scope.clientId),
          timelineCursorCondition({
            occurredAt: clientAccountCreditTransaction.createdAt,
            id: clientAccountCreditTransaction.id,
            prefix: "credit",
            cursor: input.cursor,
          }),
        ),
      )
      .orderBy(
        desc(clientAccountCreditTransaction.createdAt),
        desc(clientAccountCreditTransaction.id),
      )
      .limit(input.limit + 1),
  ]);

  return [
    ...ledgerRows.map(
      (row): CustomerTimelineEvent => ({
        id: `commerce:${row.id}`,
        kind: "PAYMENT",
        title: ledgerTitle(row.kind),
        description: row.provider,
        status: row.status,
        occurredAt: row.occurredAt,
        secondaryAt: null,
        money: {
          amountMinor: row.amountMinor,
          currency: normalizeCurrency(row.currency),
          exponent: row.currencyExponent,
        },
        channel: null,
      }),
    ),
    ...creditRows.map((row): CustomerTimelineEvent => {
      const currency = normalizeCurrency(row.currency);
      const exponent = currencyExponent(currency);
      return {
        id: `credit:${row.id}`,
        kind: "CREDIT",
        title: `Account credit ${row.type.toLowerCase().replaceAll("_", " ")}`,
        description: row.description,
        status: row.type,
        occurredAt: row.createdAt,
        secondaryAt: null,
        money: {
          amountMinor: decimalToMinorUnits(row.amount, exponent),
          currency,
          exponent,
        },
        channel: null,
      };
    }),
  ];
}
