import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { ActivityAction, ActivityType, NodeType } from "@/db/enums";
import { db } from "@/db";
import {
  checkIn as checkInTable,
  client,
  studioBooking,
  studioClass,
} from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";
import { logActivity } from "@/features/activity/lib/log-activity";
import { requireCancellationAccess } from "@/features/studio/server/cancellation-access";
import { enqueueCancellationCollections } from "@/features/studio/server/cancellation-collection-enqueue";
import { applyCancellationOutcome } from "@/features/studio/server/cancellation-outcome-service";
import {
  cancelClassBooking,
  createClassBooking,
} from "@/features/studio/server/class-booking-service";
import { createClassBookingCheckout } from "@/features/studio/server/class-booking-checkout";
import { dispatchClassBookingWorkflow } from "@/features/studio/server/paid-class-booking-workflow-dispatch";
import { dispatchWaitlistSpotOpened } from "@/features/studio/server/waitlist-workflow-dispatch";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const studioBookingStatusSchema = z.enum([
  "BOOKED",
  "ATTENDED",
  "CANCELLED",
  "NO_SHOW",
  "LATE_CANCEL",
]);

function requireOrg(ctx: { orgId: string | null }) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }
  return ctx.orgId;
}

function requireOrgAndLocation(ctx: {
  orgId: string | null;
  locationId: string | null;
}): { organizationId: string; locationId: string } {
  const organizationId = requireOrg(ctx);
  if (!ctx.locationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select a location before managing class bookings",
    });
  }
  return { organizationId, locationId: ctx.locationId };
}

async function recordBookingActivity(input: {
  organizationId: string;
  locationId: string;
  userId: string;
  bookingId: string;
  clientId: string;
  action: typeof ActivityAction[keyof typeof ActivityAction];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logActivity({
    organizationId: input.organizationId,
    locationId: input.locationId,
    userId: input.userId,
    type: ActivityType.BOOKING,
    action: input.action,
    entityType: "studio_booking",
    entityId: input.bookingId,
    entityName: "Class reservation",
    metadata: { clientId: input.clientId, ...input.metadata },
  });
}

export const studioBookingsRouter = createTRPCRouter({
  book: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        clientId: z.string(),
        slidingScaleAmount: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId,
        },
        capability: "schedule.manage",
        resource: { organizationId, locationId },
      });
      const booking = await createClassBooking({
        organizationId,
        locationId,
        classId: input.classId,
        clientId: input.clientId,
        slidingScaleAmount: input.slidingScaleAmount,
        channel: "OPERATOR",
        createdBy: ctx.auth.user.id,
      });

      if (booking.created && !booking.requiresPayment)
        await dispatchClassBookingWorkflow(booking.bookingId).catch(
          (error: unknown) => {
            console.error("Failed to trigger class-booked workflows", error);
          },
        );
      if (!booking.requiresPayment) return { ...booking, checkout: null };
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId,
        },
        capability: "commerce.checkout.create",
        resource: { organizationId, locationId },
      });
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const checkout = await createClassBookingCheckout({
        organizationId,
        locationId,
        bookingId: booking.bookingId,
        requestedBy: ctx.auth.user.id,
        successUrl: `${appUrl}/studio/classes/${booking.classId}?payment=success`,
        cancelUrl: `${appUrl}/studio/classes/${booking.classId}?payment=cancelled`,
      });
      return { ...booking, checkout };
    }),

  createPaymentSession: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId,
        },
        capability: "commerce.checkout.create",
        resource: { organizationId, locationId },
      });
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return createClassBookingCheckout({
        organizationId,
        locationId,
        bookingId: input.bookingId,
        requestedBy: ctx.auth.user.id,
        successUrl: `${appUrl}/studio/classes?payment=success`,
        cancelUrl: `${appUrl}/studio/classes?payment=cancelled`,
      });
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId,
        },
        capability: "schedule.manage",
        resource: { organizationId, locationId },
      });
      const cancelled = await cancelClassBooking({
        organizationId,
        locationId,
        bookingId: input.bookingId,
        channel: "OPERATOR",
        cancelledBy: ctx.auth.user.id,
      });

      await triggerWorkflowsForNodeType({
        nodeType: NodeType.CLASS_CANCELLED_TRIGGER,
        organizationId,
        locationId,
        idempotencyKey: `class-cancelled:${cancelled.bookingId}:${cancelled.status}`,
        triggerData: {
          bookingId: cancelled.bookingId,
          clientId: cancelled.clientId,
          classId: cancelled.classId,
          isLateCancellation: cancelled.isLateCancellation,
          status: cancelled.status,
        },
      }).catch((error: unknown) => {
        console.error("Failed to trigger class-cancelled workflows", error);
      });

      if (cancelled.waitlistOffer) {
        await dispatchWaitlistSpotOpened({
          organizationId,
          locationId,
          waitlistId: cancelled.waitlistOffer.id,
          clientId: cancelled.waitlistOffer.clientId,
          classId: cancelled.waitlistOffer.classId,
          notifiedAt: cancelled.waitlistOffer.notifiedAt,
        });
      }

      await recordBookingActivity({
        organizationId,
        locationId,
        userId: ctx.auth.user.id,
        bookingId: cancelled.bookingId,
        clientId: cancelled.clientId,
        action: ActivityAction.STATUS_CHANGED,
        metadata: { status: cancelled.status, classId: cancelled.classId },
      });

      return {
        booking: cancelled,
        isLateCancellation: cancelled.isLateCancellation,
        nextWaitlistNotified: Boolean(cancelled.waitlistOffer),
      };
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        bookingIds: z.array(z.string()).min(1).max(100),
        status: z.enum(["NO_SHOW", "LATE_CANCEL"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCancellationAccess(ctx, "attendance.manage");
      const result = await applyCancellationOutcome({
        ...scope,
        bookingIds: input.bookingIds,
        outcome: input.status,
      });
      await enqueueCancellationCollections(result.autoCollectChargeIds);
      await Promise.all(
        result.workflowEvents
          .filter((event) => event.sendNotification)
          .map((event) =>
            triggerWorkflowsForNodeType({
              nodeType:
                input.status === "NO_SHOW"
                  ? NodeType.MEMBER_NO_SHOW_TRIGGER
                  : NodeType.CLASS_CANCELLED_TRIGGER,
              organizationId: scope.organizationId,
              locationId: event.locationId,
              idempotencyKey: `cancellation-outcome:${input.status}:${event.bookingId}`,
              triggerData: {
                bookingId: event.bookingId,
                clientId: event.clientId,
                classId: event.classId,
                status: input.status,
                isLateCancellation: input.status === "LATE_CANCEL",
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

      return { updated: result.updated };
    }),

  listForClass: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const targetClass = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, organizationId),
        ),
        columns: { id: true },
      });
      if (!targetClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      return db.query.studioBooking.findMany({
        where: eq(studioBooking.classId, input.classId),
        with: {
          client: {
            columns: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: asc(studioBooking.bookedAt),
      });
    }),

  listForMember: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        status: studioBookingStatusSchema.optional(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const rows = await db.query.studioBooking.findMany({
        where: and(
          eq(studioBooking.clientId, input.clientId),
          input.status ? eq(studioBooking.status, input.status) : undefined,
        ),
        with: {
          studioClass: {
            with: {
              classType: { columns: { name: true, color: true } },
              instructor: { columns: { name: true } },
            },
          },
        },
        orderBy: desc(studioBooking.bookedAt),
        limit: input.limit,
      });

      return rows.filter(
        (row) => row.studioClass.organizationId === organizationId,
      );
    }),

  checkIn: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        method: z
          .enum(["QR_CODE", "NFC", "KIOSK", "GEO", "MANUAL", "PIN"])
          .default("MANUAL"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const booking = await db.query.studioBooking.findFirst({
        where: eq(studioBooking.id, input.bookingId),
        with: {
          studioClass: {
            columns: {
              id: true,
              organizationId: true,
              locationId: true,
              startTime: true,
            },
          },
        },
      });
      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }
      if (booking.studioClass.organizationId !== organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (booking.checkedInAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already checked in",
        });
      }

      const now = new Date();
      const [record] = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(checkInTable)
          .values({
            id: randomUUID(),
            clientId: booking.clientId,
            classId: booking.classId,
            method: input.method,
            checkedInAt: now,
            checkedInBy: ctx.auth.user.id,
            isLateArrival: now > booking.studioClass.startTime,
            organizationId: booking.studioClass.organizationId,
            locationId: booking.studioClass.locationId,
            createdAt: now,
          })
          .returning();

        await tx
          .update(studioBooking)
          .set({ checkedInAt: now, status: "ATTENDED", updatedAt: now })
          .where(eq(studioBooking.id, input.bookingId));
        await tx
          .update(client)
          .set({
            attendanceCount: sql`${client.attendanceCount} + 1`,
            currentStreak: sql`${client.currentStreak} + 1`,
            updatedAt: now,
          })
          .where(eq(client.id, booking.clientId));

        return inserted;
      });

      if (!record) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check in member",
        });
      }

      return record;
    }),

  reverseCheckIn: protectedProcedure
    .input(z.object({ bookingId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireCapability({
        actor: { userId: ctx.auth.user.id, organizationId, locationId },
        capability: "attendance.manage",
        resource: { organizationId, locationId },
      });

      const result = await db.transaction(async (tx) => {
        const booking = await tx.query.studioBooking.findFirst({
          where: eq(studioBooking.id, input.bookingId),
          with: { studioClass: { columns: { organizationId: true, locationId: true } } },
        });
        if (
          !booking ||
          booking.studioClass.organizationId !== organizationId ||
          booking.studioClass.locationId !== locationId
        ) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        }
        const removed = await tx
          .delete(checkInTable)
          .where(
            and(
              eq(checkInTable.classId, booking.classId),
              eq(checkInTable.clientId, booking.clientId),
              eq(checkInTable.organizationId, organizationId),
              eq(checkInTable.locationId, locationId),
            ),
          )
          .returning({ id: checkInTable.id });
        if (removed.length === 0) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This booking is not checked in" });
        }
        await tx
          .update(studioBooking)
          .set({ checkedInAt: null, status: "BOOKED", updatedAt: new Date() })
          .where(eq(studioBooking.id, booking.id));
        await tx
          .update(client)
          .set({
            attendanceCount: sql`greatest(${client.attendanceCount} - 1, 0)`,
            currentStreak: sql`greatest(${client.currentStreak} - 1, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(client.id, booking.clientId));
        return { bookingId: booking.id, clientId: booking.clientId };
      });
      await recordBookingActivity({
        organizationId,
        locationId,
        userId: ctx.auth.user.id,
        bookingId: result.bookingId,
        clientId: result.clientId,
        action: ActivityAction.UPDATED,
        metadata: { action: "check_in_reversed" },
      });
      return result;
    }),

  updateNote: protectedProcedure
    .input(
      z.object({
        bookingId: z.string().min(1),
        kind: z.enum(["SESSION", "CHECK_IN"]),
        note: z.string().trim().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireCapability({
        actor: { userId: ctx.auth.user.id, organizationId, locationId },
        capability: "schedule.manage",
        resource: { organizationId, locationId },
      });
      const booking = await db.query.studioBooking.findFirst({
        where: eq(studioBooking.id, input.bookingId),
        with: { studioClass: { columns: { organizationId: true, locationId: true } } },
      });
      if (
        !booking ||
        booking.studioClass.organizationId !== organizationId ||
        booking.studioClass.locationId !== locationId
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      const prefix = input.kind === "SESSION" ? "Session note" : "Check-in note";
      const nextNotes = [booking.notes, `${prefix}: ${input.note}`].filter(Boolean).join("\n");
      const [updated] = await db
        .update(studioBooking)
        .set({ notes: nextNotes, updatedAt: new Date() })
        .where(eq(studioBooking.id, booking.id))
        .returning();
      await recordBookingActivity({
        organizationId,
        locationId,
        userId: ctx.auth.user.id,
        bookingId: booking.id,
        clientId: booking.clientId,
        action: ActivityAction.UPDATED,
        metadata: { noteKind: input.kind },
      });
      return updated;
    }),

  switchClass: protectedProcedure
    .input(z.object({ bookingId: z.string().min(1), targetClassId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireCapability({
        actor: { userId: ctx.auth.user.id, organizationId, locationId },
        capability: "schedule.manage",
        resource: { organizationId, locationId },
      });
      const result = await db.transaction(async (tx) => {
        const booking = await tx.query.studioBooking.findFirst({
          where: eq(studioBooking.id, input.bookingId),
          with: { studioClass: { columns: { organizationId: true, locationId: true } } },
        });
        if (
          !booking ||
          booking.studioClass.organizationId !== organizationId ||
          booking.studioClass.locationId !== locationId
        ) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        }
        if (booking.classId === input.targetClassId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Select a different class.",
          });
        }
        const orderedClassIds = [booking.classId, input.targetClassId].sort();
        await tx
          .select({ id: studioClass.id })
          .from(studioClass)
          .where(
            and(
              inArray(studioClass.id, orderedClassIds),
              eq(studioClass.organizationId, organizationId),
              eq(studioClass.locationId, locationId),
            ),
          )
          .orderBy(asc(studioClass.id))
          .for("update");
        const cancelled = await cancelClassBooking(
          {
            organizationId,
            locationId,
            bookingId: booking.id,
            channel: "OPERATOR",
            cancelledBy: ctx.auth.user.id,
          },
          tx,
        );
        const created = await createClassBooking(
          {
            organizationId,
            locationId,
            classId: input.targetClassId,
            clientId: booking.clientId,
            channel: "OPERATOR",
            createdBy: ctx.auth.user.id,
          },
          tx,
        );
        if (created.requiresPayment) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The target class requires a new payment. Create a new booking instead.",
          });
        }
        return { created, waitlistOffer: cancelled.waitlistOffer };
      });
      if (result.waitlistOffer) {
        await dispatchWaitlistSpotOpened({
          organizationId,
          locationId,
          waitlistId: result.waitlistOffer.id,
          clientId: result.waitlistOffer.clientId,
          classId: result.waitlistOffer.classId,
          notifiedAt: result.waitlistOffer.notifiedAt,
        });
      }
      await recordBookingActivity({
        organizationId,
        locationId,
        userId: ctx.auth.user.id,
        bookingId: input.bookingId,
        clientId: result.created.clientId,
        action: ActivityAction.UPDATED,
        metadata: { action: "class_switched", targetClassId: input.targetClassId },
      });
      return result.created;
    }),

  delete: protectedProcedure
    .input(z.object({ bookingId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireCapability({
        actor: { userId: ctx.auth.user.id, organizationId, locationId },
        capability: "schedule.manage",
        resource: { organizationId, locationId },
      });
      const booking = await db.query.studioBooking.findFirst({
        where: eq(studioBooking.id, input.bookingId),
        with: { studioClass: { columns: { organizationId: true, locationId: true } } },
      });
      if (
        !booking ||
        booking.studioClass.organizationId !== organizationId ||
        booking.studioClass.locationId !== locationId
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      if (booking.status !== "CANCELLED" && booking.status !== "LATE_CANCEL") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cancel this booking before deleting it.",
        });
      }
      await db.delete(studioBooking).where(eq(studioBooking.id, booking.id));
      await recordBookingActivity({
        organizationId,
        locationId,
        userId: ctx.auth.user.id,
        bookingId: booking.id,
        clientId: booking.clientId,
        action: ActivityAction.DELETED,
      });
      return { id: booking.id };
    }),
});
