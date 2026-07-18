import { type NextRequest } from "next/server";
import { db } from "@/db";
import { ClassInstanceStatus } from "@/db/enums";
import {
  classType,
  room,
  studioBooking,
  studioClass,
  instructor,
} from "@/db/schema";
import {
  apiError,
  requireApiKeyLocation,
  requireScope,
  validateApiKey,
} from "@/lib/api-auth";
import { occupiedStudioBookingStatuses } from "@/features/studio/server/class-booking-service";
import { addDays, startOfDay } from "date-fns";
import { and, asc, count, eq, gte, inArray, lte, type SQL } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return apiError(auth.error, 401);

  const scope = requireScope(auth.apiKey.scopes, "classes:read");
  if (!scope.ok) return apiError(scope.error, 403);
  const keyLocation = requireApiKeyLocation(auth.apiKey);
  if (!keyLocation.ok) return apiError(keyLocation.error, 403);

  const { searchParams } = req.nextUrl;
  const daysAhead = Math.min(Number(searchParams.get("days") ?? "14"), 90);
  const classTypeId = searchParams.get("classTypeId") ?? undefined;
  const instructorId = searchParams.get("instructorId") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  const from = startOfDay(new Date());
  const to = addDays(from, daysAhead);

  const conditions: SQL[] = [
    eq(studioClass.organizationId, auth.apiKey.organizationId),
    eq(studioClass.locationId, keyLocation.locationId),
    eq(studioClass.status, ClassInstanceStatus.SCHEDULED),
    gte(studioClass.startTime, from),
    lte(studioClass.startTime, to),
  ];
  if (classTypeId) {
    conditions.push(eq(studioClass.classTypeId, classTypeId));
  }
  if (instructorId) {
    conditions.push(eq(studioClass.instructorId, instructorId));
  }

  const classes = await db
    .select({
      id: studioClass.id,
      name: studioClass.name,
      description: studioClass.description,
      startTime: studioClass.startTime,
      endTime: studioClass.endTime,
      maxCapacity: studioClass.maxCapacity,
      status: studioClass.status,
      isVirtual: studioClass.isVirtual,
      difficulty: studioClass.difficulty,
      classType: {
        id: classType.id,
        name: classType.name,
        color: classType.color,
      },
      instructor: {
        id: instructor.id,
        name: instructor.name,
      },
      room: {
        id: room.id,
        name: room.name,
      },
      bookedCount: count(studioBooking.id),
    })
    .from(studioClass)
    .leftJoin(classType, eq(studioClass.classTypeId, classType.id))
    .leftJoin(instructor, eq(studioClass.instructorId, instructor.id))
    .leftJoin(room, eq(studioClass.roomId, room.id))
    .leftJoin(
      studioBooking,
      and(
        eq(studioBooking.classId, studioClass.id),
        inArray(studioBooking.status, occupiedStudioBookingStatuses),
      ),
    )
    .where(and(...conditions))
    .groupBy(
      studioClass.id,
      classType.id,
      classType.name,
      classType.color,
      instructor.id,
      instructor.name,
      room.id,
      room.name,
    )
    .orderBy(asc(studioClass.startTime))
    .limit(limit);

  const result = classes.map((c) => ({
    id: c.id,
    title: c.name,
    description: c.description,
    startTime: c.startTime,
    endTime: c.endTime,
    capacity: c.maxCapacity,
    bookedCount: c.bookedCount,
    availableSpots:
      c.maxCapacity !== null
        ? Math.max(0, c.maxCapacity - c.bookedCount)
        : null,
    status: c.status,
    isVirtual: c.isVirtual,
    difficulty: c.difficulty,
    classType: c.classType,
    instructor: c.instructor,
    room: c.room,
  }));

  return Response.json({ data: result, count: result.length });
}
