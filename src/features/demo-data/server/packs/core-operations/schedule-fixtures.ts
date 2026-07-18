import type {
  deal,
  instructorAvailability,
  rota,
  shiftSwapRequest,
  timeOffRequest,
} from "@/db/schema";
import type { DemoSeedContext } from "@/features/demo-data/server/types";
import {
  PROFILE_COUNTS,
  SHIFT_SWAP_STATUSES,
  TIME_OFF_STATUSES,
} from "@/features/demo-data/server/packs/core-operations/constants";
import type {
  ClientDependency,
  InstructorDependency,
} from "@/features/demo-data/server/packs/core-operations/types";
import {
  demoMetadata,
  deterministicDemoId,
  money,
  rateMinor,
  rotaOffsets,
  utcDay,
} from "@/features/demo-data/server/packs/core-operations/utils";

export type ScheduleFixturePlan = {
  availability: Array<typeof instructorAvailability.$inferInsert>;
  timeOffRequests: Array<typeof timeOffRequest.$inferInsert>;
  rotas: Array<typeof rota.$inferInsert>;
  shiftSwaps: Array<typeof shiftSwapRequest.$inferInsert>;
};

export function buildScheduleFixtures(
  context: DemoSeedContext,
  clients: ClientDependency[],
  instructors: InstructorDependency[],
  deals: Array<typeof deal.$inferInsert>,
): ScheduleFixturePlan {
  const counts = PROFILE_COUNTS[context.profile];
  const now = context.referenceDate;
  const availability = instructors.flatMap((item, instructorIndex) =>
    Array.from({ length: 5 }, (_, dayIndex) => ({
      id: deterministicDemoId(
        context.runId,
        "instructor-availability",
        `${instructorIndex}-${dayIndex}`,
      ),
      instructorId: item.id,
      organizationId: context.organizationId,
      dayOfWeek: dayIndex + 1,
      startTime: instructorIndex % 2 === 0 ? "07:00" : "09:00",
      endTime: instructorIndex % 3 === 0 ? "15:00" : "19:00",
      isRecurring: true,
      isActive: true,
      effectiveFrom: utcDay(now, -365),
      notes: dayIndex === 4 ? "Flexible finish on Fridays" : null,
      createdAt: utcDay(now, -365),
      updatedAt: now,
    })),
  );
  const timeOffRequests = Array.from(
    { length: counts.timeOffCount },
    (_, index) => {
      const status = TIME_OFF_STATUSES[index % TIME_OFF_STATUSES.length]!;
      const startDate = utcDay(
        now,
        index % 2 === 0 ? 12 + index : -(20 + index),
        0,
      );
      return {
        id: deterministicDemoId(context.runId, "time-off", index),
        instructorId: instructors[index % instructors.length]!.id,
        organizationId: context.organizationId,
        locationId: context.locationId,
        type: ["VACATION", "SICK", "PERSONAL", "PUBLIC_HOLIDAY"][
          index % 4
        ] as "VACATION" | "SICK" | "PERSONAL" | "PUBLIC_HOLIDAY",
        startDate,
        endDate: utcDay(startDate, index % 3, 23, 59),
        totalDays: `${(index % 3) + 1}.0`,
        reason: "Demo availability request",
        status,
        requestedAt: utcDay(startDate, -14, 10),
        approvedAt:
          status === "APPROVED" ? utcDay(startDate, -12, 10) : null,
        approvedBy:
          status === "APPROVED" ? context.actorUserId : null,
        rejectedAt:
          status === "REJECTED" ? utcDay(startDate, -12, 10) : null,
        rejectedBy:
          status === "REJECTED" ? context.actorUserId : null,
        rejectionReason:
          status === "REJECTED" ? "Coverage was not available." : null,
        cancelledAt:
          status === "CANCELLED" ? utcDay(startDate, -10, 10) : null,
        cancelledBy:
          status === "CANCELLED" ? context.actorUserId : null,
        cancellationReason:
          status === "CANCELLED" ? "Plans changed." : null,
        notes: "Synthetic demo request; no external notification was sent.",
        attachments: demoMetadata(context),
        createdAt: utcDay(startDate, -14, 10),
        updatedAt: now,
      };
    },
  );
  const shiftsPerInstructor = Math.ceil(
    counts.rotaCount / instructors.length,
  );
  const offsets = rotaOffsets(shiftsPerInstructor);
  const rotas = Array.from({ length: counts.rotaCount }, (_, index) => {
    const instructorIndex = index % instructors.length;
    const ordinal = Math.floor(index / instructors.length);
    const dayOffset = offsets[ordinal]!;
    const start = utcDay(now, dayOffset, 7 + (instructorIndex % 5) * 2);
    const end = new Date(
      start.getTime() + (60 + (index % 3) * 30) * 60_000,
    );
    const status = resolveRotaStatus(dayOffset, index);
    const durationMinutes = Math.round(
      (end.getTime() - start.getTime()) / 60_000,
    );
    const scheduledMinor =
      (rateMinor(instructorIndex) * durationMinutes) / 60;
    return {
      id: deterministicDemoId(context.runId, "rota", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      instructorId: instructors[instructorIndex]!.id,
      clientId: clients[index % clients.length]!.id,
      companyName:
        index % 4 === 0 ? clients[index % clients.length]!.name : null,
      dealId: index % 3 === 0 ? deals[index % deals.length]!.id : null,
      startTime: start,
      endTime: end,
      title: [
        "Private session",
        "Corporate class",
        "Member consultation",
        "Studio support",
      ][index % 4]!,
      location: "Main studio",
      status,
      hourlyRate: money(rateMinor(instructorIndex)),
      currency: context.currency,
      billable: index % 7 !== 0,
      notes: "Synthetic demo shift.",
      customFields: demoMetadata(context),
      color: ["blue", "orange", "violet", "rose", "emerald"][index % 5]!,
      scheduledHours: money((durationMinutes * 100) / 60),
      scheduledValue: money(scheduledMinor),
      actualStartTime: status === "COMPLETED" ? start : null,
      actualEndTime: status === "COMPLETED" ? end : null,
      actualHours:
        status === "COMPLETED" ? money((durationMinutes * 100) / 60) : null,
      actualValue: status === "COMPLETED" ? money(scheduledMinor) : null,
      createdAt: utcDay(start, -30),
      updatedAt: now,
    };
  });
  const shiftSwaps = buildShiftSwaps(context, instructors, rotas);
  return { availability, timeOffRequests, rotas, shiftSwaps };
}

function resolveRotaStatus(dayOffset: number, index: number) {
  if (dayOffset >= 0) {
    if (index % 11 === 0) return "CANCELLED" as const;
    return index % 2 === 0 ? ("CONFIRMED" as const) : ("SCHEDULED" as const);
  }
  if (index % 17 === 0) return "NO_SHOW" as const;
  if (index % 13 === 0) return "CANCELLED" as const;
  return "COMPLETED" as const;
}

function buildShiftSwaps(
  context: DemoSeedContext,
  instructors: InstructorDependency[],
  rotas: Array<typeof rota.$inferInsert>,
): Array<typeof shiftSwapRequest.$inferInsert> {
  const count = Math.min(
    PROFILE_COUNTS[context.profile].shiftSwapCount,
    rotas.length,
  );
  return Array.from({ length: count }, (_, index) => {
    const selectedRota = rotas[index]!;
    const status = SHIFT_SWAP_STATUSES[index % SHIFT_SWAP_STATUSES.length]!;
    return {
      id: deterministicDemoId(context.runId, "shift-swap", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      rotaId: selectedRota.id,
      requesterId: selectedRota.instructorId,
      targetInstructorId:
        instructors.length > 1
          ? instructors[(index + 1) % instructors.length]!.id
          : null,
      status,
      reason: "Schedule conflict",
      requestedAt: utcDay(context.referenceDate, -(index % 20), 10),
      respondedAt:
        status !== "PENDING"
          ? utcDay(context.referenceDate, -(index % 19), 12)
          : null,
      respondedBy:
        status !== "PENDING"
          ? instructors[(index + 1) % instructors.length]!.id
          : null,
      adminApprovedAt:
        status === "ADMIN_APPROVED"
          ? utcDay(context.referenceDate, -(index % 18), 14)
          : null,
      adminApprovedBy:
        status === "ADMIN_APPROVED" ? context.actorUserId : null,
      adminRejectedAt:
        status === "ADMIN_REJECTED"
          ? utcDay(context.referenceDate, -(index % 18), 14)
          : null,
      adminRejectedBy:
        status === "ADMIN_REJECTED" ? context.actorUserId : null,
      rejectionReason:
        status === "ADMIN_REJECTED" || status === "INSTRUCTOR_REJECTED"
          ? "Coverage not available."
          : null,
      expiresAt: utcDay(context.referenceDate, 7 + (index % 14)),
      notificationsSent: false,
      metadata: demoMetadata(context),
      createdAt: utcDay(context.referenceDate, -(index % 20), 10),
      updatedAt: context.referenceDate,
    };
  });
}
