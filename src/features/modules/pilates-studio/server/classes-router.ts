import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { client, studioBooking, studioClass as studioClassTable } from "@/db/schema";

function scopedClassWhere(organizationId: string | null, locationId: string | null, extra?: SQL): SQL | undefined {
  return and(
    eq(studioClassTable.organizationId, organizationId ?? ""),
    locationId ? eq(studioClassTable.locationId, locationId) : isNull(studioClassTable.locationId),
    extra
  );
}

export const studioClassesRouter = createTRPCRouter({
  /**
   * List classes with pagination and filters
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        instructorName: z.string().optional(),
        serviceTypeId: z.string().optional(),
        roomId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        page,
        pageSize,
        search,
        startDate,
        endDate,
        instructorName,
        serviceTypeId,
        roomId,
      } = input;

      const where = scopedClassWhere(
        ctx.orgId,
        ctx.locationId,
        and(
          search ? or(ilike(studioClassTable.name, `%${search}%`), ilike(studioClassTable.description, `%${search}%`)) : undefined,
          startDate ? gte(studioClassTable.startTime, new Date(startDate)) : undefined,
          endDate ? lte(studioClassTable.startTime, new Date(endDate)) : undefined,
          instructorName ? ilike(studioClassTable.instructorName, `%${instructorName}%`) : undefined,
          serviceTypeId ? eq(studioClassTable.serviceTypeId, serviceTypeId) : undefined,
          roomId ? eq(studioClassTable.roomId, roomId) : undefined
        )
      );

      const [totalResult] = await db.select({ value: count() }).from(studioClassTable).where(where);
      const totalItems = totalResult?.value ?? 0;

      const classes = await db.query.studioClass.findMany({
        where,
        offset: (page - 1) * pageSize,
        limit: pageSize,
        orderBy: [desc(studioClassTable.startTime)],
        with: {
          room: {
            columns: { id: true, name: true, capacity: true },
          },
          classType: {
            columns: { id: true, name: true, color: true },
          },
          serviceType: {
            columns: { id: true, name: true, calendarColor: true, categoryId: true },
          },
          instructor: {
            columns: { id: true, name: true, profilePhoto: true },
          },
          studioBookings: {
            columns: { id: true },
          },
        },
      });

      const totalPages = Math.ceil(totalItems / pageSize);

      return {
        classes: classes.map((studioClass) => ({
          ...studioClass,
          _count: { studioBooking: studioClass.studioBookings.length },
        })),
        pagination: {
          currentPage: page,
          totalPages,
          pageSize,
          totalItems,
        },
      };
    }),

  /**
   * Get a single class by ID with bookings
   */
  getById: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const studioClass = await db.query.studioClass.findFirst({
        where: scopedClassWhere(ctx.orgId, ctx.locationId, eq(studioClassTable.id, input.classId)),
        with: {
          room: {
            columns: { id: true, name: true, capacity: true },
          },
          studioBookings: {
            with: {
              client: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: [desc(studioBooking.bookedAt)],
          },
        },
      });

      if (!studioClass) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      return studioClass;
    }),

  /**
   * Get upcoming classes (next 7 days)
   */
  upcoming: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return db.query.studioClass.findMany({
      where: scopedClassWhere(
        ctx.orgId,
        ctx.locationId,
        and(gte(studioClassTable.startTime, now), lte(studioClassTable.startTime, nextWeek))
      ),
      orderBy: [asc(studioClassTable.startTime)],
      limit: 10,
      with: {
        room: {
          columns: { id: true, name: true, capacity: true },
        },
      },
    });
  }),

  /**
   * Get class statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const baseWhere = scopedClassWhere(ctx.orgId, ctx.locationId);
    const upcomingWhere = scopedClassWhere(
      ctx.orgId,
      ctx.locationId,
      and(gte(studioClassTable.startTime, now), lte(studioClassTable.startTime, nextWeek))
    );
    const clientWhere = and(
      eq(client.organizationId, ctx.orgId ?? ""),
      ctx.locationId ? eq(client.locationId, ctx.locationId) : isNull(client.locationId),
      eq(client.source, "mindbody")
    );

    const [totalClasses, upcomingClasses, totalBookings, activeMembers] =
      await Promise.all([
        db.select({ value: count() }).from(studioClassTable).where(baseWhere),
        db.select({ value: count() }).from(studioClassTable).where(upcomingWhere),
        db
          .select({ value: count() })
          .from(studioBooking)
          .innerJoin(studioClassTable, eq(studioBooking.classId, studioClassTable.id))
          .where(baseWhere),
        db.select({ value: count() }).from(client).where(clientWhere),
      ]);

    return {
      totalClasses: totalClasses[0]?.value ?? 0,
      upcomingClasses: upcomingClasses[0]?.value ?? 0,
      totalBookings: totalBookings[0]?.value ?? 0,
      activeMembers: activeMembers[0]?.value ?? 0,
    };
  }),
});
