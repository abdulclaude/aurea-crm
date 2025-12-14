import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/db";
import type { Prisma } from "@prisma/client";

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
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, startDate, endDate, instructorName } = input;

      // Build where clause - filter by organization and optionally by subaccount
      const where: any = {
        organizationId: ctx.orgId,
        ...(ctx.subaccountId ? { subaccountId: ctx.subaccountId } : {}),
      };

      // Add search filter
      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
        ];
      }

      // Add date filters
      if (startDate || endDate) {
        where.startTime = {};
        if (startDate) {
          where.startTime.gte = new Date(startDate);
        }
        if (endDate) {
          where.startTime.lte = new Date(endDate);
        }
      }

      // Add instructor filter
      if (instructorName) {
        where.instructorName = {
          contains: instructorName,
          mode: "insensitive",
        };
      }

      // Get total count for pagination
      const totalItems = await prisma.studioClass.count({ where });

      // Get paginated data
      const classes = await prisma.studioClass.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          startTime: "asc",
        },
        include: {
          _count: {
            select: {
              studioBooking: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(totalItems / pageSize);

      return {
        classes,
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
      const whereClause = (ctx.subaccountId
        ? {
            id: input.classId,
            organizationId: ctx.orgId,
            subaccountId: ctx.subaccountId,
          }
        : {
            id: input.classId,
            organizationId: ctx.orgId,
            subaccountId: null,
          }) as Prisma.StudioClassWhereInput;

      const studioClass = await prisma.studioClass.findFirst({
        where: whereClause,
        include: {
          studioBooking: {
            include: {
              contact: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              bookedAt: "desc",
            },
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

    const whereClause = (ctx.subaccountId
      ? {
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId,
          startTime: {
            gte: now,
            lte: nextWeek,
          },
        }
      : {
          organizationId: ctx.orgId,
          subaccountId: null,
          startTime: {
            gte: now,
            lte: nextWeek,
          },
        }) as Prisma.StudioClassWhereInput;

    return prisma.studioClass.findMany({
      where: whereClause,
      orderBy: {
        startTime: "asc",
      },
      take: 10,
    });
  }),

  /**
   * Get class statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const baseWhere = (ctx.subaccountId
      ? { organizationId: ctx.orgId, subaccountId: ctx.subaccountId }
      : { organizationId: ctx.orgId, subaccountId: null }) as Prisma.StudioClassWhereInput;

    const upcomingWhere = (ctx.subaccountId
      ? {
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId,
          startTime: {
            gte: now,
            lte: nextWeek,
          },
        }
      : {
          organizationId: ctx.orgId,
          subaccountId: null,
          startTime: {
            gte: now,
            lte: nextWeek,
          },
        }) as Prisma.StudioClassWhereInput;

    const bookingWhere = (ctx.subaccountId
      ? {
          studioClass: {
            organizationId: ctx.orgId,
            subaccountId: ctx.subaccountId,
          },
        }
      : {
          studioClass: {
            organizationId: ctx.orgId,
            subaccountId: null,
          },
        }) as Prisma.StudioBookingWhereInput;

    const contactWhere = (ctx.subaccountId
      ? {
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId,
          source: "mindbody",
        }
      : {
          organizationId: ctx.orgId,
          subaccountId: null,
          source: "mindbody",
        }) as Prisma.ContactWhereInput;

    const [totalClasses, upcomingClasses, totalBookings, activeMembers] =
      await Promise.all([
        prisma.studioClass.count({
          where: baseWhere,
        }),
        prisma.studioClass.count({
          where: upcomingWhere,
        }),
        prisma.studioBooking.count({
          where: bookingWhere,
        }),
        prisma.contact.count({
          where: contactWhere,
        }),
      ]);

    return {
      totalClasses,
      upcomingClasses,
      totalBookings,
      activeMembers,
    };
  }),
});
