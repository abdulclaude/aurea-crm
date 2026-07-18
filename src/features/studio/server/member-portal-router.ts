import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  notExists,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { db } from "@/db";
import {
  clientAccountBalance,
  client as clientTable,
  organization,
  studioBooking,
  studioClass as studioClassTable,
} from "@/db/schema";
import { createMemberCheckInPass } from "@/features/studio/lib/member-checkin-pass";
import { createClassBooking } from "@/features/studio/server/class-booking-service";
import { createClassBookingCheckout } from "@/features/studio/server/class-booking-checkout";
import { dispatchClassBookingWorkflow } from "@/features/studio/server/paid-class-booking-workflow-dispatch";
import { requireCapability } from "@/features/permissions/server/authorization";
import { getPublicationControlBySource } from "@/features/publications/public/resolver";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";

const PORTAL_TOKEN_EXPIRY_HOURS = 72;

export const memberPortalRouter = createTRPCRouter({
  generatePortalLink: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organisation",
        });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "customer.manage",
      });

      const client = await db.query.client.findFirst({
        where: and(
          eq(clientTable.id, input.clientId),
          eq(clientTable.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(clientTable.locationId, ctx.locationId)
            : isNull(clientTable.locationId),
        ),
        columns: { id: true, name: true, email: true },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      const token = nanoid(40);
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + PORTAL_TOKEN_EXPIRY_HOURS);

      await db
        .update(clientTable)
        .set({
          portalToken: token,
          portalTokenExpiry: expiry,
          updatedAt: new Date(),
        })
        .where(eq(clientTable.id, client.id));

      const appUrl =
        process.env.APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";
      const portalUrl = `${appUrl}/member-portal/${token}`;

      return { portalUrl, expiresAt: expiry };
    }),

  getPortalData: baseProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const client = await db.query.client.findFirst({
        where: and(
          eq(clientTable.portalToken, input.token),
          gt(clientTable.portalTokenExpiry, new Date()),
        ),
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          fitnessGoals: true,
          healthNotes: true,
          attendanceCount: true,
          currentStreak: true,
          organizationId: true,
          locationId: true,
        },
        with: {
          studioMemberships: {
            where: (membership) =>
              inArray(membership.status, ["ACTIVE", "PAUSED"]),
            with: {
              membershipPlan: {
                columns: {
                  id: true,
                  name: true,
                  type: true,
                  billingInterval: true,
                  classCredits: true,
                },
              },
              classCredits: {
                columns: {
                  id: true,
                  totalCredits: true,
                  usedCredits: true,
                  expiresAt: true,
                },
              },
            },
            orderBy: (membership, { desc }) => [desc(membership.startDate)],
            limit: 5,
          },
          checkIns: {
            orderBy: (checkIn, { desc }) => [desc(checkIn.checkedInAt)],
            limit: 10,
            with: {
              studioClass: {
                columns: { id: true, name: true, startTime: true },
              },
            },
          },
          studioPayments: {
            where: (payment, { and, eq, isNull }) =>
              and(eq(payment.status, "SUCCEEDED"), isNull(payment.deletedAt)),
            orderBy: (payment, { desc }) => [desc(payment.createdAt)],
            limit: 10,
            columns: {
              id: true,
              amount: true,
              currency: true,
              type: true,
              description: true,
              createdAt: true,
            },
          },
        },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired portal link",
        });
      }

      const accountBalance = await db.query.clientAccountBalance.findFirst({
        where: and(
          eq(clientAccountBalance.organizationId, client.organizationId),
          eq(clientAccountBalance.clientId, client.id),
          client.locationId
            ? eq(clientAccountBalance.locationId, client.locationId)
            : isNull(clientAccountBalance.locationId),
        ),
        columns: { balance: true, currency: true },
      });

      const upcomingClassesRaw = await db.query.studioClass.findMany({
        where: and(
          eq(studioClassTable.organizationId, client.organizationId),
          client.locationId
            ? eq(studioClassTable.locationId, client.locationId)
            : isNull(studioClassTable.locationId),
          gte(studioClassTable.startTime, new Date()),
          inArray(studioClassTable.status, ["SCHEDULED", "IN_PROGRESS"]),
          notExists(
            db
              .select({ id: studioBooking.id })
              .from(studioBooking)
              .where(
                and(
                  eq(studioBooking.classId, studioClassTable.id),
                  eq(studioBooking.clientId, client.id),
                  eq(studioBooking.status, "BOOKED"),
                ),
              ),
          ),
        ),
        orderBy: [asc(studioClassTable.startTime)],
        limit: 10,
        columns: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
          maxCapacity: true,
        },
        with: {
          studioBookings: {
            where: eq(studioBooking.status, "BOOKED"),
            columns: { id: true },
          },
          instructor: {
            columns: { id: true, name: true },
          },
          serviceType: {
            columns: { id: true, name: true, calendarColor: true },
          },
          classType: {
            columns: { id: true, name: true, color: true },
          },
        },
      });

      const { studioMemberships, checkIns, studioPayments, ...clientData } =
        client;
      const upcomingClasses = upcomingClassesRaw.map(
        ({ studioBookings, instructor, ...cls }) => ({
          ...cls,
          _count: { studioBooking: studioBookings.length },
          instructor: instructor,
        }),
      );

      return {
        client: {
          ...clientData,
          studioMembership: studioMemberships.map(
            ({ classCredits, ...membership }) => ({
              ...membership,
              classCredit: classCredits,
            }),
          ),
          checkIn: checkIns,
          studioPayment: studioPayments,
          accountCreditBalance: Number(accountBalance?.balance ?? 0),
          accountCreditCurrency: accountBalance?.currency ?? "GBP",
        },
        upcomingClasses,
        memberCheckInPass: createMemberCheckInPass({
          organizationId: client.organizationId,
          locationId: client.locationId,
          clientId: client.id,
        }),
      };
    }),

  getPublicSchedule: baseProcedure
    .input(
      z.object({
        slug: z.string(),
        days: z.number().int().min(1).max(14).default(7),
      }),
    )
    .query(async ({ input }) => {
      const org = await db.query.organization.findFirst({
        where: eq(organization.slug, input.slug),
        columns: { id: true, name: true, logo: true },
      });

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Studio not found" });
      }

      const managedTarget = await getPublicationControlBySource({
        organizationId: org.id,
        locationId: null,
        kind: "SCHEDULE",
        sourceKey: `schedule:organization:${org.id}`,
      });
      if (managedTarget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Use the studio's published schedule URL.",
        });
      }

      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + input.days);

      const classesRaw = await db.query.studioClass.findMany({
        where: and(
          eq(studioClassTable.organizationId, org.id),
          gte(studioClassTable.startTime, from),
          lt(studioClassTable.startTime, to),
          inArray(studioClassTable.status, ["SCHEDULED", "IN_PROGRESS"]),
        ),
        orderBy: [asc(studioClassTable.startTime)],
        columns: {
          id: true,
          name: true,
          description: true,
          startTime: true,
          endTime: true,
          maxCapacity: true,
        },
        with: {
          studioBookings: {
            where: eq(studioBooking.status, "BOOKED"),
            columns: { id: true },
          },
          instructor: { columns: { id: true, name: true, bio: true } },
          classType: { columns: { id: true, name: true, color: true } },
          serviceType: {
            columns: { id: true, name: true, calendarColor: true },
          },
        },
      });

      const classes = classesRaw.map(
        ({ studioBookings, instructor, ...cls }) => ({
          ...cls,
          _count: { studioBooking: studioBookings.length },
          instructor: instructor,
        }),
      );

      return { studio: org, classes };
    }),

  bookClass: baseProcedure
    .input(
      z.object({
        token: z.string(),
        classId: z.string(),
        slidingScaleAmount: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = await db.query.client.findFirst({
        where: and(
          eq(clientTable.portalToken, input.token),
          gt(clientTable.portalTokenExpiry, new Date()),
        ),
        columns: { id: true, organizationId: true, locationId: true },
      });

      if (!client) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired portal link",
        });
      }

      if (!client.locationId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This member portal is not bound to a studio location",
        });
      }
      const booking = await createClassBooking({
        organizationId: client.organizationId,
        locationId: client.locationId,
        classId: input.classId,
        clientId: client.id,
        channel: "MEMBER_PORTAL",
        slidingScaleAmount: input.slidingScaleAmount,
      });
      if (booking.created && !booking.requiresPayment) {
        await dispatchClassBookingWorkflow(booking.bookingId).catch(
          (error: unknown) => {
            console.error("Failed to trigger class-booked workflows", error);
          },
        );
      }
      if (!booking.requiresPayment) return { ...booking, checkout: null };
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        "http://localhost:3000";
      const portalUrl = `${appUrl}/member-portal/${encodeURIComponent(input.token)}`;
      const checkout = await createClassBookingCheckout({
        organizationId: client.organizationId,
        locationId: client.locationId,
        bookingId: booking.bookingId,
        successUrl: `${portalUrl}?payment=success`,
        cancelUrl: `${portalUrl}?payment=cancelled`,
      });
      return { ...booking, checkout };
    }),
});
