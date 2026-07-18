import type { deal, overtimeTracking, timeLog } from "@/db/schema";
import type { DemoSeedContext } from "@/features/demo-data/server/types";
import {
  PROFILE_COUNTS,
  TIME_LOG_STATUSES,
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
  utcDay,
} from "@/features/demo-data/server/packs/core-operations/utils";

export type TimeLogFixturePlan = {
  timeLogs: Array<typeof timeLog.$inferInsert>;
  overtime: Array<typeof overtimeTracking.$inferInsert>;
};

export function buildTimeLogFixtures(
  context: DemoSeedContext,
  clients: ClientDependency[],
  instructors: InstructorDependency[],
  deals: Array<typeof deal.$inferInsert>,
): TimeLogFixturePlan {
  const counts = PROFILE_COUNTS[context.profile];
  const now = context.referenceDate;
  const forcedCurrentLogs = Math.min(
    counts.timeLogCount - 1,
    instructors.length * 4,
  );
  const timeLogs = Array.from({ length: counts.timeLogCount }, (_, index) => {
    const instructorIndex = index % instructors.length;
    const currentMonthLog = index < forcedCurrentLogs;
    const dayOffset = currentMonthLog
      ? -(index % 12)
      : -(1 + (index % Math.max(30, context.profileConfig.historyMonths * 30)));
    const start = utcDay(now, dayOffset, 7 + (instructorIndex % 6));
    const isOpen = index === forcedCurrentLogs;
    const status = currentMonthLog
      ? "APPROVED"
      : isOpen
        ? "DRAFT"
        : TIME_LOG_STATUSES[index % TIME_LOG_STATUSES.length]!;
    const duration = 60 + (index % 8) * 30;
    const overtimeHours = index % 11 === 0 ? 1 : 0;
    const regularMinutes = Math.max(0, duration - overtimeHours * 60);
    const totalMinor =
      (rateMinor(instructorIndex) * regularMinutes) / 60 +
      (rateMinor(instructorIndex) * overtimeHours * 3) / 2;
    const end = isOpen
      ? null
      : new Date(start.getTime() + duration * 60_000);
    return {
      id: deterministicDemoId(context.runId, "time-log", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      instructorId: instructors[instructorIndex]!.id,
      clientId: clients[index % clients.length]!.id,
      dealId: index % 4 === 0 ? deals[index % deals.length]!.id : null,
      startTime: start,
      endTime: end,
      duration: isOpen ? null : duration,
      breakDuration: isOpen ? null : index % 4 === 0 ? 30 : 0,
      checkInMethod: ["MANUAL", "QR_CODE", "GPS", "BIOMETRIC", "NFC"][
        index % 5
      ] as "MANUAL" | "QR_CODE" | "GPS" | "BIOMETRIC" | "NFC",
      title: "Studio shift",
      description: "Synthetic demo time entry.",
      status,
      billable: index % 7 !== 0,
      hourlyRate: money(rateMinor(instructorIndex)),
      totalAmount: isOpen ? null : money(totalMinor),
      currency: context.currency,
      submittedAt: status === "DRAFT" ? null : end,
      submittedBy:
        status === "DRAFT" ? null : instructors[instructorIndex]!.id,
      approvedAt:
        status === "APPROVED" || status === "INVOICED" ? end : null,
      approvedBy:
        status === "APPROVED" || status === "INVOICED"
          ? context.actorUserId
          : null,
      rejectedAt: status === "REJECTED" ? end : null,
      rejectedBy: status === "REJECTED" ? context.actorUserId : null,
      rejectionReason:
        status === "REJECTED"
          ? "Please correct the recorded finish time."
          : null,
      customFields: demoMetadata(context),
      isOvertime: overtimeHours > 0,
      overtimeHours: overtimeHours > 0 ? `${overtimeHours}.00` : null,
      createdAt: start,
      updatedAt: end ?? now,
    };
  });
  const overtime = Array.from(
    { length: counts.overtimeCount },
    (_, index) => {
      const instructorIndex = index % instructors.length;
      const weekIndex = Math.floor(index / instructors.length);
      const weekStart = utcDay(now, -(weekIndex * 7 + 7), 0);
      const overtimeHours = index % 4 === 0 ? 6 : index % 3;
      const regularHours = 36 + (index % 5);
      const totalHours = regularHours + overtimeHours;
      return {
        id: deterministicDemoId(context.runId, "overtime", index),
        instructorId: instructors[instructorIndex]!.id,
        organizationId: context.organizationId,
        weekStartDate: weekStart,
        weekEndDate: utcDay(weekStart, 6, 23, 59),
        regularHours: `${regularHours}.00`,
        overtimeHours: `${overtimeHours}.00`,
        totalHours: `${totalHours}.00`,
        weeklyLimit: "40.00",
        isOverLimit: totalHours > 40,
        complianceFlags: demoMetadata(context, {
          exceedsWeeklyLimit: totalHours > 40,
        }),
        calculatedAt: utcDay(weekStart, 7, 2),
        updatedAt: now,
      };
    },
  );
  return { timeLogs, overtime };
}
