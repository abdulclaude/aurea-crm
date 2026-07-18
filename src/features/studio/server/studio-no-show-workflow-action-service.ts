import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { client, studioBooking, studioClass } from "@/db/schema";
import { enqueueCancellationCollections } from "@/features/studio/server/cancellation-collection-enqueue";
import { applyCancellationOutcome } from "@/features/studio/server/cancellation-outcome-service";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

export type StudioNoShowWorkflowActionResult = {
  operation: "MARK_NO_SHOW";
  bookingId: string;
  classId: string;
  clientId: string;
  chargeIds: string[];
  alreadyApplied: boolean;
};

export async function runStudioNoShowWorkflowAction(input: {
  organizationId: string;
  locationId: string;
  classId: string;
  clientId: string;
}): Promise<StudioNoShowWorkflowActionResult> {
  const booking = await findNoShowBooking(input);
  if (!booking) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No active booking was found for this member and class.",
    });
  }
  if (booking.endTime > new Date()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "A no-show can only be recorded after the class has ended.",
    });
  }
  const alreadyApplied = booking.status === "NO_SHOW";
  const result = await applyCancellationOutcome({
    organizationId: input.organizationId,
    locationId: input.locationId,
    bookingIds: [booking.id],
    outcome: "NO_SHOW",
  });
  await enqueueCancellationCollections(result.autoCollectChargeIds);
  await Promise.all(
    result.workflowEvents
      .filter((event) => event.sendNotification)
      .map((event) =>
        triggerWorkflowsForNodeType({
          nodeType: NodeType.MEMBER_NO_SHOW_TRIGGER,
          organizationId: input.organizationId,
          locationId: input.locationId,
          idempotencyKey: `cancellation-outcome:NO_SHOW:${event.bookingId}`,
          triggerData: {
            bookingId: event.bookingId,
            clientId: event.clientId,
            classId: event.classId,
            status: "NO_SHOW",
            client: {
              id: event.clientId,
              name: event.clientName,
              email: event.clientEmail,
            },
            class: {
              id: event.classId,
              name: event.className,
              startTime: event.classStartTime.toISOString(),
            },
          },
        }),
      ),
  );
  return {
    operation: "MARK_NO_SHOW",
    bookingId: booking.id,
    classId: input.classId,
    clientId: input.clientId,
    chargeIds: result.charges.map((charge) => charge.id),
    alreadyApplied,
  };
}

async function findNoShowBooking(input: {
  organizationId: string;
  locationId: string;
  classId: string;
  clientId: string;
}) {
  const [booking] = await db
    .select({
      id: studioBooking.id,
      status: studioBooking.status,
      endTime: studioClass.endTime,
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
    .innerJoin(client, eq(client.id, studioBooking.clientId))
    .where(
      and(
        eq(studioBooking.classId, input.classId),
        eq(studioBooking.clientId, input.clientId),
        inArray(studioBooking.status, ["BOOKED", "NO_SHOW"]),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
        eq(client.organizationId, input.organizationId),
        eq(client.locationId, input.locationId),
      ),
    )
    .orderBy(desc(studioBooking.createdAt))
    .limit(1);
  return booking;
}
