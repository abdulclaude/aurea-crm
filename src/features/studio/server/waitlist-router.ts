import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ne, or } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { classWaitlist, studioBooking, studioClass as studioClassTable } from "@/db/schema";
import { inngest } from "@/inngest/client";

export const waitlistRouter = createTRPCRouter({
  /**
   * Join the waitlist for a class
   */
  join: protectedProcedure
    .input(z.object({ classId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const studioClass = await db.query.studioClass.findFirst({
        where: and(eq(studioClassTable.id, input.classId), eq(studioClassTable.organizationId, ctx.orgId)),
      });
      if (!studioClass) throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      if (studioClass.status === "CANCELLED") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot join waitlist for a cancelled class" });

      // Check not already on waitlist
      const existing = await db.query.classWaitlist.findFirst({
        where: and(
          eq(classWaitlist.classId, input.classId),
          eq(classWaitlist.clientId, input.clientId),
          or(eq(classWaitlist.status, "WAITING"), eq(classWaitlist.status, "NOTIFIED"))!
        ),
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Already on the waitlist" });

      // Check not already booked
      const existingBooking = await db.query.studioBooking.findFirst({
        where: and(
          eq(studioBooking.classId, input.classId),
          eq(studioBooking.clientId, input.clientId),
          ne(studioBooking.status, "CANCELLED")
        ),
      });
      if (existingBooking) throw new TRPCError({ code: "CONFLICT", message: "Already booked for this class" });

      // Get next position
      const maxPosition = await db.query.classWaitlist.findFirst({
        where: eq(classWaitlist.classId, input.classId),
        orderBy: desc(classWaitlist.position),
        columns: { position: true },
      });

      const now = new Date();
      const [createdEntry] = await db
        .insert(classWaitlist)
        .values({
          id: createId(),
          classId: input.classId,
          clientId: input.clientId,
          position: (maxPosition?.position ?? 0) + 1,
          joinedAt: now,
          status: "WAITING",
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: classWaitlist.id });

      return db.query.classWaitlist.findFirst({
        where: eq(classWaitlist.id, createdEntry.id),
        with: { client: { columns: { id: true, name: true, email: true } } },
      });
    }),

  leave: protectedProcedure
    .input(z.object({ waitlistId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const entry = await db.query.classWaitlist.findFirst({
        where: eq(classWaitlist.id, input.waitlistId),
        with: { studioClass: { columns: { organizationId: true } } },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      if (entry.studioClass.organizationId !== ctx.orgId) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

      const [updatedEntry] = await db
        .update(classWaitlist)
        .set({ status: "CANCELLED_WAITLIST", updatedAt: new Date() })
        .where(eq(classWaitlist.id, input.waitlistId))
        .returning();

      return updatedEntry;
    }),

  /**
   * Notify the next person on the waitlist (called when a spot opens)
   */
  notifyNext: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const studioClass = await db.query.studioClass.findFirst({
        where: and(eq(studioClassTable.id, input.classId), eq(studioClassTable.organizationId, ctx.orgId)),
      });
      if (!studioClass) throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });

      const nextEntry = await db.query.classWaitlist.findFirst({
        where: and(eq(classWaitlist.classId, input.classId), eq(classWaitlist.status, "WAITING")),
        orderBy: asc(classWaitlist.position),
        with: { client: { columns: { id: true, name: true, email: true } } },
      });

      if (!nextEntry) return { notified: false, message: "No one on the waitlist" };

      await db
        .update(classWaitlist)
        .set({ status: "NOTIFIED", notifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(classWaitlist.id, nextEntry.id));

      return { notified: true, client: nextEntry.client };
    }),

  /**
   * Confirm a waitlist notification (member accepts the spot)
   */
  confirm: protectedProcedure
    .input(z.object({ waitlistId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const entry = await db.query.classWaitlist.findFirst({
        where: and(eq(classWaitlist.id, input.waitlistId), eq(classWaitlist.status, "NOTIFIED")),
        with: {
          studioClass: {
            columns: { id: true, organizationId: true, maxCapacity: true },
          },
        },
      });

      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found or not in notified state" });
      if (entry.studioClass.organizationId !== ctx.orgId) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

      // Double-check capacity
      const [bookingCount] = await db
        .select({ total: count() })
        .from(studioBooking)
        .where(eq(studioBooking.classId, entry.studioClass.id));
      if (entry.studioClass.maxCapacity && (bookingCount?.total ?? 0) >= entry.studioClass.maxCapacity) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Class is still full" });
      }

      const booking = await db.transaction(async (tx) => {
        const [createdBooking] = await tx
          .insert(studioBooking)
          .values({
            id: createId(),
            classId: entry.classId,
            clientId: entry.clientId,
            status: "BOOKED",
            bookedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        await tx
          .update(classWaitlist)
          .set({ status: "CONFIRMED", respondedAt: new Date(), updatedAt: new Date() })
          .where(eq(classWaitlist.id, input.waitlistId));

        return createdBooking;
      });

      return booking;
    }),

  triggerAutoPromote: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      await inngest.send({
        name: "studio/booking.cancelled",
        data: { classId: input.classId, organizationId: ctx.orgId },
      });

      return { triggered: true };
    }),

  decline: protectedProcedure
    .input(z.object({ waitlistId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const entry = await db.query.classWaitlist.findFirst({
        where: and(eq(classWaitlist.id, input.waitlistId), eq(classWaitlist.status, "NOTIFIED")),
        with: { studioClass: { columns: { id: true, organizationId: true } } },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found or not in notified state" });
      if (entry.studioClass.organizationId !== ctx.orgId) throw new TRPCError({ code: "FORBIDDEN" });

      await db
        .update(classWaitlist)
        .set({ status: "EXPIRED", respondedAt: new Date(), updatedAt: new Date() })
        .where(eq(classWaitlist.id, input.waitlistId));

      await inngest.send({
        name: "studio/booking.cancelled",
        data: { classId: entry.studioClass.id, organizationId: ctx.orgId },
      });

      return { declined: true };
    }),

  listForClass: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const studioClass = await db.query.studioClass.findFirst({
        where: and(eq(studioClassTable.id, input.classId), eq(studioClassTable.organizationId, ctx.orgId)),
        columns: { id: true },
      });
      if (!studioClass) return [];

      return db.query.classWaitlist.findMany({
        where: eq(classWaitlist.classId, input.classId),
        with: { client: { columns: { id: true, name: true, email: true, phone: true } } },
        orderBy: asc(classWaitlist.position),
      });
    }),
});
