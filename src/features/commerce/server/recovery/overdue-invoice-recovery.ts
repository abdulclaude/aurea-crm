import "server-only";

import { and, asc, gt, inArray, lt } from "drizzle-orm";

import { db } from "@/db";
import { invoice } from "@/db/schema";
import {
  currencyExponent,
  decimalToMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";

import { openPaymentRecoveryCase } from "./payment-recovery-case-service";

const OVERDUE_BATCH_SIZE = 100;

export async function openDueInvoiceRecoveryCases(
  now = new Date(),
): Promise<number> {
  return db.transaction(async (tx) => {
    const overdue = await tx
      .select({
        id: invoice.id,
        organizationId: invoice.organizationId,
        locationId: invoice.locationId,
        clientId: invoice.clientId,
        dueDate: invoice.dueDate,
        amountDue: invoice.amountDue,
        currency: invoice.currency,
      })
      .from(invoice)
      .where(
        and(
          inArray(invoice.status, [
            "SENT",
            "VIEWED",
            "PARTIALLY_PAID",
            "OVERDUE",
          ]),
          lt(invoice.dueDate, now),
          gt(invoice.amountDue, "0"),
        ),
      )
      .orderBy(asc(invoice.dueDate), asc(invoice.id))
      .limit(OVERDUE_BATCH_SIZE);

    for (const selected of overdue) {
      const currency = normalizeCurrency(selected.currency);
      const exponent = currencyExponent(currency);
      await openPaymentRecoveryCase({
        tx,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        clientId: selected.clientId,
        target: "INVOICE",
        caseKey: `invoice:${selected.id}`,
        invoiceId: selected.id,
        sourceEventId: null,
        sourceEventAt: selected.dueDate,
        attemptKey: `invoice-overdue:${selected.id}`,
        amountMinor: decimalToMinorUnits(selected.amountDue, exponent),
        currency,
        currencyExponent: exponent,
        provider: "AUREA",
        providerAccountRef: null,
        stripeConnectionId: null,
        providerObjectId: selected.id,
        errorCode: "INVOICE_OVERDUE",
        errorMessage: "Invoice payment is overdue",
      });
    }

    if (overdue.length > 0) {
      await tx
        .update(invoice)
        .set({ status: "OVERDUE", updatedAt: now })
        .where(
          inArray(
            invoice.id,
            overdue.map((selected) => selected.id),
          ),
        );
    }
    return overdue.length;
  });
}
