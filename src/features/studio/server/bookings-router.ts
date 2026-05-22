import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import { db } from "@/db";
import {
  checkIn as checkInTable,
  classCredit,
  classWaitlist,
  client,
  studioBooking,
  studioClass,
} from "@/db/schema";
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
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
  }
  return ctx.orgId;
}

export const studioBookingsRouter = createTRPCRouter({
  book: protectedProcedure
    .input(z.object({ classId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);

      const targetClass = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, organizationId)
        ),
        with: { studioBookings: { columns: { id: true, status: true } } },
      });
      if (!targetClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }
      if (targetClass.status === "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot book a cancelled class",
        });
      }
      if (targetClass.status === "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot book a completed class",
        });
      }

      const bookingWindowHours = targetClass.bookingWindowHours ?? null;
      if (bookingWindowHours) {
        const bookingOpens = new Date(
          targetClass.startTime.getTime() - bookingWindowHours * 60 * 60 * 1000
        );
        if (new Date() < bookingOpens) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Booking opens ${bookingWindowHours} hours before class`,
          });
        }
      }

      const existingBooking = await db.query.studioBooking.findFirst({
        where: and(
          eq(studioBooking.classId, input.classId),
          eq(studioBooking.clientId, input.clientId),
          ne(studioBooking.status, "CANCELLED")
        ),
      });
      if (existingBooking) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Client is already booked for this class",
        });
      }

      const member = await db.query.client.findFirst({
        where: and(eq(client.id, input.clientId), eq(client.organizationId, organizationId)),
        columns: { id: true, name: true, email: true },
      });
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      const bookedCount = targetClass.studioBookings.filter(
        (booking) => booking.status !== "CANCELLED"
      ).length;
      if (targetClass.maxCapacity && bookedCount >= targetClass.maxCapacity) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Class is full. Consider joining the waitlist.",
        });
      }

      const now = new Date();
      const bookingId = randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(studioBooking).values({
          id: bookingId,
          classId: input.classId,
          clientId: input.clientId,
          status: "BOOKED",
          bookedAt: now,
          createdAt: now,
          updatedAt: now,
        });

        const credit = await tx.query.classCredit.findFirst({
          where: and(
            eq(classCredit.clientId, input.clientId),
            or(gt(classCredit.expiresAt, now), isNull(classCredit.expiresAt))
          ),
          orderBy: asc(classCredit.expiresAt),
        });

        if (credit && credit.usedCredits < credit.totalCredits) {
          await tx
            .update(classCredit)
            .set({
              usedCredits: sql`${classCredit.usedCredits} + 1`,
              updatedAt: now,
            })
            .where(eq(classCredit.id, credit.id));
        }
      });

      const booking = await db.query.studioBooking.findFirst({
        where: eq(studioBooking.id, bookingId),
        with: {
          client: { columns: { id: true, name: true, email: true } },
          studioClass: { columns: { id: true, name: true, startTime: true } },
        },
      });
      if (!booking) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create booking",
        });
      }

      await triggerWorkflowsForNodeType({
        nodeType: NodeType.CLASS_BOOKED_TRIGGER,
        organizationId,
        locationId: ctx.locationId ?? null,
        triggerData: {
          bookingId: booking.id,
          clientId: booking.clientId,
          classId: booking.classId,
          client: booking.client,
          class: {
            id: booking.studioClass.id,
            name: booking.studioClass.name,
            startTime: booking.studioClass.startTime.toISOString(),
          },
        },
      }).catch((error: unknown) => {
        console.error("Failed to trigger class-booked workflows", error);
      });

      return booking;
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
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
              cancellationWindowHours: true,
              startTime: true,
            },
          },
        },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      if (booking.studioClass.organizationId !== organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (booking.status === "CANCELLED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already cancelled" });
      }

      const cancellationWindowHours = booking.studioClass.cancellationWindowHours ?? 12;
      const cancellationDeadline = new Date(
        booking.studioClass.startTime.getTime() -
          cancellationWindowHours * 60 * 60 * 1000
      );
      const isLateCancellation = new Date() > cancellationDeadline;

      const [cancelled] = await db
        .update(studioBooking)
        .set({
          status: isLateCancellation ? "LATE_CANCEL" : "CANCELLED",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(studioBooking.id, input.bookingId))
        .returning();
      if (!cancelled) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      const nextWaitlist = await db.query.classWaitlist.findFirst({
        where: and(
          eq(classWaitlist.classId, booking.classId),
          eq(classWaitlist.status, "WAITING")
        ),
        orderBy: asc(classWaitlist.position),
      });
      if (nextWaitlist) {
        await db
          .update(classWaitlist)
          .set({ status: "NOTIFIED", notifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(classWaitlist.id, nextWaitlist.id));
      }

      await triggerWorkflowsForNodeType({
        nodeType: NodeType.CLASS_CANCELLED_TRIGGER,
        organizationId,
        locationId: ctx.locationId ?? null,
        triggerData: {
          bookingId: cancelled.id,
          clientId: cancelled.clientId,
          classId: cancelled.classId,
          isLateCancellation,
          status: cancelled.status,
        },
      }).catch((error: unknown) => {
        console.error("Failed to trigger class-cancelled workflows", error);
      });

      if (nextWaitlist) {
        await triggerWorkflowsForNodeType({
          nodeType: NodeType.WAITLIST_SPOT_OPENED_TRIGGER,
          organizationId,
          locationId: ctx.locationId ?? null,
          triggerData: {
            waitlistId: nextWaitlist.id,
            clientId: nextWaitlist.clientId,
            classId: nextWaitlist.classId,
          },
        }).catch((error: unknown) => {
          console.error("Failed to trigger waitlist workflows", error);
        });
      }

      return {
        booking: cancelled,
        isLateCancellation,
        nextWaitlistNotified: Boolean(nextWaitlist),
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
      const organizationId = requireOrg(ctx);
      const bookings = await db.query.studioBooking.findMany({
        where: and(
          inArray(studioBooking.id, input.bookingIds),
          inArray(studioBooking.status, ["BOOKED", "ATTENDED"])
        ),
        with: {
          studioClass: {
            columns: {
              id: true,
              name: true,
              startTime: true,
              organizationId: true,
              locationId: true,
            },
          },
          client: { columns: { id: true, name: true, email: true } },
        },
      });
      const scopedBookings = bookings.filter(
        (booking) => booking.studioClass.organizationId === organizationId
      );
      if (scopedBookings.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No eligible bookings selected",
        });
      }

      await db.transaction(async (tx) => {
        if (input.status === "NO_SHOW") {
          await tx
            .update(client)
            .set({ currentStreak: 0, updatedAt: new Date() })
            .where(inArray(client.id, scopedBookings.map((booking) => booking.clientId)));
        }

        await tx
          .update(studioBooking)
          .set({
            status: input.status,
            cancelledAt: input.status === "LATE_CANCEL" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(inArray(studioBooking.id, scopedBookings.map((booking) => booking.id)));
      });

      if (input.status === "NO_SHOW") {
        await Promise.all(
          scopedBookings.map((booking) =>
            triggerWorkflowsForNodeType({
              nodeType: NodeType.MEMBER_NO_SHOW_TRIGGER,
              organizationId,
              locationId: booking.studioClass.locationId,
              triggerData: {
                bookingId: booking.id,
                clientId: booking.clientId,
                classId: booking.classId,
                client: booking.client,
                class: {
                  id: booking.studioClass.id,
                  name: booking.studioClass.name,
                  startTime: booking.studioClass.startTime.toISOString(),
                },
              },
            }).catch((error: unknown) => {
              console.error("Failed to trigger bulk no-show workflows", error);
            }),
          ),
        );
      }

      return { updated: scopedBookings.length };
    }),

  listForClass: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const targetClass = await db.query.studioClass.findFirst({
        where: and(eq(studioClass.id, input.classId), eq(studioClass.organizationId, organizationId)),
        columns: { id: true },
      });
      if (!targetClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      return db.query.studioBooking.findMany({
        where: eq(studioBooking.classId, input.classId),
        with: {
          client: { columns: { id: true, name: true, email: true, phone: true } },
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
          input.status ? eq(studioBooking.status, input.status) : undefined
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

      return rows.filter((row) => row.studioClass.organizationId === organizationId);
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      if (booking.studioClass.organizationId !== organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (booking.checkedInAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already checked in" });
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
});
