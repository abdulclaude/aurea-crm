import "server-only";

import { sql } from "drizzle-orm";

import {
  checkIn,
  classSeries,
  classWaitlist,
  client,
  studioBooking,
  studioClass,
} from "@/db/schema";
import type { CatalogPackOutput } from "@/features/demo-data/server/packs/catalog-pack";
import type { DemoClient } from "@/features/demo-data/server/packs/customer-pack";
import {
  demoMetadata,
  deterministicDemoId,
  recordRefs,
  type DemoDataTransaction,
  type DemoPackResult,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";

export type SchedulePackOutput = DemoPackResult & {
  classes: Array<{ id: string; startTime: Date }>;
  bookings: Array<{
    id: string;
    classId: string;
    clientId: string;
    status: "BOOKED" | "ATTENDED" | "CANCELLED" | "NO_SHOW" | "LATE_CANCEL";
    paymentStatus:
      | "NOT_REQUIRED"
      | "REQUIRES_PAYMENT"
      | "PROCESSING"
      | "PAID"
      | "FAILED"
      | "EXPIRED"
      | "REFUNDED";
    amount: string | null;
  }>;
};

type ClassBlueprint = {
  id: string;
  startTime: Date;
  endTime: Date;
  classIndex: number;
  isFuture: boolean;
};

function atLocalishHour(
  reference: Date,
  dayOffset: number,
  hour: number,
): Date {
  const value = new Date(reference);
  value.setHours(hour, 0, 0, 0);
  value.setDate(value.getDate() + dayOffset);
  return value;
}

function buildBlueprints(context: DemoSeedContext): ClassBlueprint[] {
  const qa = context.profile === "QA_EXHAUSTIVE";
  const denseDays = qa ? 180 : 90;
  const densePerDay = qa ? 4 : 2;
  const oldStep = qa ? 5 : 14;
  const futurePerDay = qa ? 3 : 2;
  const offsets: Array<{ day: number; slot: number; future: boolean }> = [];

  for (let day = 1; day <= denseDays; day += 1) {
    for (let slot = 0; slot < densePerDay; slot += 1)
      offsets.push({ day: -day, slot, future: false });
  }
  for (
    let day = denseDays + oldStep;
    day <= context.profileConfig.historicalClassDays;
    day += oldStep
  ) {
    offsets.push({ day: -day, slot: day % 3, future: false });
  }
  for (let day = 0; day < context.profileConfig.futureClassDays; day += 1) {
    for (let slot = 0; slot < futurePerDay; slot += 1)
      offsets.push({ day, slot, future: true });
  }

  return offsets.map((entry, index) => {
    const startTime = atLocalishHour(
      context.referenceDate,
      entry.day,
      7 + entry.slot * 4,
    );
    return {
      id: deterministicDemoId(context.runId, "class", index),
      startTime,
      endTime: new Date(startTime.getTime() + 60 * 60_000),
      classIndex: index,
      isFuture: entry.future,
    };
  });
}

export async function seedSchedulePack(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
  dependencies: {
    catalog: Pick<
      CatalogPackOutput,
      "classTypes" | "instructors" | "rooms" | "services"
    >;
    clients: DemoClient[];
  },
): Promise<SchedulePackOutput> {
  const { catalog, clients } = dependencies;
  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const blueprints = buildBlueprints(context);
  const bookingRows: Array<typeof studioBooking.$inferInsert> = [];
  const waitlistRows: Array<typeof classWaitlist.$inferInsert> = [];
  const checkedInRows: Array<typeof checkIn.$inferInsert> = [];
  const classRows: Array<typeof studioClass.$inferInsert> = [];

  for (const blueprint of blueprints) {
    const selectedRoom =
      catalog.rooms[blueprint.classIndex % catalog.rooms.length];
    const selectedType =
      catalog.classTypes[blueprint.classIndex % catalog.classTypes.length];
    const selectedService =
      catalog.services.find((item) => item.classTypeId === selectedType.id) ??
      catalog.services[0];
    const selectedInstructor =
      catalog.instructors[blueprint.classIndex % catalog.instructors.length];
    const classCancelled =
      !blueprint.isFuture && blueprint.classIndex % 47 === 0;
    const full = blueprint.isFuture && blueprint.classIndex % 7 === 0;
    const baseBooked = full
      ? selectedRoom.capacity
      : Math.max(
          3,
          Math.min(
            selectedRoom.capacity - 1,
            5 +
              ((blueprint.classIndex * 7) %
                Math.max(4, selectedRoom.capacity - 2)),
          ),
        );
    const selectedClients = Array.from(
      { length: baseBooked },
      (_, bookingIndex) =>
        clients[
          (blueprint.classIndex * 11 + bookingIndex * 7) % clients.length
        ],
    );
    const uniqueClients = [
      ...new Map(selectedClients.map((item) => [item.id, item])).values(),
    ];

    for (const [bookingIndex, selectedClient] of uniqueClients.entries()) {
      const paymentScenario = blueprint.isFuture
        ? bookingIndex === 0 && blueprint.classIndex % 9 === 0
          ? "ABANDONED"
          : bookingIndex === 1 && blueprint.classIndex % 11 === 0
            ? "LATE_PAID"
            : bookingIndex === 2 && blueprint.classIndex % 13 === 0
              ? "ACTIVE_HOLD"
              : null
        : null;
      const status = blueprint.isFuture
        ? paymentScenario === "ABANDONED" || paymentScenario === "LATE_PAID"
          ? ("CANCELLED" as const)
          : bookingIndex % 11 === 0
            ? ("CANCELLED" as const)
            : ("BOOKED" as const)
        : classCancelled
          ? ("CANCELLED" as const)
          : bookingIndex % 19 === 0
            ? ("NO_SHOW" as const)
            : bookingIndex % 23 === 0
              ? ("LATE_CANCEL" as const)
              : bookingIndex % 29 === 0
                ? ("CANCELLED" as const)
                : ("ATTENDED" as const);
      const bookedAt = new Date(
        blueprint.startTime.getTime() - (2 + (bookingIndex % 12)) * 86_400_000,
      );
      const checkedInAt =
        status === "ATTENDED"
          ? new Date(
              blueprint.startTime.getTime() + (bookingIndex % 4) * 60_000,
            )
          : null;
      const bookingId = deterministicDemoId(
        context.runId,
        "booking",
        `${blueprint.classIndex}-${bookingIndex}`,
      );
      const paymentStatus =
        paymentScenario === "ABANDONED"
          ? ("EXPIRED" as const)
          : paymentScenario === "LATE_PAID"
            ? ("PAID" as const)
            : paymentScenario === "ACTIVE_HOLD"
              ? ("PROCESSING" as const)
              : ("NOT_REQUIRED" as const);
      const amount = paymentScenario
        ? (selectedService.price ?? "25.00")
        : null;
      bookingRows.push({
        id: bookingId,
        classId: blueprint.id,
        clientId: selectedClient.id,
        status,
        bookedAt,
        checkedInAt,
        cancelledAt:
          status === "CANCELLED" || status === "LATE_CANCEL"
            ? paymentScenario
              ? context.referenceDate
              : new Date(blueprint.startTime.getTime() - 4 * 60 * 60_000)
            : null,
        cancellationReason:
          paymentScenario === "ABANDONED"
            ? "Payment hold expired"
            : paymentScenario === "LATE_PAID"
              ? "Payment completed after the hold was released"
              : status === "CANCELLED"
                ? "Plans changed"
                : status === "LATE_CANCEL"
                  ? "Late cancellation"
                  : null,
        paymentStatus,
        paymentId:
          paymentScenario === "LATE_PAID"
            ? `demo-late-class-payment-${context.runId}-${blueprint.classIndex}`
            : null,
        amount,
        currency: paymentScenario ? context.currency : null,
        paymentRequiredAt: paymentScenario ? bookedAt : null,
        paymentFailureAt:
          paymentScenario === "ABANDONED" ? context.referenceDate : null,
        holdExpiresAt:
          paymentScenario === "ACTIVE_HOLD"
            ? new Date(context.referenceDate.getTime() + 30 * 60_000)
            : paymentScenario
              ? new Date(context.referenceDate.getTime() - 30 * 60_000)
              : null,
        confirmedAt:
          status === "BOOKED" && paymentScenario !== "ACTIVE_HOLD"
            ? bookedAt
            : null,
        releasedAt:
          paymentScenario === "ABANDONED" || paymentScenario === "LATE_PAID"
            ? context.referenceDate
            : null,
        metadata: demoMetadata(context, { paymentScenario }),
        createdAt: bookedAt,
        updatedAt: blueprint.isFuture
          ? context.referenceDate
          : blueprint.startTime,
      });
      if (checkedInAt) {
        checkedInRows.push({
          id: deterministicDemoId(context.runId, "check-in", bookingId),
          ...scope,
          clientId: selectedClient.id,
          classId: blueprint.id,
          method: ["MANUAL", "QR_CODE", "GEO"][bookingIndex % 3] as
            | "MANUAL"
            | "QR_CODE"
            | "GEO",
          checkedInAt,
          checkedInBy: context.actorUserId,
          isLateArrival: bookingIndex % 17 === 0,
          metadata: demoMetadata(context),
          createdAt: checkedInAt,
        });
      }
    }

    if (full) {
      for (let position = 1; position <= 3; position += 1) {
        const selectedClient =
          clients[
            (blueprint.classIndex * 13 + baseBooked + position) % clients.length
          ];
        waitlistRows.push({
          id: deterministicDemoId(
            context.runId,
            "waitlist",
            `${blueprint.classIndex}-${position}`,
          ),
          classId: blueprint.id,
          clientId: selectedClient.id,
          position,
          joinedAt: new Date(
            context.referenceDate.getTime() - position * 86_400_000,
          ),
          status: ["WAITING", "NOTIFIED", "CONFIRMED"][position - 1] as
            | "WAITING"
            | "NOTIFIED"
            | "CONFIRMED",
          notifiedAt: position > 1 ? context.referenceDate : null,
          respondedAt: position === 3 ? context.referenceDate : null,
          createdAt: new Date(
            context.referenceDate.getTime() - position * 86_400_000,
          ),
          updatedAt: context.referenceDate,
        });
      }
    }

    classRows.push({
      id: blueprint.id,
      ...scope,
      classTypeId: selectedType.id,
      serviceTypeId: selectedService.id,
      instructorId: selectedInstructor.id,
      instructorName: selectedInstructor.name,
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      name: selectedType.name,
      description: "Coherent synthetic class fixture",
      startTime: blueprint.startTime,
      endTime: blueprint.endTime,
      maxCapacity: selectedRoom.capacity,
      minCapacity: 3,
      bookedCount: uniqueClients.filter((_, i) => i % 11 !== 0).length,
      status: blueprint.isFuture
        ? "SCHEDULED"
        : classCancelled
          ? "CANCELLED"
          : "COMPLETED",
      color: selectedType.color,
      currency: context.currency,
      pricingModel: selectedService.price ? "DROP_IN" : "FREE",
      dropInPrice: selectedService.price,
      isRecurring: false,
      isVirtual: blueprint.classIndex % 9 === 0,
      waitlistEnabled: full,
      autoPromoteWaitlist: full,
      onlineBookingEnabled: true,
      metadata: demoMetadata(context),
      createdAt: blueprint.startTime,
      updatedAt: context.referenceDate,
    });
  }

  for (let offset = 0; offset < classRows.length; offset += 250) {
    await tx.insert(studioClass).values(classRows.slice(offset, offset + 250));
  }
  for (let offset = 0; offset < bookingRows.length; offset += 500) {
    await tx
      .insert(studioBooking)
      .values(bookingRows.slice(offset, offset + 500));
  }
  for (let offset = 0; offset < checkedInRows.length; offset += 500) {
    await tx.insert(checkIn).values(checkedInRows.slice(offset, offset + 500));
  }
  if (waitlistRows.length > 0)
    await tx.insert(classWaitlist).values(waitlistRows);

  const seriesRows = Array.from(
    { length: context.profile === "QA_EXHAUSTIVE" ? 12 : 6 },
    (_, index) => ({
      id: deterministicDemoId(context.runId, "class-series", index),
      ...scope,
      serviceTypeId: catalog.services[index % catalog.services.length].id,
      classTypeId: catalog.classTypes[index % catalog.classTypes.length].id,
      roomId: catalog.rooms[index % catalog.rooms.length].id,
      name: `${catalog.classTypes[index % catalog.classTypes.length].name} weekly series`,
      description: "Synthetic recurring series",
      startDate: context.referenceDate,
      endDate: new Date(context.referenceDate.getTime() + 84 * 86_400_000),
      startTime: `${String(7 + (index % 10)).padStart(2, "0")}:00`,
      endTime: `${String(8 + (index % 10)).padStart(2, "0")}:00`,
      recurrenceRule: "FREQ=WEEKLY;INTERVAL=1;COUNT=12",
      recurrenceDays: index % 2 === 0 ? ["MO", "WE"] : ["TU", "TH"],
      instructorIds: [
        catalog.instructors[index % catalog.instructors.length].id,
      ],
      capacity: catalog.rooms[index % catalog.rooms.length].capacity,
      status: ["ACTIVE", "PAUSED", "CANCELLED"][index % 3],
      metadata: demoMetadata(context),
      createdAt: context.referenceDate,
      updatedAt: context.referenceDate,
    }),
  ) satisfies Array<typeof classSeries.$inferInsert>;
  await tx.insert(classSeries).values(seriesRows);

  await tx.execute(sql`
    update ${client} as selected_client
    set
      "attendanceCount" = attendance.total,
      "lastInteractionAt" = attendance.last_visit,
      "updatedAt" = greatest(selected_client."updatedAt", attendance.last_visit)
    from (
      select ${checkIn.clientId} as client_id, count(*)::int as total, max(${checkIn.checkedInAt}) as last_visit
      from ${checkIn}
      where ${checkIn.organizationId} = ${context.organizationId}
        and ${checkIn.locationId} = ${context.locationId}
      group by ${checkIn.clientId}
    ) attendance
    where selected_client."id" = attendance.client_id
      and selected_client."organizationId" = ${context.organizationId}
      and selected_client."locationId" = ${context.locationId}
  `);

  const groups = [
    ["StudioClass", classRows],
    ["StudioBooking", bookingRows],
    ["CheckIn", checkedInRows],
    ["ClassWaitlist", waitlistRows],
    ["ClassSeries", seriesRows],
  ] as const;
  return {
    counts: Object.fromEntries(groups.map(([key, rows]) => [key, rows.length])),
    records: groups.flatMap(([key, rows]) => recordRefs(key, rows)),
    classes: classRows.map(({ id, startTime }) => ({ id, startTime })),
    bookings: bookingRows.map(
      ({ id, classId, clientId, status, paymentStatus, amount }) => ({
        id,
        classId,
        clientId,
        status: status ?? "BOOKED",
        paymentStatus: paymentStatus ?? "NOT_REQUIRED",
        amount: amount ?? null,
      }),
    ),
  };
}
