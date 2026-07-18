import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { booking, checkIn, studioBooking, studioClass } from "@/db/schema";
import type {
  CustomerTimelineCursor,
  CustomerTimelineEvent,
} from "@/features/customer-timeline/contracts";
import {
  locationScopeCondition,
  timelineCursorCondition,
  type CustomerTimelineScope,
} from "@/features/customer-timeline/server/timeline-query";

export async function listBookingTimelineEvents(input: {
  scope: CustomerTimelineScope;
  cursor?: CustomerTimelineCursor;
  limit: number;
}): Promise<CustomerTimelineEvent[]> {
  const [appointments, classes] = await Promise.all([
    db
      .select({
        id: booking.id,
        title: booking.title,
        status: booking.status,
        startTime: booking.startTime,
        createdAt: booking.createdAt,
      })
      .from(booking)
      .where(
        and(
          eq(booking.organizationId, input.scope.organizationId),
          locationScopeCondition(booking.locationId, input.scope.locationId),
          eq(booking.clientId, input.scope.clientId),
          timelineCursorCondition({
            occurredAt: booking.createdAt,
            id: booking.id,
            prefix: "appointment",
            cursor: input.cursor,
          }),
        ),
      )
      .orderBy(desc(booking.createdAt), desc(booking.id))
      .limit(input.limit + 1),
    db
      .select({
        id: studioBooking.id,
        status: studioBooking.status,
        className: studioClass.name,
        startTime: studioClass.startTime,
        bookedAt: studioBooking.bookedAt,
      })
      .from(studioBooking)
      .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
      .where(
        and(
          eq(studioBooking.clientId, input.scope.clientId),
          eq(studioClass.organizationId, input.scope.organizationId),
          locationScopeCondition(
            studioClass.locationId,
            input.scope.locationId,
          ),
          timelineCursorCondition({
            occurredAt: studioBooking.bookedAt,
            id: studioBooking.id,
            prefix: "class-booking",
            cursor: input.cursor,
          }),
        ),
      )
      .orderBy(desc(studioBooking.bookedAt), desc(studioBooking.id))
      .limit(input.limit + 1),
  ]);

  return [
    ...appointments.map(
      (row): CustomerTimelineEvent => ({
        id: `appointment:${row.id}`,
        kind: "BOOKING",
        title: row.title,
        description: "Appointment booked",
        status: row.status,
        occurredAt: row.createdAt,
        secondaryAt: row.startTime,
        money: null,
        channel: null,
      }),
    ),
    ...classes.map(
      (row): CustomerTimelineEvent => ({
        id: `class-booking:${row.id}`,
        kind: "BOOKING",
        title: row.className,
        description: "Class booked",
        status: row.status,
        occurredAt: row.bookedAt,
        secondaryAt: row.startTime,
        money: null,
        channel: null,
      }),
    ),
  ];
}

export async function listAttendanceTimelineEvents(input: {
  scope: CustomerTimelineScope;
  cursor?: CustomerTimelineCursor;
  limit: number;
}): Promise<CustomerTimelineEvent[]> {
  const rows = await db
    .select({
      id: checkIn.id,
      className: studioClass.name,
      method: checkIn.method,
      isLateArrival: checkIn.isLateArrival,
      checkedInAt: checkIn.checkedInAt,
    })
    .from(checkIn)
    .innerJoin(studioClass, eq(studioClass.id, checkIn.classId))
    .where(
      and(
        eq(checkIn.clientId, input.scope.clientId),
        eq(checkIn.organizationId, input.scope.organizationId),
        locationScopeCondition(checkIn.locationId, input.scope.locationId),
        eq(studioClass.organizationId, input.scope.organizationId),
        locationScopeCondition(studioClass.locationId, input.scope.locationId),
        timelineCursorCondition({
          occurredAt: checkIn.checkedInAt,
          id: checkIn.id,
          prefix: "attendance",
          cursor: input.cursor,
        }),
      ),
    )
    .orderBy(desc(checkIn.checkedInAt), desc(checkIn.id))
    .limit(input.limit + 1);

  return rows.map(
    (row): CustomerTimelineEvent => ({
      id: `attendance:${row.id}`,
      kind: "ATTENDANCE",
      title: row.className,
      description: `${row.method.toLowerCase().replaceAll("_", " ")} check-in`,
      status: row.isLateArrival ? "LATE" : "ATTENDED",
      occurredAt: row.checkedInAt,
      secondaryAt: null,
      money: null,
      channel: null,
    }),
  );
}
