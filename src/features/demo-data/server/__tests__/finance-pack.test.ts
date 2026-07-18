import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_DATA_PROFILE_CONFIG } from "@/features/demo-data/contracts";
import {
  assertFinanceFixturePlan,
  buildFinanceFixturePlan,
  type FinancePackDependencies,
} from "@/features/demo-data/server/packs/finance-pack";
import type { DemoSeedContext } from "@/features/demo-data/server/types";
import {
  currencyExponent,
  decimalToMinorUnits,
} from "@/features/commerce/lib/money";

const referenceDate = new Date("2026-07-14T12:00:00.000Z");
const context: DemoSeedContext = {
  organizationId: "org-demo",
  locationId: "location-demo",
  actorUserId: "user-demo",
  currency: "GBP",
  timezone: "Europe/London",
  referenceDate,
  runId: "run-demo-finance",
  profile: "SHOWCASE",
  profileConfig: DEMO_DATA_PROFILE_CONFIG.SHOWCASE,
};

const dependencies: FinancePackDependencies = {
  clients: Array.from({ length: 20 }, (_, index) => ({
    id: `client-${index}`,
    name: `Demo Client ${index}`,
    email: `client-${index}@example.invalid`,
  })),
  instructors: Array.from({ length: 10 }, (_, index) => ({
    id: `instructor-${index}`,
    name: `Demo Instructor ${index}`,
    email: `instructor-${index}@example.invalid`,
  })),
  classes: Array.from({ length: 10 }, (_, index) => ({
    id: `class-${index}`,
    startTime: new Date(referenceDate.getTime() - index * 86_400_000),
  })),
  bookings: Array.from({ length: 18 }, (_, index) => ({
    id: `booking-${index}`,
    classId: `class-${index % 10}`,
    clientId: `client-${index % 20}`,
    status: index < 2 ? ("CANCELLED" as const) : ("ATTENDED" as const),
    paymentStatus:
      index === 0
        ? ("EXPIRED" as const)
        : index === 1
          ? ("PAID" as const)
          : ("NOT_REQUIRED" as const),
    amount: index < 2 ? "25.00" : null,
  })),
  memberships: Array.from({ length: 12 }, (_, index) => ({
    id: `membership-${index}`,
    clientId: `client-${index % 20}`,
    status:
      index === 0
        ? ("PAST_DUE" as const)
        : index === 1
          ? ("ACTIVE" as const)
          : ("INACTIVE" as const),
    price: "119.00",
    recoveryScenario:
      index === 0
        ? ("PAST_DUE" as const)
        : index === 1
          ? ("RECOVERED" as const)
          : null,
  })),
  products: [
    { id: "product-1", name: "Grip socks", price: "18.00" },
    { id: "product-2", name: "Yoga mat", price: "42.00" },
    { id: "product-3", name: "Studio journal", price: "12.50" },
  ],
  pricingOptions: [
    { id: "pricing-1", name: "Drop-in", price: "25.00" },
    { id: "pricing-2", name: "Eight class pack", price: "119.00" },
    { id: "pricing-3", name: "Unlimited monthly", price: "149.00" },
  ],
};

test("builds broad, account-safe finance fixtures deterministically", () => {
  const first = buildFinanceFixturePlan(context, dependencies);
  const second = buildFinanceFixturePlan(context, dependencies);

  assert.deepEqual(first, second);
  assert.equal(first.payments.length, 320);
  assert.equal(first.invoices.length, 48);
  assert.equal(first.recurringInvoices.length, 8);
  assert.equal(first.reconciliationIssues.length, 32);
  assert.ok(first.bookingPayments.length > 50);
  assert.ok(first.paymentLines.length > first.payments.length);
  assert.equal(first.bookingEventTypes.length, 1);
  assert.equal(first.appointmentBookings.length, 4);
  assert.equal(first.recoveryPolicies.length, 3);
  assert.ok(first.recoveryCases.length >= 9);
  assert.ok(first.recoveryActions.length > first.recoveryCases.length);
  assert.ok(first.recoveryAttempts.length > first.recoveryCases.length);
  assert.ok(first.recoveryLinks.length >= 5);
  assert.deepEqual(
    new Set(first.ledgerEntries.map(({ kind }) => kind)),
    new Set(["PAYMENT", "REFUND", "DISPUTE", "PAYOUT", "CREDIT", "ADJUSTMENT"]),
  );
  assert.ok(
    first.ledgerEntries.every(({ provider }) => provider === "AUREA_DEMO"),
  );
  assert.ok(
    first.ledgerEntries.every(({ providerAccountId }) => !providerAccountId),
  );
  assert.ok(
    first.operations.every(({ stripeConnectionId }) => !stripeConnectionId),
  );
  assert.ok(
    first.recurringInvoices.every(
      ({ autoSend, sendReminders }) => !autoSend && !sendReminders,
    ),
  );
  assert.deepEqual(
    new Set(first.recoveryPolicies.map(({ target }) => target)),
    new Set(["INVOICE", "MEMBERSHIP", "BOOKING"]),
  );
  assert.ok(
    new Set(
      first.recoveryPolicies.map(({ scheduleDays, steps }) =>
        JSON.stringify({ scheduleDays, steps }),
      ),
    ).size >= 2,
  );
  assert.deepEqual(
    new Set(first.recoveryCases.map(({ status }) => status)),
    new Set(["OPEN", "IN_PROGRESS", "RECOVERED", "EXHAUSTED"]),
  );
  assert.ok(
    first.recoveryCases.every(
      ({ providerAccountId, providerAccountRef, stripeConnectionId }) =>
        !providerAccountId && !providerAccountRef && !stripeConnectionId,
    ),
  );
  assert.ok(
    first.recoveryCases.some(
      ({ membershipId, status }) =>
        membershipId === "membership-0" && status === "IN_PROGRESS",
    ),
  );
  assert.ok(
    first.recoveryCases.some(
      ({ membershipId, status }) =>
        membershipId === "membership-1" && status === "RECOVERED",
    ),
  );
  assert.ok(
    new Set(first.invoiceReminders.map(({ deliveryStatus }) => deliveryStatus))
      .size >= 4,
  );
  assert.ok(
    first.reconciliationRuns.every(
      ({ status }) => status === "COMPLETED" || status === "FAILED",
    ),
  );
  const successfulPaymentIds = new Set(
    first.payments
      .filter(({ status }) => status === "SUCCEEDED")
      .map(({ id }) => id),
  );
  const linePayments = new Map(
    first.paymentLines.map(({ id, paymentId }) => [id, paymentId]),
  );
  assert.ok(
    first.bookingPayments.every(
      ({ paymentId, lineItemId, visitRefNo, mindbodyPmtRefNo }) =>
        paymentId &&
        successfulPaymentIds.has(paymentId) &&
        lineItemId &&
        linePayments.get(lineItemId) === paymentId &&
        visitRefNo.startsWith("DEMO-VISIT-") &&
        mindbodyPmtRefNo.startsWith("DEMO-PAYMENT-"),
    ),
  );
});

test("keeps payments, invoice balances, ledger fees, and tenders exact in minor units", () => {
  const plan = buildFinanceFixturePlan(context, dependencies);
  const exponent = currencyExponent(context.currency);

  assert.doesNotThrow(() => assertFinanceFixturePlan(plan, exponent));

  const invoiceLineTotals = new Map<string, number>();
  for (const line of plan.invoiceLines) {
    invoiceLineTotals.set(
      line.invoiceId,
      (invoiceLineTotals.get(line.invoiceId) ?? 0) +
        decimalToMinorUnits(String(line.amount), exponent),
    );
  }
  for (const current of plan.invoices) {
    assert.equal(
      decimalToMinorUnits(String(current.subtotal), exponent),
      invoiceLineTotals.get(current.id),
    );
    const total = decimalToMinorUnits(String(current.total), exponent);
    const paid = decimalToMinorUnits(String(current.amountPaid), exponent);
    const due = decimalToMinorUnits(String(current.amountDue), exponent);
    assert.equal(paid + due, total);
  }
});

test("covers more than two years without future-dated payments", () => {
  const plan = buildFinanceFixturePlan(context, dependencies);
  const paymentDates = plan.payments.map(
    ({ createdAt }) => createdAt?.getTime() ?? 0,
  );

  assert.ok(Math.max(...paymentDates) <= referenceDate.getTime());
  assert.ok(
    Math.min(...paymentDates) <= referenceDate.getTime() - 24 * 30 * 86_400_000,
  );
});

test("keeps exhaustive recovery fixtures linked while scaling finance samples", () => {
  const qaContext: DemoSeedContext = {
    ...context,
    runId: "run-demo-finance-qa",
    profile: "QA_EXHAUSTIVE",
    profileConfig: DEMO_DATA_PROFILE_CONFIG.QA_EXHAUSTIVE,
  };
  const plan = buildFinanceFixturePlan(qaContext, dependencies);

  assert.equal(plan.payments.length, 900);
  assert.equal(plan.invoices.length, 160);
  assert.equal(plan.recoveryPolicies.length, 3);
  assert.ok(plan.recoveryCases.length >= 9);
  assert.ok(
    plan.recoveryCases.every((recoveryCase) =>
      plan.recoveryActions.some(({ caseId }) => caseId === recoveryCase.id),
    ),
  );
  assert.ok(
    plan.recoveryCases.every((recoveryCase) =>
      plan.recoveryAttempts.some(({ caseId }) => caseId === recoveryCase.id),
    ),
  );
});
