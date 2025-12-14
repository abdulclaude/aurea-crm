import { z } from "zod";
import { prisma } from "@/lib/db";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { ApprovalStatus, TimeOffType } from "@prisma/client";
import { differenceInDays } from "date-fns";

// Worker Availability Schemas
const createAvailabilitySchema = z.object({
  workerId: z.string(),
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
  workerId: z.string(),
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
  workerId: z.string().optional(),
  status: z.nativeEnum(ApprovalStatus).optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const availabilityRouter = createTRPCRouter({
  // ==================== Worker Availability ====================

  /**
   * List worker availability
   */
  listAvailability: protectedProcedure
    .input(z.object({ workerId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const availability = await prisma.workerAvailability.findMany({
        where: {
          workerId: input.workerId,
          organizationId: ctx.orgId,
          isActive: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });

      return availability;
    }),

  /**
   * Create worker availability
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

      // Verify worker exists
      const worker = await prisma.worker.findFirst({
        where: {
          id: input.workerId,
          organizationId: ctx.orgId,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      // Validate time range
      if (input.startTime >= input.endTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      const availability = await prisma.workerAvailability.create({
        data: {
          workerId: input.workerId,
          organizationId: ctx.orgId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          notes: input.notes,
          effectiveFrom: input.effectiveFrom || new Date(),
          effectiveTo: input.effectiveTo,
        },
      });

      return availability;
    }),

  /**
   * Update worker availability
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

      const existing = await prisma.workerAvailability.findFirst({
        where: {
          id: input.availabilityId,
          organizationId: ctx.orgId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Availability record not found",
        });
      }

      const { availabilityId, ...updateData } = input;

      const availability = await prisma.workerAvailability.update({
        where: { id: input.availabilityId },
        data: updateData,
      });

      return availability;
    }),

  /**
   * Delete worker availability
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

      const existing = await prisma.workerAvailability.findFirst({
        where: {
          id: input.availabilityId,
          organizationId: ctx.orgId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Availability record not found",
        });
      }

      await prisma.workerAvailability.delete({
        where: { id: input.availabilityId },
      });

      return { success: true };
    }),

  /**
   * Check if worker is available at a specific time
   */
  checkAvailability: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
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
      const availability = await prisma.workerAvailability.findFirst({
        where: {
          workerId: input.workerId,
          organizationId: ctx.orgId,
          dayOfWeek,
          isActive: true,
          startTime: { lte: input.startTime },
          endTime: { gte: input.endTime },
          effectiveFrom: { lte: input.date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.date } }],
        },
      });

      // Check time off requests
      const timeOff = await prisma.timeOffRequest.findFirst({
        where: {
          workerId: input.workerId,
          organizationId: ctx.orgId,
          status: ApprovalStatus.APPROVED,
          startDate: { lte: input.date },
          endDate: { gte: input.date },
        },
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

      const where: any = {
        organizationId: ctx.orgId,
        ...(input.workerId && { workerId: input.workerId }),
        ...(input.status && { status: input.status }),
      };

      const items = await prisma.timeOffRequest.findMany({
        where,
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { requestedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
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

      // Verify worker exists
      const worker = await prisma.worker.findFirst({
        where: {
          id: input.workerId,
          organizationId: ctx.orgId,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
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

      const timeOffRequest = await prisma.timeOffRequest.create({
        data: {
          workerId: input.workerId,
          organizationId: ctx.orgId,
          subaccountId: worker.subaccountId,
          type: input.type,
          startDate: input.startDate,
          endDate: input.endDate,
          startHalfDay: input.startHalfDay,
          endHalfDay: input.endHalfDay,
          totalDays,
          reason: input.reason,
          notes: input.notes,
          status: ApprovalStatus.PENDING,
        },
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // TODO: Send notification to admin/manager

      return timeOffRequest;
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

      const timeOffRequest = await prisma.timeOffRequest.findFirst({
        where: {
          id: input.requestId,
          organizationId: ctx.orgId,
          status: ApprovalStatus.PENDING,
        },
      });

      if (!timeOffRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time off request not found or already processed",
        });
      }

      const updatedRequest = await prisma.timeOffRequest.update({
        where: { id: input.requestId },
        data: {
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
        },
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // TODO: Send notification to worker

      return updatedRequest;
    }),

  /**
   * Cancel time off request (worker cancels)
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

      const timeOffRequest = await prisma.timeOffRequest.findFirst({
        where: {
          id: input.requestId,
          organizationId: ctx.orgId,
          status: {
            in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
          },
        },
      });

      if (!timeOffRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time off request not found or cannot be cancelled",
        });
      }

      const updatedRequest = await prisma.timeOffRequest.update({
        where: { id: input.requestId },
        data: {
          status: ApprovalStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: ctx.auth.user.id,
          cancellationReason: input.cancellationReason,
        },
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedRequest;
    }),

  /**
   * Get worker's time off summary
   */
  getTimeOffSummary: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
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

      const timeOffRequests = await prisma.timeOffRequest.findMany({
        where: {
          workerId: input.workerId,
          organizationId: ctx.orgId,
          status: ApprovalStatus.APPROVED,
          startDate: { gte: yearStart },
          endDate: { lte: yearEnd },
        },
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
