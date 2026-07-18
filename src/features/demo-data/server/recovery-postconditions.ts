import "server-only";

import { count, eq, inArray } from "drizzle-orm";

import {
  booking,
  invoiceReminder,
  paymentRecoveryAction,
  paymentRecoveryAttempt,
  paymentRecoveryCase,
  paymentRecoveryLink,
  paymentRecoveryPolicy,
  studioBooking,
  studioClass,
  studioMembership,
} from "@/db/schema";
import type {
  DemoRecordRef,
  DemoDataTransaction,
  DemoSeedContext,
} from "@/features/demo-data/server/types";

export async function assertDemoRecoveryPostconditions(
  tx: DemoDataTransaction,
  _context: DemoSeedContext,
  records: readonly DemoRecordRef[],
): Promise<void> {
  const ids = (recordType: string): string[] =>
    records
      .filter((record) => record.recordType === recordType)
      .map((record) => record.recordId);
  const policies = await tx
    .select({
      target: paymentRecoveryPolicy.target,
      gracePeriodDays: paymentRecoveryPolicy.gracePeriodDays,
      scheduleDays: paymentRecoveryPolicy.scheduleDays,
      steps: paymentRecoveryPolicy.steps,
    })
    .from(paymentRecoveryPolicy)
    .where(inArray(paymentRecoveryPolicy.id, ids("PaymentRecoveryPolicy")));
  const cases = await tx
    .select({
      status: paymentRecoveryCase.status,
      membershipId: paymentRecoveryCase.membershipId,
      providerAccountId: paymentRecoveryCase.providerAccountId,
      providerAccountRef: paymentRecoveryCase.providerAccountRef,
      stripeConnectionId: paymentRecoveryCase.stripeConnectionId,
    })
    .from(paymentRecoveryCase)
    .where(inArray(paymentRecoveryCase.id, ids("PaymentRecoveryCase")));
  const [actions] = await tx
    .select({ value: count() })
    .from(paymentRecoveryAction)
    .where(inArray(paymentRecoveryAction.id, ids("PaymentRecoveryAction")));
  const [attempts] = await tx
    .select({ value: count() })
    .from(paymentRecoveryAttempt)
    .where(inArray(paymentRecoveryAttempt.id, ids("PaymentRecoveryAttempt")));
  const [links] = await tx
    .select({ value: count() })
    .from(paymentRecoveryLink)
    .where(inArray(paymentRecoveryLink.id, ids("PaymentRecoveryLink")));
  const reminderStates = await tx
    .select({ status: invoiceReminder.deliveryStatus })
    .from(invoiceReminder)
    .where(inArray(invoiceReminder.id, ids("InvoiceReminder")));
  const memberships = await tx
    .select({
      id: studioMembership.id,
      status: studioMembership.status,
      metadata: studioMembership.metadata,
    })
    .from(studioMembership)
    .where(inArray(studioMembership.id, ids("StudioMembership")));
  const appointmentScenarios = await tx
    .select({ metadata: booking.metadata })
    .from(booking)
    .where(inArray(booking.id, ids("Booking")));
  const classScenarios = await tx
    .select({ metadata: studioBooking.metadata })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
    .where(inArray(studioBooking.id, ids("StudioBooking")));

  if (
    new Set(policies.map(({ target }) => target)).size !== 3 ||
    new Set(
      policies.map((row) =>
        JSON.stringify({
          gracePeriodDays: row.gracePeriodDays,
          scheduleDays: row.scheduleDays,
          steps: row.steps,
        }),
      ),
    ).size < 2
  ) {
    throw new Error(
      "Demo payment recovery must include every target and at least two policy configurations.",
    );
  }
  const statuses = new Set(cases.map(({ status }) => status));
  if (
    !statuses.has("OPEN") ||
    !statuses.has("IN_PROGRESS") ||
    !statuses.has("RECOVERED") ||
    !statuses.has("EXHAUSTED") ||
    cases.some((row) =>
      Boolean(
        row.providerAccountId ||
        row.providerAccountRef ||
        row.stripeConnectionId,
      ),
    ) ||
    (actions?.value ?? 0) === 0 ||
    (attempts?.value ?? 0) === 0 ||
    (links?.value ?? 0) === 0
  ) {
    throw new Error(
      "Demo payment recovery lifecycle coverage is incomplete or externally bound.",
    );
  }
  if (new Set(reminderStates.map(({ status }) => status)).size < 4) {
    throw new Error(
      "Demo invoice reminders need at least four delivery states.",
    );
  }
  if (
    !memberships.some(
      ({ id, status }) =>
        status === "PAST_DUE" &&
        cases.some(({ membershipId }) => membershipId === id),
    ) ||
    !memberships.some(
      ({ id, status, metadata }) =>
        status === "ACTIVE" &&
        metadataValue(metadata, "recoveryScenario") === "RECOVERED" &&
        cases.some(({ membershipId }) => membershipId === id),
    )
  ) {
    throw new Error(
      "Demo memberships need linked past-due and recovered scenarios.",
    );
  }
  assertBookingScenarios(appointmentScenarios);
  assertBookingScenarios(classScenarios);
}

function assertBookingScenarios(scenarios: Array<{ metadata: unknown }>): void {
  const values = new Set(
    scenarios.map(
      ({ metadata }) =>
        metadataValue(metadata, "paymentScenario") ??
        metadataValue(metadata, "recoveryScenario"),
    ),
  );
  if (!values.has("ABANDONED") && !values.has("ABANDONED_HOLD")) {
    throw new Error("Demo booking recovery requires an abandoned hold.");
  }
  if (!values.has("LATE_PAID") && !values.has("LATE_PAYMENT_REVIEW")) {
    throw new Error("Demo booking recovery requires a late-paid scenario.");
  }
}

function metadataValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}
