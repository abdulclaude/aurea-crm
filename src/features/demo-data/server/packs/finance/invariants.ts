import { decimalToMinorUnits } from "@/features/commerce/lib/money";
import type { FinanceFixturePlan } from "./types";

export function assertFinanceFixturePlan(
  plan: FinanceFixturePlan,
  exponent: number,
): void {
  const lines = new Map<string, { subtotal: number; discount: number }>();
  for (const line of plan.paymentLines) {
    if (!line.paymentId)
      throw new Error("Demo payment line must reference a payment");
    const current = lines.get(line.paymentId) ?? { subtotal: 0, discount: 0 };
    current.subtotal += decimalToMinorUnits(String(line.amount), exponent);
    current.discount += decimalToMinorUnits(
      String(line.discountAmount),
      exponent,
    );
    lines.set(line.paymentId, current);
  }
  for (const payment of plan.payments) {
    const current = lines.get(payment.id);
    const expected =
      (current?.subtotal ?? 0) +
      decimalToMinorUnits(String(payment.taxAmount ?? "0"), exponent);
    if (decimalToMinorUnits(String(payment.amount), exponent) !== expected) {
      throw new Error(`Demo payment ${payment.id} does not balance`);
    }
    if (
      decimalToMinorUnits(String(payment.discountAmount ?? "0"), exponent) !==
      (current?.discount ?? 0)
    ) {
      throw new Error(`Demo payment ${payment.id} discount does not balance`);
    }
  }

  const payments = new Map(
    plan.payments.map((payment) => [payment.id, payment]),
  );
  const linesById = new Map(plan.paymentLines.map((line) => [line.id, line]));
  for (const bookingPayment of plan.bookingPayments) {
    const payment = bookingPayment.paymentId
      ? payments.get(bookingPayment.paymentId)
      : undefined;
    const line = bookingPayment.lineItemId
      ? linesById.get(bookingPayment.lineItemId)
      : undefined;
    if (!payment) {
      throw new Error(
        `Demo booking payment ${bookingPayment.id} has no local payment`,
      );
    }
    if (!line || line.paymentId !== payment.id) {
      throw new Error(
        `Demo booking payment ${bookingPayment.id} has no matching line item`,
      );
    }
    if (
      payment.organizationId !== bookingPayment.organizationId ||
      payment.locationId !== bookingPayment.locationId
    ) {
      throw new Error(
        `Demo booking payment ${bookingPayment.id} crosses tenant scope`,
      );
    }
  }

  const allocations = new Map<string, number>();
  for (const tender of plan.tenders) {
    allocations.set(
      tender.ledgerEntryId,
      (allocations.get(tender.ledgerEntryId) ?? 0) + tender.amountMinor,
    );
  }
  for (const entry of plan.ledgerEntries) {
    if (
      entry.provider === "STRIPE" ||
      entry.providerAccountId ||
      entry.stripeConnectionId
    ) {
      throw new Error(
        "Demo finance records must not bind to external accounts",
      );
    }
    if (
      entry.feeMinor != null &&
      entry.netMinor != null &&
      entry.feeMinor + entry.netMinor !== entry.amountMinor
    ) {
      throw new Error(`Demo ledger ${entry.id} fee does not balance`);
    }
    if (
      allocations.has(entry.id) &&
      allocations.get(entry.id) !== entry.amountMinor
    ) {
      throw new Error(`Demo ledger ${entry.id} tenders do not balance`);
    }
  }
  if (
    plan.reconciliationRuns.some(
      ({ status }) => status === "PENDING" || status === "RUNNING",
    )
  ) {
    throw new Error("Demo reconciliation runs must be terminal");
  }

  if (plan.recoveryPolicies.length < 3) {
    throw new Error("Demo finance requires recovery policies for every target");
  }
  const policyTargets = new Set(
    plan.recoveryPolicies.map(({ target }) => target),
  );
  if (
    !policyTargets.has("INVOICE") ||
    !policyTargets.has("MEMBERSHIP") ||
    !policyTargets.has("BOOKING")
  ) {
    throw new Error("Demo recovery policy target coverage is incomplete");
  }
  const policyConfigurations = new Set(
    plan.recoveryPolicies.map((policy) =>
      JSON.stringify({
        gracePeriodDays: policy.gracePeriodDays,
        scheduleDays: policy.scheduleDays,
        steps: policy.steps,
      }),
    ),
  );
  if (policyConfigurations.size < 2) {
    throw new Error(
      "Demo recovery requires at least two policy configurations",
    );
  }

  const sourceIds = new Set([
    ...plan.invoices.map(({ id }) => id),
    ...plan.appointmentBookings.map(({ id }) => id),
  ]);
  const studioBookingIds = new Set(
    plan.operations
      .map(({ studioBookingId }) => studioBookingId)
      .filter((id): id is string => Boolean(id)),
  );
  const membershipIds = new Set(plan.recoveryMembershipSourceIds);
  const recoveryCaseIds = new Set(plan.recoveryCases.map(({ id }) => id));
  for (const recoveryCase of plan.recoveryCases) {
    const sources = [
      recoveryCase.invoiceId,
      recoveryCase.membershipId,
      recoveryCase.bookingId,
      recoveryCase.studioBookingId,
    ].filter(Boolean);
    if (sources.length !== 1) {
      throw new Error(
        `Demo recovery case ${recoveryCase.id} has an invalid source`,
      );
    }
    if (
      (recoveryCase.invoiceId && !sourceIds.has(recoveryCase.invoiceId)) ||
      (recoveryCase.bookingId && !sourceIds.has(recoveryCase.bookingId)) ||
      (recoveryCase.membershipId &&
        !membershipIds.has(recoveryCase.membershipId)) ||
      (recoveryCase.studioBookingId &&
        !studioBookingIds.has(recoveryCase.studioBookingId))
    ) {
      throw new Error(
        `Demo recovery case ${recoveryCase.id} has an unlinked source`,
      );
    }
    if (
      recoveryCase.providerAccountId ||
      recoveryCase.providerAccountRef ||
      recoveryCase.stripeConnectionId
    ) {
      throw new Error("Demo recovery cases must remain provider-account free");
    }
  }
  if (
    plan.recoveryActions.some(({ caseId }) => !recoveryCaseIds.has(caseId)) ||
    plan.recoveryAttempts.some(({ caseId }) => !recoveryCaseIds.has(caseId)) ||
    plan.recoveryLinks.some(({ caseId }) => !recoveryCaseIds.has(caseId))
  ) {
    throw new Error("Demo recovery child records must reference a demo case");
  }
  if (
    plan.invoiceReminders.length > 5 &&
    new Set(plan.invoiceReminders.map(({ deliveryStatus }) => deliveryStatus))
      .size < 4
  ) {
    throw new Error("Demo invoice reminders need varied delivery states");
  }
}
