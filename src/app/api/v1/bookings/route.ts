import { type NextRequest } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db";
import { ClassInstanceStatus, StudioBookingStatus } from "@/db/enums";
import { client, studioBooking, studioClass } from "@/db/schema";
import { validateApiKey, requireScope, apiError } from "@/lib/api-auth";
import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

const CreateBookingSchema = z.object({
  classId: z.string().min(1),
  clientId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return apiError(auth.error, 401);

  const scope = requireScope(auth.apiKey.scopes, "bookings:read");
  if (!scope.ok) return apiError(scope.error, 403);

  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("clientId") ?? undefined;
  const classId = searchParams.get("classId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  const conditions: SQL[] = [
    eq(studioClass.organizationId, auth.apiKey.organizationId),
  ];
  if (clientId) {
    conditions.push(eq(studioBooking.clientId, clientId));
  }
  if (classId) {
    conditions.push(eq(studioBooking.classId, classId));
  }
  if (status) {
    const parsedStatus = z.enum(StudioBookingStatus).safeParse(status);
    if (!parsedStatus.success) {
      return apiError("Invalid booking status", 400);
    }
    conditions.push(eq(studioBooking.status, parsedStatus.data));
  }

  const bookings = await db
    .select({
      id: studioBooking.id,
      status: studioBooking.status,
      bookedAt: studioBooking.bookedAt,
      checkedInAt: studioBooking.checkedInAt,
      cancelledAt: studioBooking.cancelledAt,
      cancellationReason: studioBooking.cancellationReason,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
      },
      studioClass: {
        id: studioClass.id,
        name: studioClass.name,
        startTime: studioClass.startTime,
        endTime: studioClass.endTime,
      },
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioBooking.classId, studioClass.id))
    .innerJoin(client, eq(studioBooking.clientId, client.id))
    .where(and(...conditions))
    .orderBy(desc(studioBooking.bookedAt))
    .limit(limit);

  return Response.json({ data: bookings, count: bookings.length });
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return apiError(auth.error, 401);

  const writeScope = requireScope(auth.apiKey.scopes, "bookings:write");
  if (!writeScope.ok) return apiError(writeScope.error, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsedBody = CreateBookingSchema.safeParse(body);
  if (!parsedBody.success) {
    const missingClientId = parsedBody.error.issues.some((issue) =>
      issue.path.includes("clientId")
    );
    if (missingClientId) {
      return apiError("clientId is required", 400);
    }
    return apiError("classId is required", 400);
  }
  const data = parsedBody.data;

  const [classRecord] = await db
    .select({
      id: studioClass.id,
      maxCapacity: studioClass.maxCapacity,
      bookedCount: count(studioBooking.id),
    })
    .from(studioClass)
    .leftJoin(studioBooking, eq(studioBooking.classId, studioClass.id))
    .where(
      and(
        eq(studioClass.id, data.classId),
        eq(studioClass.organizationId, auth.apiKey.organizationId),
        eq(studioClass.status, ClassInstanceStatus.SCHEDULED)
      )
    )
    .groupBy(studioClass.id, studioClass.maxCapacity)
    .limit(1);

  if (!classRecord) return apiError("Class not found or not available", 404);

  if (classRecord.maxCapacity && classRecord.bookedCount >= classRecord.maxCapacity) {
    return apiError("Class is at capacity", 409);
  }

  const [clientRecord] = await db
    .select({ id: client.id })
    .from(client)
    .where(
      and(
        eq(client.id, data.clientId),
        eq(client.organizationId, auth.apiKey.organizationId)
      )
    )
    .limit(1);
  if (!clientRecord) return apiError("Member not found", 404);

  const [existing] = await db
    .select()
    .from(studioBooking)
    .where(
      and(
        eq(studioBooking.classId, data.classId),
        eq(studioBooking.clientId, data.clientId),
        eq(studioBooking.status, StudioBookingStatus.BOOKED)
      )
    )
    .limit(1);
  if (existing) return Response.json({ data: existing }, { status: 200 });

  const [booking] = await db
    .insert(studioBooking)
    .values({
      id: createId(),
      classId: data.classId,
      clientId: data.clientId,
      status: StudioBookingStatus.BOOKED,
      updatedAt: new Date(),
    })
    .returning({
      id: studioBooking.id,
      status: studioBooking.status,
      bookedAt: studioBooking.bookedAt,
      classId: studioBooking.classId,
      clientId: studioBooking.clientId,
    });

  return Response.json({ data: booking }, { status: 201 });
}
