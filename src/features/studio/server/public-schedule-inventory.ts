import "server-only";

import { addDays } from "date-fns";
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  or,
} from "drizzle-orm";

import { db } from "@/db";
import {
  classType,
  instructor,
  location,
  room,
  serviceType,
  studioBooking,
  studioClass,
} from "@/db/schema";

const PUBLIC_SCHEDULE_LIMIT = 500;

type PublicScheduleScope = {
  organizationId: string;
  locationId: string | null;
};

function exactLocation(column: typeof studioClass.locationId, locationId: string | null) {
  return locationId ? eq(column, locationId) : isNull(column);
}

function relatedResourceScope(
  scope: PublicScheduleScope,
  resource: typeof serviceType | typeof classType,
) {
  return and(
    eq(resource.organizationId, scope.organizationId),
    scope.locationId
      ? eq(resource.locationId, scope.locationId)
      : isNull(resource.locationId),
  );
}

export async function getPublicScheduleInventory(input: {
  scope: PublicScheduleScope;
  maxDaysAhead: number;
  classTypeIds: string[];
}) {
  const from = new Date();
  const to = addDays(from, input.maxDaysAhead);
  const [serviceRows, classTypeRows, instructorRows, roomRows, locationRows] =
    await Promise.all([
      db
        .select({ id: serviceType.id })
        .from(serviceType)
        .where(
          and(
            relatedResourceScope(input.scope, serviceType),
            eq(serviceType.isActive, true),
            eq(serviceType.visibility, "PUBLIC"),
          ),
        ),
      db
        .select({ id: classType.id })
        .from(classType)
        .where(
          and(
            relatedResourceScope(input.scope, classType),
            eq(classType.isActive, true),
          ),
        ),
      db
        .select({ id: instructor.id })
        .from(instructor)
        .where(
          and(
            eq(instructor.organizationId, input.scope.organizationId),
            input.scope.locationId
              ? eq(instructor.locationId, input.scope.locationId)
              : isNull(instructor.locationId),
            eq(instructor.isActive, true),
            eq(instructor.isSystem, false),
          ),
        ),
      db
        .select({ id: room.id })
        .from(room)
        .where(
          and(
            eq(room.organizationId, input.scope.organizationId),
            input.scope.locationId
              ? eq(room.locationId, input.scope.locationId)
              : isNull(room.locationId),
          ),
        ),
      input.scope.locationId
        ? db
            .select({ timezone: location.timezone })
            .from(location)
            .where(
              and(
                eq(location.organizationId, input.scope.organizationId),
                eq(location.id, input.scope.locationId),
                eq(location.isActive, true),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
    ]);

  const allowedServiceIds = serviceRows.map((row) => row.id);
  const allowedClassTypeIds = classTypeRows.map((row) => row.id);
  const allowedInstructorIds = instructorRows.map((row) => row.id);
  const allowedRoomIds = roomRows.map((row) => row.id);
  const rows = await db.query.studioClass.findMany({
      where: and(
        eq(studioClass.organizationId, input.scope.organizationId),
        exactLocation(studioClass.locationId, input.scope.locationId),
        eq(studioClass.status, "SCHEDULED"),
        eq(studioClass.onlineBookingEnabled, true),
        gte(studioClass.startTime, from),
        lt(studioClass.startTime, to),
        input.classTypeIds.length
          ? inArray(studioClass.classTypeId, input.classTypeIds)
          : undefined,
        allowedServiceIds.length
          ? or(
              isNull(studioClass.serviceTypeId),
              inArray(studioClass.serviceTypeId, allowedServiceIds),
            )
          : isNull(studioClass.serviceTypeId),
        allowedClassTypeIds.length
          ? or(
              isNull(studioClass.classTypeId),
              inArray(studioClass.classTypeId, allowedClassTypeIds),
            )
          : isNull(studioClass.classTypeId),
        allowedInstructorIds.length
          ? or(
              isNull(studioClass.instructorId),
              inArray(studioClass.instructorId, allowedInstructorIds),
            )
          : isNull(studioClass.instructorId),
        allowedRoomIds.length
          ? or(
              isNull(studioClass.roomId),
              inArray(studioClass.roomId, allowedRoomIds),
            )
          : isNull(studioClass.roomId),
      ),
      columns: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        maxCapacity: true,
        onlineCapacity: true,
        difficulty: true,
        dropInPrice: true,
        currency: true,
        isVirtual: true,
      },
      with: {
        classType: { columns: { name: true, color: true } },
        serviceType: { columns: { name: true, calendarColor: true } },
        instructor: { columns: { name: true, isActive: true } },
        room: { columns: { name: true } },
        studioBookings: {
          where: eq(studioBooking.status, "BOOKED"),
          columns: { id: true },
        },
      },
      orderBy: asc(studioClass.startTime),
      limit: PUBLIC_SCHEDULE_LIMIT + 1,
  });

  return {
    timezone: locationRows[0]?.timezone ?? "UTC",
    truncated: rows.length > PUBLIC_SCHEDULE_LIMIT,
    classes: rows.slice(0, PUBLIC_SCHEDULE_LIMIT).map((row) => ({
      ...row,
      instructor: row.instructor?.isActive
        ? { name: row.instructor.name }
        : null,
      bookedCount: row.studioBookings.length,
      capacity: row.onlineCapacity ?? row.maxCapacity,
    })),
  };
}
