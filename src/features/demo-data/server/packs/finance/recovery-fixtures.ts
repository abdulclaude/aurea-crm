import {
  currencyExponent,
  decimalToMinorUnits,
} from "@/features/commerce/lib/money";
import {
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import { addRecoveryLifecycle } from "./recovery-lifecycle";
import type { RecoverySourceFixtures } from "./recovery-sources";
import type { FinanceFixturePlan, FinancePackDependencies } from "./types";

export type RecoveryCaseSeed = {
  key: string;
  target: "INVOICE" | "MEMBERSHIP" | "BOOKING";
  clientId: string;
  sourceId: string;
  sourceKind: "invoice" | "membership" | "booking" | "studioBooking";
  status: "OPEN" | "IN_PROGRESS" | "RECOVERED" | "EXHAUSTED";
  amountMinor: number;
  operationId?: string;
  scenario: string;
};

export function buildPaymentRecoveryFixtures(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  dependencies: FinancePackDependencies,
  sources: RecoverySourceFixtures,
): void {
  plan.recoveryMembershipSourceIds = dependencies.memberships.map(
    ({ id }) => id,
  );
  const policyByTarget = buildPolicies(plan, context);
  linkInvoiceReminderStates(plan, policyByTarget.INVOICE);
  const cases = selectRecoveryCases(plan, context, dependencies, sources);
  for (const [index, fixture] of cases.entries()) {
    addRecoveryLifecycle(
      plan,
      context,
      fixture,
      index,
      policyByTarget[fixture.target],
    );
  }
}

function buildPolicies(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
): Record<"INVOICE" | "MEMBERSHIP" | "BOOKING", string> {
  const definitions = [
    {
      target: "INVOICE" as const,
      name: "Invoice recovery - measured follow-up",
      grace: 0,
      schedule: [0, 3, 7, 14],
      steps: ["SEND_EMAIL", "SEND_EMAIL", "SEND_SMS", "CREATE_TASK"] as const,
    },
    {
      target: "MEMBERSHIP" as const,
      name: "Membership recovery - grace and retention",
      grace: 5,
      schedule: [0, 2, 5, 10],
      steps: [
        "SEND_EMAIL",
        "DISPATCH_WORKFLOW",
        "CREATE_TASK",
        "GRACE_PERIOD_END",
      ] as const,
    },
    {
      target: "BOOKING" as const,
      name: "Booking recovery - protect capacity",
      grace: 0,
      schedule: [0, 1, 2],
      steps: ["SEND_EMAIL", "RELEASE_BOOKING", "CREATE_TASK"] as const,
    },
  ];
  const result = {} as Record<"INVOICE" | "MEMBERSHIP" | "BOOKING", string>;
  for (const definition of definitions) {
    const id = deterministicDemoId(
      context.runId,
      "payment-recovery-policy",
      definition.target,
    );
    result[definition.target] = id;
    plan.recoveryPolicies.push({
      id,
      organizationId: context.organizationId,
      locationId: context.locationId,
      target: definition.target,
      mode: "ENABLED",
      name: definition.name,
      version: 1,
      gracePeriodDays: definition.grace,
      scheduleDays: definition.schedule,
      maxActions: definition.steps.length,
      steps: definition.steps.map((type) => ({ type })),
      isActive: true,
      createdBy: context.actorUserId,
      createdAt: context.referenceDate,
      updatedAt: context.referenceDate,
    });
  }
  return result;
}

function selectRecoveryCases(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  dependencies: FinancePackDependencies,
  sources: RecoverySourceFixtures,
): RecoveryCaseSeed[] {
  const exponent = currencyExponent(context.currency);
  const overdueInvoices = plan.invoices.filter(
    (item) => item.status === "OVERDUE",
  );
  const paidInvoice = plan.invoices.find((item) => item.status === "PAID");
  const pastDueMembership = dependencies.memberships.find(
    (item) => item.status === "PAST_DUE",
  );
  const recoveredMembership = dependencies.memberships.find(
    (item) => item.status === "ACTIVE" && item.recoveryScenario === "RECOVERED",
  );
  if (
    overdueInvoices.length < 2 ||
    !paidInvoice ||
    !pastDueMembership ||
    !recoveredMembership
  ) {
    throw new Error(
      "Finance recovery fixtures require overdue and paid invoices plus active and past-due memberships",
    );
  }
  const sourceClient = (sourceId: string) => {
    const item = dependencies.clients.find(({ id }) => id === sourceId);
    if (!item) throw new Error("Recovery fixture client was not found");
    return item;
  };
  const invoiceAmount = (value: string | number | null | undefined) =>
    decimalToMinorUnits(String(value ?? "0"), exponent);
  const fixtures: RecoveryCaseSeed[] = [
    {
      key: "invoice-open",
      target: "INVOICE",
      clientId: overdueInvoices[0]!.clientId!,
      sourceId: overdueInvoices[0]!.id,
      sourceKind: "invoice",
      status: "IN_PROGRESS",
      amountMinor: invoiceAmount(overdueInvoices[0]!.amountDue),
      scenario: "OPEN_DUNNING",
    },
    {
      key: "invoice-exhausted",
      target: "INVOICE",
      clientId: overdueInvoices[1]!.clientId!,
      sourceId: overdueInvoices[1]!.id,
      sourceKind: "invoice",
      status: "EXHAUSTED",
      amountMinor: invoiceAmount(overdueInvoices[1]!.amountDue),
      scenario: "EXHAUSTED_DUNNING",
    },
    {
      key: "invoice-recovered",
      target: "INVOICE",
      clientId: paidInvoice.clientId!,
      sourceId: paidInvoice.id,
      sourceKind: "invoice",
      status: "RECOVERED",
      amountMinor: invoiceAmount(paidInvoice.total),
      scenario: "RECOVERED",
    },
    {
      key: "membership-past-due",
      target: "MEMBERSHIP",
      clientId: pastDueMembership.clientId,
      sourceId: pastDueMembership.id,
      sourceKind: "membership",
      status: "IN_PROGRESS",
      amountMinor: invoiceAmount(pastDueMembership.price),
      scenario: "PAST_DUE_IN_GRACE",
    },
    {
      key: "membership-recovered",
      target: "MEMBERSHIP",
      clientId: recoveredMembership.clientId,
      sourceId: recoveredMembership.id,
      sourceKind: "membership",
      status: "RECOVERED",
      amountMinor: invoiceAmount(recoveredMembership.price),
      scenario: "RECOVERED",
    },
  ];
  for (const item of [
    {
      key: "appointment-abandoned",
      id: sources.appointmentAbandonedId,
      status: "EXHAUSTED" as const,
      scenario: "ABANDONED_HOLD",
    },
    {
      key: "appointment-late-paid",
      id: sources.appointmentLatePaidId,
      status: "IN_PROGRESS" as const,
      scenario: "LATE_PAYMENT_REVIEW",
    },
    {
      key: "appointment-failed",
      id: sources.appointmentFailedId,
      status: "OPEN" as const,
      scenario: "PAYMENT_FAILED",
    },
  ]) {
    const appointment = plan.appointmentBookings.find(
      ({ id }) => id === item.id,
    );
    const selectedClient = appointment?.clientId
      ? sourceClient(appointment.clientId)
      : null;
    if (!appointment || !selectedClient) continue;
    fixtures.push({
      key: item.key,
      target: "BOOKING",
      clientId: selectedClient.id,
      sourceId: appointment.id,
      sourceKind: "booking",
      status: item.status,
      amountMinor: 6_500,
      operationId: sources.operationBySourceId.get(appointment.id),
      scenario: item.scenario,
    });
  }
  for (const item of [
    {
      key: "class-abandoned",
      id: sources.studioAbandonedId,
      status: "EXHAUSTED" as const,
      scenario: "ABANDONED_HOLD",
    },
    {
      key: "class-late-paid",
      id: sources.studioLatePaidId,
      status: "IN_PROGRESS" as const,
      scenario: "LATE_PAYMENT_REVIEW",
    },
  ]) {
    const selected = dependencies.bookings.find(({ id }) => id === item.id);
    if (!selected?.clientId) continue;
    fixtures.push({
      key: item.key,
      target: "BOOKING",
      clientId: selected.clientId,
      sourceId: selected.id,
      sourceKind: "studioBooking",
      status: item.status,
      amountMinor: invoiceAmount(selected.amount ?? "25.00"),
      operationId: sources.operationBySourceId.get(selected.id),
      scenario: item.scenario,
    });
  }
  return fixtures;
}

function linkInvoiceReminderStates(
  plan: FinanceFixturePlan,
  invoicePolicyId: string,
): void {
  const overdueIds = new Set(
    plan.invoices
      .filter(({ status }) => status === "OVERDUE")
      .map(({ id }) => id),
  );
  let sequence = 0;
  for (const reminder of plan.invoiceReminders) {
    if (!overdueIds.has(reminder.invoiceId)) continue;
    reminder.policyId = invoicePolicyId;
    reminder.policyVersion = 1;
    reminder.stepKey = `demo:${invoicePolicyId}:${sequence}`;
    reminder.isDunning = true;
    sequence += 1;
  }
}
