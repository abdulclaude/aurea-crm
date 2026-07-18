import "server-only";

import { and, eq } from "drizzle-orm";

import {
  booking,
  bookingEventType,
  commerceLedgerEntry,
  commerceOperation,
  commerceReconciliationIssue,
  commerceReconciliationRun,
  commerceTenderAllocation,
  invoice,
  invoiceLineItem,
  invoicePayment,
  invoiceReminder,
  invoiceTemplate,
  paymentRecoveryAction,
  paymentRecoveryAttempt,
  paymentRecoveryCase,
  paymentRecoveryLink,
  paymentRecoveryPolicy,
  recurringInvoice,
  recurringInvoiceGeneration,
  studioBookingPayment,
  studioPayment,
  studioPaymentLineItem,
} from "@/db/schema";
import { buildFinanceFixturePlan } from "@/features/demo-data/server/packs/finance/build-plan";
import { assertFinanceFixturePlan } from "@/features/demo-data/server/packs/finance/invariants";
import type {
  FinanceFixturePlan,
  FinancePackDependencies,
} from "@/features/demo-data/server/packs/finance/types";
import {
  recordRefs,
  type DemoDataTransaction,
  type DemoPackResult,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";

export { buildFinanceFixturePlan, assertFinanceFixturePlan };
export type { FinanceFixturePlan, FinancePackDependencies };

export async function seedFinancePack(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
  dependencies: FinancePackDependencies,
): Promise<DemoPackResult> {
  const plan = buildFinanceFixturePlan(context, dependencies);
  const existingRecoveryPolicies = await tx
    .select({
      target: paymentRecoveryPolicy.target,
      version: paymentRecoveryPolicy.version,
      isActive: paymentRecoveryPolicy.isActive,
    })
    .from(paymentRecoveryPolicy)
    .where(
      and(
        eq(paymentRecoveryPolicy.organizationId, context.organizationId),
        eq(paymentRecoveryPolicy.locationId, context.locationId),
      ),
    );
  const policyVersions = new Map<string, number>();
  plan.recoveryPolicies = plan.recoveryPolicies.map((policy) => {
    const matchingPolicies = existingRecoveryPolicies.filter(
      (existing) => existing.target === policy.target,
    );
    const version =
      Math.max(0, ...matchingPolicies.map((existing) => existing.version)) + 1;
    policyVersions.set(policy.id, version);
    return {
      ...policy,
      version,
      isActive: !matchingPolicies.some((existing) => existing.isActive),
    };
  });
  plan.recoveryCases = plan.recoveryCases.map((recoveryCase) => ({
    ...recoveryCase,
    policyVersion:
      recoveryCase.policyId === null || recoveryCase.policyId === undefined
        ? recoveryCase.policyVersion
        : (policyVersions.get(recoveryCase.policyId) ??
          recoveryCase.policyVersion),
  }));
  plan.invoiceReminders = plan.invoiceReminders.map((reminder) => ({
    ...reminder,
    policyVersion:
      reminder.policyId === null || reminder.policyId === undefined
        ? reminder.policyVersion
        : (policyVersions.get(reminder.policyId) ?? reminder.policyVersion),
  }));
  const groups = [
    [invoiceTemplate, plan.invoiceTemplates, "InvoiceTemplate"],
    [bookingEventType, plan.bookingEventTypes, "BookingEventType"],
    [booking, plan.appointmentBookings, "Booking"],
    [studioPayment, plan.payments, "StudioPayment"],
    [studioPaymentLineItem, plan.paymentLines, "StudioPaymentLineItem"],
    [studioBookingPayment, plan.bookingPayments, "StudioBookingPayment"],
    [invoice, plan.invoices, "Invoice"],
    [invoiceLineItem, plan.invoiceLines, "InvoiceLineItem"],
    [invoicePayment, plan.invoicePayments, "InvoicePayment"],
    [paymentRecoveryPolicy, plan.recoveryPolicies, "PaymentRecoveryPolicy"],
    [invoiceReminder, plan.invoiceReminders, "InvoiceReminder"],
    [recurringInvoice, plan.recurringInvoices, "RecurringInvoice"],
    [
      recurringInvoiceGeneration,
      plan.recurringGenerations,
      "RecurringInvoiceGeneration",
    ],
    [commerceOperation, plan.operations, "CommerceOperation"],
    [commerceLedgerEntry, plan.ledgerEntries, "CommerceLedgerEntry"],
    [commerceTenderAllocation, plan.tenders, "CommerceTenderAllocation"],
    [
      commerceReconciliationRun,
      plan.reconciliationRuns,
      "CommerceReconciliationRun",
    ],
    [
      commerceReconciliationIssue,
      plan.reconciliationIssues,
      "CommerceReconciliationIssue",
    ],
    [paymentRecoveryCase, plan.recoveryCases, "PaymentRecoveryCase"],
    [paymentRecoveryAction, plan.recoveryActions, "PaymentRecoveryAction"],
    [paymentRecoveryAttempt, plan.recoveryAttempts, "PaymentRecoveryAttempt"],
    [paymentRecoveryLink, plan.recoveryLinks, "PaymentRecoveryLink"],
  ] as const;
  for (const [table, rows] of groups) {
    for (let offset = 0; offset < rows.length; offset += 250) {
      await tx.insert(table).values(rows.slice(offset, offset + 250));
    }
  }
  return {
    counts: Object.fromEntries(
      groups.map(([, rows, name]) => [name, rows.length]),
    ),
    records: groups.flatMap(([, rows, name]) => recordRefs(name, rows)),
  };
}
