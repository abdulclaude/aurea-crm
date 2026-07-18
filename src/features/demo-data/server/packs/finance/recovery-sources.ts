import { currencyExponent } from "@/features/commerce/lib/money";
import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import { DAY, DEMO_FINANCE_PROVIDER } from "./constants";
import type { FinanceFixturePlan, FinancePackDependencies } from "./types";

export type RecoverySourceFixtures = {
  appointmentAbandonedId: string;
  appointmentLatePaidId: string;
  appointmentFailedId: string;
  studioAbandonedId: string | null;
  studioLatePaidId: string | null;
  operationBySourceId: Map<string, string>;
};

export function buildRecoverySourceFixtures(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  dependencies: FinancePackDependencies,
): RecoverySourceFixtures {
  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const eventTypeId = deterministicDemoId(
    context.runId,
    "recovery-booking-event-type",
    0,
  );
  plan.bookingEventTypes.push({
    id: eventTypeId,
    ...scope,
    title: "Private recovery consultation",
    slug: `demo-recovery-consultation-${context.runId.slice(0, 8)}`,
    description:
      "Synthetic paid appointment used to demonstrate payment recovery.",
    length: 45,
    availableDurations: [45],
    minimumBookingNotice: 60,
    slotInterval: 15,
    locationType: "IN_PERSON",
    locationValue: "Private Suite",
    requiresPayment: true,
    price: "65.00",
    currency: context.currency,
    isActive: true,
    metadata: demoMetadata(context, { recoveryFixture: true }),
    createdAt: context.referenceDate,
    updatedAt: context.referenceDate,
  });

  const appointmentAbandonedId = deterministicDemoId(
    context.runId,
    "recovery-appointment",
    "abandoned",
  );
  const appointmentLatePaidId = deterministicDemoId(
    context.runId,
    "recovery-appointment",
    "late-paid",
  );
  const appointmentFailedId = deterministicDemoId(
    context.runId,
    "recovery-appointment",
    "failed",
  );
  const appointmentHoldId = deterministicDemoId(
    context.runId,
    "recovery-appointment",
    "active-hold",
  );
  const appointmentStates = [
    {
      id: appointmentAbandonedId,
      clientIndex: 2,
      status: "CANCELLED" as const,
      paymentStatus: "EXPIRED" as const,
      paid: false,
      day: 2,
      released: true,
      paymentId: null,
      reason: "Payment hold expired",
    },
    {
      id: appointmentLatePaidId,
      clientIndex: 3,
      status: "CANCELLED" as const,
      paymentStatus: "PAID" as const,
      paid: true,
      day: 3,
      released: true,
      paymentId: `demo-late-appointment-payment-${context.runId}`,
      reason: "Payment completed after the appointment hold was released",
    },
    {
      id: appointmentFailedId,
      clientIndex: 4,
      status: "PENDING" as const,
      paymentStatus: "FAILED" as const,
      paid: false,
      day: 4,
      released: false,
      paymentId: null,
      reason: null,
    },
    {
      id: appointmentHoldId,
      clientIndex: 5,
      status: "PENDING" as const,
      paymentStatus: "PROCESSING" as const,
      paid: false,
      day: 5,
      released: false,
      paymentId: null,
      reason: null,
    },
  ];
  for (const fixture of appointmentStates) {
    const selectedClient = dependencies.clients[fixture.clientIndex];
    if (!selectedClient) {
      throw new Error("Finance recovery fixtures require at least six clients");
    }
    const startTime = new Date(
      context.referenceDate.getTime() + fixture.day * DAY + 5 * 60 * 60_000,
    );
    const holdExpiresAt = fixture.released
      ? new Date(context.referenceDate.getTime() - 30 * 60_000)
      : fixture.paymentStatus === "PROCESSING"
        ? new Date(context.referenceDate.getTime() + 30 * 60_000)
        : new Date(context.referenceDate.getTime() + DAY);
    plan.appointmentBookings.push({
      id: fixture.id,
      ...scope,
      eventTypeId,
      clientId: selectedClient.id,
      title: "Private recovery consultation",
      description: "Synthetic appointment payment state.",
      status: fixture.status,
      attendeeName: selectedClient.name,
      attendeeEmail: selectedClient.email,
      attendeeTimezone: context.timezone,
      startTime,
      endTime: new Date(startTime.getTime() + 45 * 60_000),
      duration: 45,
      locationType: "IN_PERSON",
      locationValue: "Private Suite",
      paid: fixture.paid,
      paymentStatus: fixture.paymentStatus,
      paymentId: fixture.paymentId,
      amount: "65.00",
      currency: context.currency,
      holdExpiresAt,
      paymentRequiredAt: new Date(context.referenceDate.getTime() - DAY),
      paymentFailureAt:
        fixture.paymentStatus === "FAILED" ||
        fixture.paymentStatus === "EXPIRED"
          ? context.referenceDate
          : null,
      releasedAt: fixture.released ? context.referenceDate : null,
      cancelledAt:
        fixture.status === "CANCELLED" ? context.referenceDate : null,
      cancellationReason: fixture.reason,
      metadata: demoMetadata(context, {
        recoveryScenario:
          fixture.id === appointmentAbandonedId
            ? "ABANDONED"
            : fixture.id === appointmentLatePaidId
              ? "LATE_PAID"
              : fixture.paymentStatus,
      }),
      createdAt: new Date(context.referenceDate.getTime() - DAY),
      updatedAt: context.referenceDate,
    });
  }

  const operationBySourceId = new Map<string, string>();
  for (const fixture of appointmentStates) {
    const operationId = addSourceOperation(plan, context, {
      sourceId: fixture.id,
      sourceType: "appointment",
      clientId: dependencies.clients[fixture.clientIndex]!.id,
      status:
        fixture.paymentStatus === "PAID"
          ? "SUCCEEDED"
          : fixture.paymentStatus === "PROCESSING"
            ? "PROVIDER_PENDING"
            : fixture.paymentStatus === "FAILED"
              ? "FAILED"
              : "CANCELLED",
    });
    operationBySourceId.set(fixture.id, operationId);
  }

  const studioAbandoned = dependencies.bookings.find(
    (item) => item.paymentStatus === "EXPIRED" && item.status === "CANCELLED",
  );
  const studioLatePaid = dependencies.bookings.find(
    (item) => item.paymentStatus === "PAID" && item.status === "CANCELLED",
  );
  for (const [scenario, source] of [
    ["studio-abandoned", studioAbandoned],
    ["studio-late-paid", studioLatePaid],
  ] as const) {
    if (!source?.clientId) continue;
    const operationId = addSourceOperation(plan, context, {
      sourceId: source.id,
      sourceType: "studio",
      clientId: source.clientId,
      status: source.paymentStatus === "PAID" ? "SUCCEEDED" : "CANCELLED",
    });
    operationBySourceId.set(source.id, operationId);
  }

  return {
    appointmentAbandonedId,
    appointmentLatePaidId,
    appointmentFailedId,
    studioAbandonedId: studioAbandoned?.id ?? null,
    studioLatePaidId: studioLatePaid?.id ?? null,
    operationBySourceId,
  };
}

function addSourceOperation(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  input: {
    sourceId: string;
    sourceType: "appointment" | "studio";
    clientId: string;
    status: "PROVIDER_PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  },
): string {
  const id = deterministicDemoId(
    context.runId,
    "recovery-commerce-operation",
    input.sourceId,
  );
  plan.operations.push({
    id,
    organizationId: context.organizationId,
    locationId: context.locationId,
    clientId: input.clientId,
    type: "CHECKOUT",
    status: input.status,
    provider: DEMO_FINANCE_PROVIDER,
    providerAccountId: null,
    stripeConnectionId: null,
    idempotencyKey: `demo:${context.runId}:recovery:${input.sourceId}`,
    amountMinor: 6_500,
    currency: context.currency,
    currencyExponent: currencyExponent(context.currency),
    bookingId: input.sourceType === "appointment" ? input.sourceId : null,
    studioBookingId: input.sourceType === "studio" ? input.sourceId : null,
    requestedBy: context.actorUserId,
    completedAt:
      input.status === "PROVIDER_PENDING" ? null : context.referenceDate,
    expiresAt:
      input.status === "PROVIDER_PENDING"
        ? new Date(context.referenceDate.getTime() + 30 * 60_000)
        : null,
    metadata: demoMetadata(context, { recoverySource: input.sourceType }),
    createdAt: new Date(context.referenceDate.getTime() - DAY),
    updatedAt: context.referenceDate,
  });
  return id;
}
