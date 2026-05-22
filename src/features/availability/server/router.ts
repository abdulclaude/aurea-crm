import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, desc, eq, gte, inArray, isNull, lte, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { instructor, instructorAvailability, timeOffRequest } from "@/db/schema";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { ApprovalStatus, TimeOffType } from "@/db/enums";
import { differenceInDays } from "date-fns";

// Instructor Availability Schemas
const createAvailabilitySchema = z.object({
  instructorId: z.string(),
  dayOfWeek: z.number().min(0).max(6), // 0=Sunday, 6=Saturday
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:mm format
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  notes: z.string().optional(),
  effectiveFrom: z.date().optional(),
  effectiveTo: z.date().optional(),
});

const updateAvailabilitySchema = z.object({
  availabilityId: z.string(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
  effectiveTo: z.date().optional(),
});

// Time Off Request Schemas
const createTimeOffRequestSchema = z.object({
  instructorId: z.string(),
  type: z.nativeEnum(TimeOffType),
  startDate: z.date(),
  endDate: z.date(),
  startHalfDay: z.boolean().default(false),
  endHalfDay: z.boolean().default(false),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const approveTimeOffSchema = z.object({
  requestId: z.string(),
  approve: z.boolean(),
  rejectionReason: z.string().optional(),
});

const listTimeOffSchema = z.object({
  instructorId: z.string().optional(),
  status: z.nativeEnum(ApprovalStatus).optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const availabilityRouter = createTRPCRouter({
  // ==================== Instructor Availability ====================

  /**
   * List instructor availability
   */
  listAvailability: protectedProcedure
    .input(z.object({ instructorId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const availability = await db.query.instructorAvailability.findMany({
        where: and(
          eq(instructorAvailability.instructorId, input.instructorId),
          eq(instructorAvailability.organizationId, ctx.orgId),
          eq(instructorAvailability.isActive, true)
        ),
        orderBy: [asc(instructorAvailability.dayOfWeek), asc(instructorAvailability.startTime)],
      });

      return availability;
    }),

  /**
   * Create instructor availability
   */
  createAvailability: protectedProcedure
    .input(createAvailabilitySchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      // Verify instructor exists
      const selectedInstructor = await db.query.instructor.findFirst({
        where: and(eq(instructor.id, input.instructorId), eq(instructor.organizationId, ctx.orgId)),
      });

      if (!selectedInstructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      // Validate time range
      if (input.startTime >= input.endTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      const [availability] = await db
        .insert(instructorAvailability)
        .values({
          id: createId(),
          instructorId: input.instructorId,
          organizationId: ctx.orgId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          notes: input.notes,
          effectiveFrom: input.effectiveFrom || new Date(),
          effectiveTo: input.effectiveTo,
          updatedAt: new Date(),
        })
        .returning();

      if (!availability) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create availability",
        });
      }

      return availability;
    }),

  /**
   * Update instructor availability
   */
  updateAvailability: protectedProcedure
    .input(updateAvailabilitySchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const existing = await db.query.instructorAvailability.findFirst({
        where: and(eq(instructorAvailability.id, input.availabilityId), eq(instructorAvailability.organizationId, ctx.orgId)),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Availability record not found",
        });
      }

      const { availabilityId, ...updateData } = input;

      const availabilityUpdate = { ...updateData, updatedAt: new Date() };
      const [availability] = await db
        .update(instructorAvailability)
        .set(availabilityUpdate)
        .where(eq(instructorAvailability.id, input.availabilityId))
        .returning();

      if (!availability) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update availability",
        });
      }

      return availability;
    }),

  /**
   * Delete instructor availability
   */
  deleteAvailability: protectedProcedure
    .input(z.object({ availabilityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const existing = await db.query.instructorAvailability.findFirst({
        where: and(eq(instructorAvailability.id, input.availabilityId), eq(instructorAvailability.organizationId, ctx.orgId)),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Availability record not found",
        });
      }

      await db.delete(instructorAvailability).where(eq(instructorAvailability.id, input.availabilityId));

      return { success: true };
    }),

  /**
   * Check if instructor is available at a specific time
   */
  checkAvailability: protectedProcedure
    .input(
      z.object({
        instructorId: z.string(),
        date: z.date(),
        startTime: z.string(),
        endTime: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const dayOfWeek = input.date.getDay();

      // Check recurring availability
      const availability = await db.query.instructorAvailability.findFirst({
        where: and(
          eq(instructorAvailability.instructorId, input.instructorId),
          eq(instructorAvailability.organizationId, ctx.orgId),
          eq(instructorAvailability.dayOfWeek, dayOfWeek),
          eq(instructorAvailability.isActive, true),
          lte(instructorAvailability.startTime, input.startTime),
          gte(instructorAvailability.endTime, input.endTime),
          lte(instructorAvailability.effectiveFrom, input.date),
          or(isNull(instructorAvailability.effectiveTo), gte(instructorAvailability.effectiveTo, input.date))
        ),
      });

      const timeOff = await db.query.timeOffRequest.findFirst({
        where: and(
          eq(timeOffRequest.instructorId, input.instructorId),
          eq(timeOffRequest.organizationId, ctx.orgId),
          eq(timeOffRequest.status, ApprovalStatus.APPROVED),
          lte(timeOffRequest.startDate, input.date),
          gte(timeOffRequest.endDate, input.date)
        ),
      });

      const isAvailable = !!availability && !timeOff;

      return {
        isAvailable,
        hasAvailability: !!availability,
        hasTimeOff: !!timeOff,
        availability,
        timeOff,
      };
    }),

  // ==================== Time Off Requests ====================

  /**
   * List time off requests
   */
  listTimeOff: protectedProcedure
    .input(listTimeOffSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const cursorItem = input.cursor
        ? await db.query.timeOffRequest.findFirst({
            where: eq(timeOffRequest.id, input.cursor),
            columns: { requestedAt: true },
          })
        : null;

      const items = await db.query.timeOffRequest.findMany({
        where: and(
          eq(timeOffRequest.organizationId, ctx.orgId),
          input.instructorId ? eq(timeOffRequest.instructorId, input.instructorId) : undefined,
          input.status ? eq(timeOffRequest.status, input.status) : undefined,
          cursorItem ? lt(timeOffRequest.requestedAt, cursorItem.requestedAt) : undefined
        ),
        with: {
          instructor: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [desc(timeOffRequest.requestedAt)],
        limit: input.limit + 1,
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  /**
   * Create time off request
   */
  createTimeOff: protectedProcedure
    .input(createTimeOffRequestSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      // Verify instructor exists
      const selectedInstructor = await db.query.instructor.findFirst({
        where: and(eq(instructor.id, input.instructorId), eq(instructor.organizationId, ctx.orgId)),
      });

      if (!selectedInstructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      // Validate date range
      if (input.startDate > input.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after or equal to start date",
        });
      }

      // Calculate total days
      let totalDays = differenceInDays(input.endDate, input.startDate) + 1;

      // Adjust for half days
      if (input.startHalfDay) totalDays -= 0.5;
      if (input.endHalfDay) totalDays -= 0.5;

      const [createdRequest] = await db
        .insert(timeOffRequest)
        .values({
          id: createId(),
          instructorId: input.instructorId,
          organizationId: ctx.orgId,
          locationId: selectedInstructor.locationId,
          type: input.type,
          startDate: input.startDate,
          endDate: input.endDate,
          startHalfDay: input.startHalfDay,
          endHalfDay: input.endHalfDay,
          totalDays: String(totalDays),
          reason: input.reason,
          notes: input.notes,
          status: ApprovalStatus.PENDING,
          updatedAt: new Date(),
        })
        .returning();

      if (!createdRequest) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create time off request",
        });
      }

      const timeOffRequestWithInstructor = await db.query.timeOffRequest.findFirst({
        where: eq(timeOffRequest.id, createdRequest.id),
        with: {
          instructor: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return timeOffRequestWithInstructor ?? createdRequest;
    }),

  /**
   * Approve/reject time off request
   */
  approveTimeOff: protectedProcedure
    .input(approveTimeOffSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const existingRequest = await db.query.timeOffRequest.findFirst({
        where: and(
          eq(timeOffRequest.id, input.requestId),
          eq(timeOffRequest.organizationId, ctx.orgId),
          eq(timeOffRequest.status, ApprovalStatus.PENDING)
        ),
      });

      if (!existingRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time off request not found or already processed",
        });
      }

      const [updated] = await db
        .update(timeOffRequest)
        .set({
          status: input.approve
            ? ApprovalStatus.APPROVED
            : ApprovalStatus.REJECTED,
          ...(input.approve
            ? {
                approvedAt: new Date(),
                approvedBy: ctx.auth.user.id,
              }
            : {
                rejectedAt: new Date(),
                rejectedBy: ctx.auth.user.id,
                rejectionReason: input.rejectionReason,
              }),
          updatedAt: new Date(),
        })
        .where(eq(timeOffRequest.id, input.requestId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update time off request",
        });
      }

      const updatedRequest = await db.query.timeOffRequest.findFirst({
        where: eq(timeOffRequest.id, updated.id),
        with: {
          instructor: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedRequest ?? updated;
    }),

  /**
   * Cancel time off request (instructor cancels)
   */
  cancelTimeOff: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        cancellationReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const existingRequest = await db.query.timeOffRequest.findFirst({
        where: and(
          eq(timeOffRequest.id, input.requestId),
          eq(timeOffRequest.organizationId, ctx.orgId),
          inArray(timeOffRequest.status, [ApprovalStatus.PENDING, ApprovalStatus.APPROVED])
        ),
      });

      if (!existingRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time off request not found or cannot be cancelled",
        });
      }

      const [updated] = await db
        .update(timeOffRequest)
        .set({
          status: ApprovalStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: ctx.auth.user.id,
          cancellationReason: input.cancellationReason,
          updatedAt: new Date(),
        })
        .where(eq(timeOffRequest.id, input.requestId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel time off request",
        });
      }

      const updatedRequest = await db.query.timeOffRequest.findFirst({
        where: eq(timeOffRequest.id, updated.id),
        with: {
          instructor: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedRequest ?? updated;
    }),

  /**
   * Get instructor's time off summary
   */
  getTimeOffSummary: protectedProcedure
    .input(
      z.object({
        instructorId: z.string(),
        year: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const year = input.year || new Date().getFullYear();
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);

      const timeOffRequests = await db.query.timeOffRequest.findMany({
        where: and(
          eq(timeOffRequest.instructorId, input.instructorId),
          eq(timeOffRequest.organizationId, ctx.orgId),
          eq(timeOffRequest.status, ApprovalStatus.APPROVED),
          gte(timeOffRequest.startDate, yearStart),
          lte(timeOffRequest.endDate, yearEnd)
        ),
      });

      // Calculate totals by type
      const summary = timeOffRequests.reduce(
        (acc, request) => {
          const type = request.type;
          const days = Number(request.totalDays);

          if (!acc[type]) {
            acc[type] = 0;
          }
          acc[type] += days;
          acc.total += days;

          return acc;
        },
        { total: 0 } as Record<string, number>
      );

      return {
        year,
        summary,
        requests: timeOffRequests,
      };
    }),
});
