import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, isNull, lt, ne } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import { db } from "@/db";
import { checkIn, client, studioBooking, studioClass } from "@/db/schema";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { requireCapability } from "@/features/permissions/server/authorization";
import { matchesMemberCheckedInTrigger } from "@/features/nodes/studio/lib/studio-node-config";
import { verifyMemberCheckInPass } from "@/features/studio/lib/member-checkin-pass";
import {
  performMemberCheckIn,
  type IntroOfferUsage,
} from "./member-checkin-service";

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

function requireAttendanceAccess(
  ctx: {
    auth: { user: { id: string } };
    orgId: string | null;
    locationId: string | null;
  },
  capability: "schedule.view" | "attendance.manage",
) {
  return requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability,
  });
}

export async function dispatchMemberCheckInWorkflows({
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
    shouldTriggerNode: (node) =>
      matchesMemberCheckedInTrigger(node.data, checkedInClient.attendanceCount),
  }).catch(() => {
    console.error("Failed to trigger member check-in workflows", { checkInId });
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
      return (
        targetCount === undefined ||
        checkedInClient.attendanceCount === targetCount
      );
    },
  }).catch(() => {
    console.error("Failed to trigger member class milestone workflows", {
      checkInId,
    });
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
        if (getNumberFromJson(node.data, "creditThreshold") !== undefined) {
          return false;
        }
        const offerId = getStringFromJson(node.data, "offerId");
        return !offerId || offerId === completedIntroOffer.offerId;
      },
    }).catch(() => {
      console.error("Failed to trigger intro offer completion workflows", {
        checkInId,
      });
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

function exactLocation(column: AnyPgColumn, locationId: string | null) {
  return locationId === null ? isNull(column) : eq(column, locationId);
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
      await requireAttendanceAccess(ctx, "attendance.manage");
      const result = await performMemberCheckIn({
        actorUserId: ctx.auth.user.id,
        organizationId,
        activeLocationId: ctx.locationId,
        classId: input.classId,
        clientId: input.clientId,
        method: input.method,
      });

      await dispatchMemberCheckInWorkflows({
        organizationId,
        locationId: result.studioClass.locationId,
        checkInId: result.checkInRecord.id,
        client: result.client,
        studioClass: result.studioClass,
        introOffers: result.introOffers,
      });

      return result.checkInRecord;
    }),

  qrCheckIn: protectedProcedure
    .input(z.object({ classId: z.string(), qrToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      await requireAttendanceAccess(ctx, "attendance.manage");
      const memberPass = verifyMemberCheckInPass(input.qrToken);
      if (!memberPass) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This member pass is invalid or has expired.",
        });
      }
      if (
        memberPass.organizationId !== organizationId ||
        (ctx.locationId !== null && memberPass.locationId !== ctx.locationId)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      const result = await performMemberCheckIn({
        actorUserId: ctx.auth.user.id,
        organizationId,
        activeLocationId: ctx.locationId,
        classId: input.classId,
        clientId: memberPass.clientId,
        method: "QR_CODE",
      });

      await dispatchMemberCheckInWorkflows({
        organizationId,
        locationId: result.studioClass.locationId,
        checkInId: result.checkInRecord.id,
        client: result.client,
        studioClass: result.studioClass,
        introOffers: result.introOffers,
      });

      return {
        checkIn: result.checkInRecord,
        client: { id: result.client.id, name: result.client.name },
      };
    }),

  getClassRoster: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      await requireAttendanceAccess(ctx, "schedule.view");

      const targetClass = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, organizationId),
          ctx.locationId
            ? eq(studioClass.locationId, ctx.locationId)
            : undefined,
        ),
        columns: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
          status: true,
          maxCapacity: true,
          locationId: true,
        },
      });
      if (!targetClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const bookings = await db.query.studioBooking.findMany({
        where: and(
          eq(studioBooking.classId, input.classId),
          ne(studioBooking.status, "CANCELLED"),
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
        where: and(
          eq(checkIn.classId, input.classId),
          eq(checkIn.organizationId, organizationId),
          exactLocation(checkIn.locationId, targetClass.locationId),
        ),
        columns: {
          clientId: true,
          checkedInAt: true,
          method: true,
          isLateArrival: true,
        },
      });

      const checkInMap = new Map(
        checkIns.map((record) => [record.clientId, record]),
      );
      const hasClassEnded = targetClass.endTime <= new Date();
      const checkInOpen =
        !hasClassEnded &&
        targetClass.status !== "CANCELLED" &&
        targetClass.status !== "COMPLETED";

      return {
        class: targetClass,
        roster: bookings.map((booking) => ({
          bookingId: booking.id,
          client: booking.client,
          bookedAt: booking.bookedAt,
          status:
            !hasClassEnded && booking.status === "NO_SHOW"
              ? "BOOKED"
              : booking.status,
          checkIn: checkInMap.get(booking.clientId) ?? null,
          isCheckedIn: checkInMap.has(booking.clientId),
        })),
        totalBooked: bookings.length,
        totalCheckedIn: checkIns.length,
        maxCapacity: targetClass.maxCapacity,
        checkInOpen,
        hasClassEnded,
      };
    }),

  markNoShow: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      await requireAttendanceAccess(ctx, "attendance.manage");

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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }
      if (booking.studioClass.organizationId !== organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (ctx.locationId && booking.studioClass.locationId !== ctx.locationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (booking.checkedInAt || booking.status === "ATTENDED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Checked-in members cannot be marked as no-shows.",
        });
      }
      if (booking.status !== "BOOKED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only active bookings can be marked as no-shows.",
        });
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
          .where(
            and(
              eq(client.id, booking.clientId),
              eq(client.organizationId, organizationId),
              exactLocation(client.locationId, booking.studioClass.locationId),
            ),
          )
          .returning(checkInClientReturning);

        const [updatedBooking] = await tx
          .update(studioBooking)
          .set({ status: "NO_SHOW", updatedAt: now })
          .where(
            and(
              eq(studioBooking.id, input.bookingId),
              eq(studioBooking.status, "BOOKED"),
            ),
          )
          .returning();

        if (!updatedBooking) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This booking was already updated.",
          });
        }
        if (!updatedClient) {
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
        locationId: booking.studioClass.locationId,
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
      }).catch(() => {
        console.error("Failed to trigger no-show workflows", {
          bookingId: result.booking.id,
        });
      });

      return result.booking;
    }),

  todayStats: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrg(ctx);
    await requireAttendanceAccess(ctx, "schedule.view");
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
            lt(checkIn.checkedInAt, tomorrow),
          ),
        ),
      db
        .select({ total: count() })
        .from(studioClass)
        .where(
          and(
            eq(studioClass.organizationId, organizationId),
            ctx.locationId
              ? eq(studioClass.locationId, ctx.locationId)
              : undefined,
            gte(studioClass.startTime, today),
            lt(studioClass.startTime, tomorrow),
          ),
        ),
    ]);

    return {
      totalCheckIns: totalCheckIns[0]?.total ?? 0,
      totalClasses: totalClasses[0]?.total ?? 0,
    };
  }),
});
