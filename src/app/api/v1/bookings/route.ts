import { type NextRequest } from "next/server";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { NodeType, StudioBookingStatus } from "@/db/enums";
import { client, studioBooking, studioClass } from "@/db/schema";
import {
  cancelClassBooking,
  createClassBooking,
} from "@/features/studio/server/class-booking-service";
import { createClassBookingCheckout } from "@/features/studio/server/class-booking-checkout";
import { validateApiKey, requireScope, apiError } from "@/lib/api-auth";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";
import { dispatchClassBookingWorkflow } from "@/features/studio/server/paid-class-booking-workflow-dispatch";
import { dispatchWaitlistSpotOpened } from "@/features/studio/server/waitlist-workflow-dispatch";

export const runtime = "nodejs";

const CreateBookingSchema = z.object({
  classId: z.string().min(1),
  clientId: z.string().min(1),
  slidingScaleAmount: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return apiError(auth.error, 401);

  const scope = requireScope(auth.apiKey.scopes, "bookings:read");
  if (!scope.ok) return apiError(scope.error, 403);
  if (!auth.apiKey.locationId) {
    return apiError("API key must be bound to a location", 403);
  }

  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("clientId") ?? undefined;
  const classId = searchParams.get("classId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  const conditions: SQL[] = [
    eq(studioClass.organizationId, auth.apiKey.organizationId),
    eq(studioClass.locationId, auth.apiKey.locationId),
    eq(client.organizationId, auth.apiKey.organizationId),
    eq(client.locationId, auth.apiKey.locationId),
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
  if (!auth.apiKey.locationId) {
    return apiError("API key must be bound to a location", 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsedBody = CreateBookingSchema.safeParse(body);
  if (!parsedBody.success) {
    const missingClientId = parsedBody.error.issues.some((issue) =>
      issue.path.includes("clientId"),
    );
    if (missingClientId) {
      return apiError("clientId is required", 400);
    }
    return apiError("classId is required", 400);
  }
  const data = parsedBody.data;

  try {
    const booking = await createClassBooking({
      organizationId: auth.apiKey.organizationId,
      locationId: auth.apiKey.locationId,
      classId: data.classId,
      clientId: data.clientId,
      slidingScaleAmount: data.slidingScaleAmount,
      channel: "API",
    });
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL ??
      "http://localhost:3000";
    const checkout = booking.requiresPayment
      ? await createClassBookingCheckout({
          organizationId: auth.apiKey.organizationId,
          locationId: auth.apiKey.locationId,
          bookingId: booking.bookingId,
          successUrl: `${appUrl}/studio/classes?payment=success`,
          cancelUrl: `${appUrl}/studio/classes?payment=cancelled`,
        })
      : null;
    if (booking.created && !booking.requiresPayment) {
      await dispatchClassBookingWorkflow(booking.bookingId).catch(
        (error: unknown) => {
          console.error("Failed to trigger API class-booked workflow", error);
        },
      );
    }
    return Response.json(
      { data: { ...booking, checkout } },
      { status: booking.created ? 201 : 200 },
    );
  } catch (error: unknown) {
    if (!(error instanceof TRPCError)) throw error;
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "CONFLICT" || error.code === "PRECONDITION_FAILED"
            ? 409
            : 400;
    return apiError(error.message, status);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return apiError(auth.error, 401);
  const writeScope = requireScope(auth.apiKey.scopes, "bookings:write");
  if (!writeScope.ok) return apiError(writeScope.error, 403);
  if (!auth.apiKey.locationId) {
    return apiError("API key must be bound to a location", 403);
  }
  const bookingId = req.nextUrl.searchParams.get("bookingId");
  if (!bookingId) return apiError("bookingId is required", 400);

  try {
    const cancelled = await cancelClassBooking({
      organizationId: auth.apiKey.organizationId,
      locationId: auth.apiKey.locationId,
      bookingId,
      channel: "API",
    });
    await triggerWorkflowsForNodeType({
      nodeType: NodeType.CLASS_CANCELLED_TRIGGER,
      organizationId: auth.apiKey.organizationId,
      locationId: auth.apiKey.locationId,
      idempotencyKey: `class-cancelled:${cancelled.bookingId}:${cancelled.status}`,
      triggerData: {
        bookingId: cancelled.bookingId,
        clientId: cancelled.clientId,
        classId: cancelled.classId,
        status: cancelled.status,
        isLateCancellation: cancelled.isLateCancellation,
      },
    }).catch((error: unknown) => {
      console.error("Failed to trigger API class cancellation workflow", error);
    });
    if (cancelled.waitlistOffer) {
      await dispatchWaitlistSpotOpened({
        organizationId: auth.apiKey.organizationId,
        locationId: auth.apiKey.locationId,
        waitlistId: cancelled.waitlistOffer.id,
        clientId: cancelled.waitlistOffer.clientId,
        classId: cancelled.waitlistOffer.classId,
        notifiedAt: cancelled.waitlistOffer.notifiedAt,
      });
    }
    return Response.json({ data: cancelled });
  } catch (error: unknown) {
    if (!(error instanceof TRPCError)) throw error;
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "CONFLICT" || error.code === "PRECONDITION_FAILED"
            ? 409
            : 400;
    return apiError(error.message, status);
  }
}
