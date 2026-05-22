import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  booking,
  bookingEventType,
  location as locationTable,
} from "@/db/schema";
import { sendWorkflowExecution } from "@/inngest/utils";

type CalComAttendee = {
  name?: string;
  email?: string;
  timeZone?: string;
};

type CalComBookingPayload = {
  uid?: string;
  id?: number;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  attendees?: CalComAttendee[];
  eventType?: { id?: number };
  metadata?: {
    clientId?: string;
    dealId?: string;
  };
  rescheduledFromUid?: string;
  cancellationReason?: string;
};

/**
 * Cal.com Webhook Handler
 * Handles booking events from Cal.com and syncs to local database
 * 
 * Webhook URL format: /api/webhooks/calcom?locationId=xxx&workflowId=yyy (optional)
 * 
 * Events:
 * - BOOKING_CREATED
 * - BOOKING_RESCHEDULED
 * - BOOKING_CANCELLED
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId");
    const workflowId = url.searchParams.get("workflowId");

    if (!locationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required query parameter: locationId",
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      triggerEvent?: string;
      payload?: CalComBookingPayload;
    };
    const { triggerEvent, payload } = body;

    console.log("Cal.com webhook received:", { triggerEvent, payload });

    // Get location to verify it exists
    const location = await db.query.location.findFirst({
      where: eq(locationTable.id, locationId),
      columns: {
        id: true,
        organizationId: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        {
          success: false,
          error: "Location not found",
        },
        { status: 404 }
      );
    }

    // Process different event types
    switch (triggerEvent) {
      case "BOOKING_CREATED":
        await handleBookingCreated(location.organizationId, locationId, payload ?? {});
        break;

      case "BOOKING_RESCHEDULED":
        await handleBookingRescheduled(location.organizationId, locationId, payload ?? {});
        break;

      case "BOOKING_CANCELLED":
        await handleBookingCancelled(location.organizationId, locationId, payload ?? {});
        break;

      default:
        console.warn("Unknown Cal.com event type:", triggerEvent);
    }

    // Trigger workflow if workflowId is provided
    if (workflowId) {
      await sendWorkflowExecution({
        workflowId,
        initialData: {
          calcom: {
            event: triggerEvent,
            booking: payload,
          },
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cal.com webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process Cal.com webhook",
      },
      { status: 500 }
    );
  }
}

// Handle booking created event
async function handleBookingCreated(
  organizationId: string,
  locationId: string,
  payload: CalComBookingPayload
) {
  const { uid, id, title, description, startTime, endTime, attendees, eventType, metadata } = payload;

  if (!uid || !startTime || !endTime) {
    console.warn("Cal.com booking payload missing required fields");
    return;
  }

  // Check if event type exists in our system
  if (!eventType?.id) {
    console.warn("Cal.com event type id missing from payload");
    return;
  }

  const existingEventType = await db.query.bookingEventType.findFirst({
    where: and(
      eq(bookingEventType.calEventTypeId, eventType.id),
      eq(bookingEventType.organizationId, organizationId),
      eq(bookingEventType.locationId, locationId)
    ),
  });

  if (!existingEventType) {
    console.warn("Event type not found in local database:", eventType?.id);
    return;
  }

  // Check if booking already exists
  const existingBooking = await db.query.booking.findFirst({
    where: and(
      eq(booking.calBookingUid, uid),
      eq(booking.organizationId, organizationId),
      eq(booking.locationId, locationId)
    ),
    columns: { id: true },
  });

  if (existingBooking) {
    console.log("Booking already exists, skipping:", uid);
    return;
  }

  // Extract client info from metadata if available
  const clientId = metadata?.clientId;
  const dealId = metadata?.dealId;

  const primaryAttendee = attendees?.[0];
  const duration = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);

  // Create booking in local database
  await db.insert(booking).values({
      id: createId(),
      organizationId,
      locationId,
      eventTypeId: existingEventType.id,
      clientId,
      dealId,
      title: title || existingEventType.title,
      description: description || existingEventType.description,
      status: "CONFIRMED",
      attendeeName: primaryAttendee?.name || "",
      attendeeEmail: primaryAttendee?.email || "",
      attendeeTimezone: primaryAttendee?.timeZone || "UTC",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration,
      locationType: existingEventType.locationType,
      calBookingId: id,
      calBookingUid: uid,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
  });

  console.log("Booking created from Cal.com:", uid);
}

// Handle booking rescheduled event
async function handleBookingRescheduled(
  organizationId: string,
  locationId: string,
  payload: CalComBookingPayload
) {
  const { uid, startTime, endTime, rescheduledFromUid } = payload;

  if (!uid || !startTime || !endTime) {
    console.warn("Cal.com reschedule payload missing required fields");
    return;
  }

  const existingBooking = await db.query.booking.findFirst({
    where: and(
      eq(booking.calBookingUid, uid),
      eq(booking.organizationId, organizationId),
      eq(booking.locationId, locationId)
    ),
    columns: { id: true },
  });

  if (!existingBooking) {
    console.warn("Booking not found for rescheduling:", uid);
    return;
  }

  await db
    .update(booking)
    .set({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: "RESCHEDULED",
      rescheduledFrom: rescheduledFromUid,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(booking.id, existingBooking.id));

  console.log("Booking rescheduled from Cal.com:", uid);
}

// Handle booking cancelled event
async function handleBookingCancelled(
  organizationId: string,
  locationId: string,
  payload: CalComBookingPayload
) {
  const { uid, cancellationReason } = payload;

  if (!uid) {
    console.warn("Cal.com cancellation payload missing booking uid");
    return;
  }

  const existingBooking = await db.query.booking.findFirst({
    where: and(
      eq(booking.calBookingUid, uid),
      eq(booking.organizationId, organizationId),
      eq(booking.locationId, locationId)
    ),
    columns: { id: true },
  });

  if (!existingBooking) {
    console.warn("Booking not found for cancellation:", uid);
    return;
  }

  await db
    .update(booking)
    .set({
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(booking.id, existingBooking.id));

  console.log("Booking cancelled from Cal.com:", uid);
}
