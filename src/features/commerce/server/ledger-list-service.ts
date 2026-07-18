import "server-only";

import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  lt,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  commerceLedgerEntry,
  commerceOperation,
  invoice,
  location,
} from "@/db/schema";
import { calculateRefundAvailability } from "@/features/commerce/lib/refund-policy";
import type { ListLedgerEntriesInput } from "@/features/commerce/reconciliation-contracts";
import type { LedgerEntryListItem } from "@/features/commerce/reconciliation-output-contracts";
import {
  type CommerceScope,
  containsPattern,
  locationCondition,
  type Page,
  pageResult,
} from "@/features/commerce/server/reconciliation-list-helpers";

export async function listLedgerEntries(
  scope: CommerceScope,
  input: ListLedgerEntriesInput,
): Promise<Page<LedgerEntryListItem>> {
  const conditions: SQL[] = [
    eq(commerceLedgerEntry.organizationId, scope.organizationId),
  ];
  const activeLocation = locationCondition(
    commerceLedgerEntry.locationId,
    scope.locationId,
  );
  if (activeLocation) conditions.push(activeLocation);
  if (input.kind) conditions.push(eq(commerceLedgerEntry.kind, input.kind));
  if (input.status) conditions.push(eq(commerceLedgerEntry.status, input.status));
  if (input.query) {
    const search = containsPattern(input.query);
    const searchCondition = or(
      ilike(commerceLedgerEntry.providerObjectId, search),
      ilike(commerceLedgerEntry.paymentIntentId, search),
      ilike(commerceLedgerEntry.chargeId, search),
      ilike(commerceLedgerEntry.checkoutSessionId, search),
      ilike(client.name, search),
      ilike(client.email, search),
      ilike(invoice.invoiceNumber, search),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (input.cursor) {
    const cursorCondition = or(
      lt(commerceLedgerEntry.occurredAt, input.cursor.at),
      and(
        eq(commerceLedgerEntry.occurredAt, input.cursor.at),
        lt(commerceLedgerEntry.id, input.cursor.id),
      ),
    );
    if (cursorCondition) conditions.push(cursorCondition);
  }

  const rows = await db
    .select({
      id: commerceLedgerEntry.id,
      provider: commerceLedgerEntry.provider,
      stripeConnectionId: commerceLedgerEntry.stripeConnectionId,
      providerObjectId: commerceLedgerEntry.providerObjectId,
      providerObjectType: commerceLedgerEntry.providerObjectType,
      kind: commerceLedgerEntry.kind,
      status: commerceLedgerEntry.status,
      amountMinor: commerceLedgerEntry.amountMinor,
      feeMinor: commerceLedgerEntry.feeMinor,
      netMinor: commerceLedgerEntry.netMinor,
      currency: commerceLedgerEntry.currency,
      currencyExponent: commerceLedgerEntry.currencyExponent,
      paymentIntentId: commerceLedgerEntry.paymentIntentId,
      chargeId: commerceLedgerEntry.chargeId,
      checkoutSessionId: commerceLedgerEntry.checkoutSessionId,
      clientId: commerceLedgerEntry.clientId,
      clientName: client.name,
      clientEmail: client.email,
      locationId: commerceLedgerEntry.locationId,
      locationName: location.companyName,
      invoiceId: commerceLedgerEntry.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      occurredAt: commerceLedgerEntry.occurredAt,
    })
    .from(commerceLedgerEntry)
    .leftJoin(client, eq(client.id, commerceLedgerEntry.clientId))
    .leftJoin(location, eq(location.id, commerceLedgerEntry.locationId))
    .leftJoin(invoice, eq(invoice.id, commerceLedgerEntry.invoiceId))
    .where(and(...conditions))
    .orderBy(
      desc(commerceLedgerEntry.occurredAt),
      desc(commerceLedgerEntry.id),
    )
    .limit(input.limit + 1);

  const page = pageResult({
    rows,
    limit: input.limit,
    cursorDate: (row) => row.occurredAt,
  });
  const paymentIntentIds = Array.from(
    new Set(
      page.items
        .filter((row) => row.kind === "PAYMENT")
        .map((row) => row.paymentIntentId)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  if (paymentIntentIds.length === 0) {
    return {
      ...page,
      items: page.items.map((row) => ({
        ...row,
        reservedRefundMinor: 0,
        refundableMinor: 0,
      })),
    };
  }

  const refundScope = locationCondition(
    commerceLedgerEntry.locationId,
    scope.locationId,
  );
  const operationScope = locationCondition(
    commerceOperation.locationId,
    scope.locationId,
  );
  const [ledgerReservations, operationReservations] = await Promise.all([
    db
      .select({
        paymentIntentId: commerceLedgerEntry.paymentIntentId,
        providerRefundId: commerceLedgerEntry.providerObjectId,
        amountMinor: commerceLedgerEntry.amountMinor,
      })
      .from(commerceLedgerEntry)
      .where(
        and(
          eq(commerceLedgerEntry.organizationId, scope.organizationId),
          refundScope ?? undefined,
          inArray(commerceLedgerEntry.paymentIntentId, paymentIntentIds),
          eq(commerceLedgerEntry.kind, "REFUND"),
          inArray(commerceLedgerEntry.status, ["PENDING", "SUCCEEDED"]),
        ),
      ),
    db
      .select({
        paymentIntentId: commerceOperation.providerPaymentIntentId,
        providerRefundId: commerceOperation.providerRefundId,
        amountMinor: commerceOperation.amountMinor,
      })
      .from(commerceOperation)
      .where(
        and(
          eq(commerceOperation.organizationId, scope.organizationId),
          operationScope ?? undefined,
          inArray(
            commerceOperation.providerPaymentIntentId,
            paymentIntentIds,
          ),
          eq(commerceOperation.type, "REFUND"),
          inArray(commerceOperation.status, [
            "CREATED",
            "PROVIDER_PENDING",
            "REQUIRES_ACTION",
          ]),
        ),
      ),
  ]);

  return {
    ...page,
    items: page.items.map((row) => {
      if (row.kind !== "PAYMENT" || !row.paymentIntentId) {
        return {
          ...row,
          reservedRefundMinor: 0,
          refundableMinor: 0,
        };
      }
      const availability = calculateRefundAvailability({
        originalAmountMinor: row.amountMinor,
        ledgerReservations: ledgerReservations
          .filter(
            (reservation) =>
              reservation.paymentIntentId === row.paymentIntentId,
          )
          .map((reservation) => ({
            providerRefundId: reservation.providerRefundId,
            amountMinor: reservation.amountMinor,
          })),
        operationReservations: operationReservations
          .filter(
            (reservation) =>
              reservation.paymentIntentId === row.paymentIntentId,
          )
          .map((reservation) => ({
            providerRefundId: reservation.providerRefundId,
            amountMinor: reservation.amountMinor,
          })),
      });
      return {
        ...row,
        reservedRefundMinor: availability.reservedMinor,
        refundableMinor: availability.remainingMinor,
      };
    }),
  };
}
