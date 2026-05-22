import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import { db } from "@/db";
import {
  checkIn,
  client,
  introOfferRedemption,
  studioBooking,
  studioClass,
} from "@/db/schema";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

type MemberCheckInClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[] | null;
  acquisitionStage: "INQUIRY" | "TRIAL" | "ACTIVE" | "LOST";
  attendanceCount: number;
  currentStreak: number;
};

type MemberCheckInClass = {
  id: string;
  name: string;
  startTime: Date;
};

type IntroOfferUsage = {
  id: string;
  offerId: string;
  offerName: string;
  classesUsed: number;
  classCredits: number | null;
  completed: boolean;
  status: string;
};

const checkInClientReturning = {
  id: client.id,
  name: client.name,
  email: client.email,
  phone: client.phone,
  tags: client.tags,
  acquisitionStage: client.acquisitionStage,
  attendanceCount: client.attendanceCount,
  currentStreak: client.currentStreak,
};

function requireOrg(ctx: { orgId: string | null }) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }
  return ctx.orgId;
}

async function incrementIntroOfferUsage({
  organizationId,
  locationId,
  clientId,
}: {
  organizationId: string;
  locationId: string | null;
  clientId: string;
}): Promise<IntroOfferUsage[]> {
  const redemptions = await db.query.introOfferRedemption.findMany({
    where: and(
      eq(introOfferRedemption.clientId, clientId),
      eq(introOfferRedemption.status, "ACTIVE")
    ),
    with: {
      introOffer: {
        columns: {
          id: true,
          name: true,
          classCredits: true,
          organizationId: true,
          locationId: true,
        },
      },
    },
  });

  const scopedRedemptions = redemptions.filter(
    (redemption) =>
      redemption.introOffer.organizationId === organizationId &&
      redemption.introOffer.locationId === locationId
  );

  const updatedRedemptions: IntroOfferUsage[] = [];
  for (const redemption of scopedRedemptions) {
    const [updated] = await db
      .update(introOfferRedemption)
      .set({ classesUsed: sql`${introOfferRedemption.classesUsed} + 1` })
      .where(eq(introOfferRedemption.id, redemption.id))
      .returning({
        id: introOfferRedemption.id,
        classesUsed: introOfferRedemption.classesUsed,
        status: introOfferRedemption.status,
      });

    if (!updated) {
      continue;
    }

    const completed =
      redemption.introOffer.classCredits !== null &&
      redemption.classesUsed < redemption.introOffer.classCredits &&
      updated.classesUsed >= redemption.introOffer.classCredits;

    updatedRedemptions.push({
      id: updated.id,
      offerId: redemption.introOffer.id,
      offerName: redemption.introOffer.name,
      classesUsed: updated.classesUsed,
      classCredits: redemption.introOffer.classCredits,
      completed,
      status: updated.status,
    });
  }

  return updatedRedemptions;
}

async function dispatchMemberCheckInWorkflows({
  organizationId,
  locationId,
  checkInId,
  client: checkedInClient,
  studioClass: checkedInClass,
  introOffers,
}: {
  organizationId: string;
  locationId: string | null;
  checkInId: string;
  client: MemberCheckInClient;
  studioClass: MemberCheckInClass;
  introOffers: IntroOfferUsage[];
}): Promise<void> {
  const completedIntroOffer = introOffers.find((offer) => offer.completed);

  await triggerWorkflowsForNodeType({
    nodeType: NodeType.MEMBER_CHECKED_IN_TRIGGER,
    organizationId,
    locationId,
    triggerData: {
      checkInId,
      clientId: checkedInClient.id,
      classId: checkedInClass.id,
      attendanceCount: checkedInClient.attendanceCount,
      currentStreak: checkedInClient.currentStreak,
      client: checkedInClient,
      class: {
        id: checkedInClass.id,
        name: checkedInClass.name,
        startTime: checkedInClass.startTime.toISOString(),
      },
      introOffer: {
        completed: Boolean(completedIntroOffer),
        completedOfferId: completedIntroOffer?.offerId ?? null,
        redemptions: introOffers,
      },
    },
  }).catch((error: unknown) => {
    console.error("Failed to trigger member check-in workflows", error);
  });

  await triggerWorkflowsForNodeType({
    nodeType: NodeType.MEMBER_CLASS_COUNT_TRIGGER,
    organizationId,
    locationId,
    triggerData: {
      checkInId,
      clientId: checkedInClient.id,
      classId: checkedInClass.id,
      attendanceCount: checkedInClient.attendanceCount,
      currentStreak: checkedInClient.currentStreak,
      client: checkedInClient,
      class: {
        id: checkedInClass.id,
        name: checkedInClass.name,
        startTime: checkedInClass.startTime.toISOString(),
      },
    },
    shouldTriggerNode: (node) => {
      const targetCount = getNumberFromJson(node.data, "targetCount");
      return targetCount === undefined || checkedInClient.attendanceCount === targetCount;
    },
  }).catch((error: unknown) => {
    console.error("Failed to trigger member class milestone workflows", error);
  });

  if (completedIntroOffer) {
    await triggerWorkflowsForNodeType({
      nodeType: NodeType.INTRO_OFFER_COMPLETED_TRIGGER,
      organizationId,
      locationId,
      triggerData: {
        checkInId,
        clientId: checkedInClient.id,
        classId: checkedInClass.id,
        client: checkedInClient,
        class: {
          id: checkedInClass.id,
          name: checkedInClass.name,
          startTime: checkedInClass.startTime.toISOString(),
        },
        introOffer: completedIntroOffer,
      },
      shouldTriggerNode: (node) => {
        const offerId = getStringFromJson(node.data, "offerId");
        return !offerId || offerId === completedIntroOffer.offerId;
      },
    }).catch((error: unknown) => {
      console.error("Failed to trigger intro offer completion workflows", error);
    });
  }
}

function getNumberFromJson(value: unknown, key: string): number | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const nested = value[key];
  return typeof nested === "number" ? nested : undefined;
}

function getStringFromJson(value: unknown, key: string): string | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const nested = value[key];
  return typeof nested === "string" ? nested : undefined;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const checkinRouter = createTRPCRouter({
  manualCheckIn: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        clientId: z.string(),
        method: z
          .enum(["QR_CODE", "NFC", "KIOSK", "GEO", "MANUAL", "PIN"])
          .default("MANUAL"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const locationId = ctx.locationId ?? null;

      const targetClass = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, organizationId)
        ),
      });
      if (!targetClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const existingCheckIn = await db.query.checkIn.findFirst({
        where: and(
          eq(checkIn.classId, input.classId),
          eq(checkIn.clientId, input.clientId)
        ),
      });
      if (existingCheckIn) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already checked in" });
      }

      const now = new Date();
      const booking = await db.query.studioBooking.findFirst({
        where: and(
          eq(studioBooking.classId, input.classId),
          eq(studioBooking.clientId, input.clientId),
          ne(studioBooking.status, "CANCELLED")
        ),
      });

      const result = await db.transaction(async (tx) => {
        const [checkInRecord] = await tx
          .insert(checkIn)
          .values({
            id: randomUUID(),
            clientId: input.clientId,
            classId: input.classId,
            method: input.method,
            checkedInAt: now,
            checkedInBy: ctx.auth.user.id,
            isLateArrival: now > targetClass.startTime,
            organizationId,
            locationId,
            createdAt: now,
          })
          .returning();

        const [updatedClient] = await tx
          .update(client)
          .set({
            attendanceCount: sql`${client.attendanceCount} + 1`,
            currentStreak: sql`${client.currentStreak} + 1`,
            updatedAt: now,
          })
          .where(eq(client.id, input.clientId))
          .returning(checkInClientReturning);

        if (!checkInRecord || !updatedClient) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to check in member",
          });
        }

        if (booking) {
          await tx
            .update(studioBooking)
            .set({ checkedInAt: now, status: "ATTENDED", updatedAt: now })
            .where(eq(studioBooking.id, booking.id));
        }

        return { checkInRecord, client: updatedClient };
      });

      const introOffers = await incrementIntroOfferUsage({
        organizationId,
        locationId,
        clientId: input.clientId,
      });

      await dispatchMemberCheckInWorkflows({
        organizationId,
        locationId,
        checkInId: result.checkInRecord.id,
        client: result.client,
        studioClass: targetClass,
        introOffers,
      });

      return result.checkInRecord;
    }),

  qrCheckIn: protectedProcedure
    .input(z.object({ classId: z.string(), qrToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const locationId = ctx.locationId ?? null;
      const clientId = input.qrToken;

      const targetClient = await db.query.client.findFirst({
        where: and(eq(client.id, clientId), eq(client.organizationId, organizationId)),
      });
      if (!targetClient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid QR code" });
      }

      const targetClass = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, organizationId)
        ),
      });
      if (!targetClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const existingCheckIn = await db.query.checkIn.findFirst({
        where: and(eq(checkIn.classId, input.classId), eq(checkIn.clientId, clientId)),
      });
      if (existingCheckIn) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already checked in" });
      }

      const now = new Date();
      const result = await db.transaction(async (tx) => {
        const [checkInRecord] = await tx
          .insert(checkIn)
          .values({
            id: randomUUID(),
            clientId,
            classId: input.classId,
            method: "QR_CODE",
            checkedInAt: now,
            checkedInBy: ctx.auth.user.id,
            isLateArrival: now > targetClass.startTime,
            organizationId,
            locationId,
            createdAt: now,
          })
          .returning();

        const [updatedClient] = await tx
          .update(client)
          .set({
            attendanceCount: sql`${client.attendanceCount} + 1`,
            currentStreak: sql`${client.currentStreak} + 1`,
            updatedAt: now,
          })
          .where(eq(client.id, clientId))
          .returning(checkInClientReturning);

        if (!checkInRecord || !updatedClient) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to check in member",
          });
        }

        return { checkInRecord, client: updatedClient };
      });

      const introOffers = await incrementIntroOfferUsage({
        organizationId,
        locationId,
        clientId,
      });

      await dispatchMemberCheckInWorkflows({
        organizationId,
        locationId,
        checkInId: result.checkInRecord.id,
        client: result.client,
        studioClass: targetClass,
        introOffers,
      });

      return {
        checkIn: result.checkInRecord,
        client: { id: targetClient.id, name: targetClient.name },
      };
    }),

  getClassRoster: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);

      const targetClass = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, organizationId)
        ),
        columns: { id: true, name: true, startTime: true, endTime: true, maxCapacity: true },
      });
      if (!targetClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const bookings = await db.query.studioBooking.findMany({
        where: and(
          eq(studioBooking.classId, input.classId),
          ne(studioBooking.status, "CANCELLED")
        ),
        with: {
          client: {
            columns: {
              id: true,
              name: true,
              email: true,
              phone: true,
              attendanceCount: true,
              currentStreak: true,
            },
          },
        },
        orderBy: (table, { asc }) => asc(table.bookedAt),
      });

      const checkIns = await db.query.checkIn.findMany({
        where: eq(checkIn.classId, input.classId),
        columns: {
          clientId: true,
          checkedInAt: true,
          method: true,
          isLateArrival: true,
        },
      });

      const checkInMap = new Map(checkIns.map((record) => [record.clientId, record]));
      const hasClassEnded = targetClass.endTime <= new Date();

      return {
        class: targetClass,
        roster: bookings.map((booking) => ({
          bookingId: booking.id,
          client: booking.client,
          bookedAt: booking.bookedAt,
          status: !hasClassEnded && booking.status === "NO_SHOW" ? "BOOKED" : booking.status,
          checkIn: checkInMap.get(booking.clientId) ?? null,
          isCheckedIn: checkInMap.has(booking.clientId),
        })),
        totalBooked: bookings.length,
        totalCheckedIn: checkIns.length,
        maxCapacity: targetClass.maxCapacity,
      };
    }),

  markNoShow: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);

      const booking = await db.query.studioBooking.findFirst({
        where: eq(studioBooking.id, input.bookingId),
        with: {
          studioClass: {
            columns: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
              organizationId: true,
              locationId: true,
            },
          },
          client: {
            columns: {
              id: true,
              name: true,
              email: true,
              phone: true,
              tags: true,
              acquisitionStage: true,
              attendanceCount: true,
              currentStreak: true,
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
      if (booking.studioClass.endTime > new Date()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No-shows can only be marked after the class has ended",
        });
      }

      const now = new Date();
      const result = await db.transaction(async (tx) => {
        const [updatedClient] = await tx
          .update(client)
          .set({ currentStreak: 0, updatedAt: now })
          .where(eq(client.id, booking.clientId))
          .returning(checkInClientReturning);

        const [updatedBooking] = await tx
          .update(studioBooking)
          .set({ status: "NO_SHOW", updatedAt: now })
          .where(eq(studioBooking.id, input.bookingId))
          .returning();

        if (!updatedClient || !updatedBooking) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to mark no-show",
          });
        }

        return { client: updatedClient, booking: updatedBooking };
      });

      await triggerWorkflowsForNodeType({
        nodeType: NodeType.MEMBER_NO_SHOW_TRIGGER,
        organizationId,
        locationId: ctx.locationId ?? null,
        triggerData: {
          bookingId: result.booking.id,
          clientId: result.client.id,
          classId: booking.studioClass.id,
          client: result.client,
          class: {
            id: booking.studioClass.id,
            name: booking.studioClass.name,
            startTime: booking.studioClass.startTime.toISOString(),
          },
        },
      }).catch((error: unknown) => {
        console.error("Failed to trigger no-show workflows", error);
      });

      return result.booking;
    }),

  todayStats: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrg(ctx);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const [totalCheckIns, totalClasses] = await Promise.all([
      db
        .select({ total: count() })
        .from(checkIn)
        .where(
          and(
            eq(checkIn.organizationId, organizationId),
            ctx.locationId ? eq(checkIn.locationId, ctx.locationId) : undefined,
            gte(checkIn.checkedInAt, today),
            lt(checkIn.checkedInAt, tomorrow)
          )
        ),
      db
        .select({ total: count() })
        .from(studioClass)
        .where(
          and(
            eq(studioClass.organizationId, organizationId),
            ctx.locationId ? eq(studioClass.locationId, ctx.locationId) : undefined,
            gte(studioClass.startTime, today),
            lt(studioClass.startTime, tomorrow)
          )
        ),
    ]);

    return {
      totalCheckIns: totalCheckIns[0]?.total ?? 0,
      totalClasses: totalClasses[0]?.total ?? 0,
    };
  }),
});
