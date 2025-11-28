import { z } from "zod";
import {
  protectedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/db";
import { CheckInMethod, TimeLogStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

const CRM_PAGE_SIZE = 20;

// ============================================================================
// Input Schemas
// ============================================================================

const createTimeLogSchema = z.object({
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  checkInMethod: z.nativeEnum(CheckInMethod).default(CheckInMethod.MANUAL),
  checkInLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional(),
    })
    .optional(),
  qrCodeId: z.string().optional(),
  billable: z.boolean().default(true),
  hourlyRate: z.number().optional(),
  currency: z.string().default("USD"),
  breakDuration: z.number().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

const clockInSchema = z.object({
  workerId: z.string(), // Required - worker ID for portal
  contactId: z.string().optional(), // Legacy: for backward compatibility
  dealId: z.string().optional(),
  title: z.string().optional(),
  checkInMethod: z.nativeEnum(CheckInMethod).default(CheckInMethod.MANUAL),
  checkInLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional(),
    })
    .optional(),
  qrCodeId: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

const clockOutSchema = z.object({
  workerId: z.string(), // Required for worker procedure
  timeLogId: z.string(),
  checkOutLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional(),
    })
    .optional(),
  breakDuration: z.number().optional(),
  description: z.string().optional(),
  hourlyRate: z.number().optional(),
  billable: z.boolean().optional(),
});

const updateTimeLogSchema = z.object({
  id: z.string(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  breakDuration: z.number().optional(),
  status: z.nativeEnum(TimeLogStatus).optional(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

const approveTimeLogSchema = z.object({
  id: z.string(),
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

const listTimeLogsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(CRM_PAGE_SIZE),
  search: z.string().optional(),
  workers: z.array(z.string()).optional(),
  deals: z.array(z.string()).optional(),
  statuses: z.array(z.nativeEnum(TimeLogStatus)).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  durationMin: z.number().optional(),
  durationMax: z.number().optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  // Legacy fields for backward compatibility
  contactId: z.string().optional(),
  workerId: z.string().optional(),
  dealId: z.string().optional(),
  status: z.nativeEnum(TimeLogStatus).optional(),
});

const createQRCodeSchema = z.object({
  name: z.string().min(1),
  dealId: z.string().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional(),
    })
    .optional(),
  expiresAt: z.date().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDuration(startTime: Date, endTime: Date): number {
  const diff = endTime.getTime() - startTime.getTime();
  return Math.floor(diff / 1000 / 60); // Convert to minutes
}

function calculateTotalAmount(
  duration: number,
  hourlyRate: number,
  breakDuration?: number
): number {
  const billableMinutes = breakDuration ? duration - breakDuration : duration;
  const billableHours = billableMinutes / 60;
  return billableHours * hourlyRate;
}

// ============================================================================
// Router
// ============================================================================

export const timeTrackingRouter = createTRPCRouter({
  // ========== Clock In/Out ==========
  clockIn: baseProcedure
    .input(clockInSchema)
    .mutation(async ({ input }) => {
      // Verify worker exists and is active
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
        select: {
          id: true,
          name: true,
          subaccountId: true,
          isActive: true,
          hourlyRate: true,
          currency: true,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      if (!worker.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Worker account is inactive",
        });
      }

      if (!worker.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Worker must belong to a subaccount",
        });
      }

      // Check if worker has an active time log (hasn't clocked out)
      const activeTimeLog = await prisma.timeLog.findFirst({
        where: {
          subaccountId: worker.subaccountId,
          workerId: input.workerId,
          endTime: null,
        },
      });

      if (activeTimeLog) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You already have an active time log. Please clock out first.",
        });
      }

      // Auto-generate title from worker info if not provided
      const title = input.title || `${worker.name} - Shift`;

      const timeLog = await prisma.timeLog.create({
        data: {
          subaccountId: worker.subaccountId,
          workerId: input.workerId,
          dealId: input.dealId,
          title,
          startTime: new Date(),
          checkInMethod: input.checkInMethod,
          checkInLocation: input.checkInLocation as Prisma.InputJsonValue,
          qrCodeId: input.qrCodeId,
          customFields: input.customFields as Prisma.InputJsonValue,
          status: TimeLogStatus.DRAFT,
          hourlyRate: worker.hourlyRate,
          currency: worker.currency,
          billable: true,
        },
        include: {
          worker: true,
          contact: true,
          deal: true,
        },
      });

      return timeLog;
    }),

  clockOut: baseProcedure
    .input(clockOutSchema)
    .mutation(async ({ input }) => {
      // Verify worker exists and is active
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
        select: { isActive: true },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      if (!worker.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Worker account is inactive",
        });
      }

      // Verify the time log belongs to this worker
      const timeLog = await prisma.timeLog.findUnique({
        where: {
          id: input.timeLogId,
        },
        include: {
          worker: true,
        },
      });

      if (!timeLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (timeLog.workerId !== input.workerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This time log does not belong to you",
        });
      }

      if (timeLog.endTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This time log has already been clocked out",
        });
      }

      const endTime = new Date();
      const duration = calculateDuration(timeLog.startTime, endTime);

      const hourlyRate = input.hourlyRate ?? timeLog.hourlyRate;
      const totalAmount =
        hourlyRate && input.billable !== false
          ? calculateTotalAmount(
              duration,
              Number(hourlyRate),
              input.breakDuration
            )
          : undefined;

      const updatedTimeLog = await prisma.timeLog.update({
        where: { id: input.timeLogId },
        data: {
          endTime,
          duration,
          breakDuration: input.breakDuration,
          description: input.description,
          checkOutLocation: input.checkOutLocation as Prisma.InputJsonValue,
          hourlyRate: hourlyRate,
          totalAmount: totalAmount,
          billable: input.billable ?? timeLog.billable,
          status: TimeLogStatus.SUBMITTED,
          submittedAt: new Date(),
          // Only set submittedBy if we have auth context (CRM user)
          // Workers don't have auth, so leave it null
        },
        include: {
          contact: true,
          deal: true,
        },
      });

      return updatedTimeLog;
    }),

  // Get active time log for a worker
  getActiveTimeLog: baseProcedure
    .input(z.object({
      workerId: z.string(),
    }))
    .query(async ({ input }) => {
      // Verify worker exists and is active
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
        select: { isActive: true },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      if (!worker.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Worker account is inactive",
        });
      }

      const activeTimeLog = await prisma.timeLog.findFirst({
        where: {
          endTime: null,
          workerId: input.workerId,
        },
        include: {
          contact: true,
          deal: true,
          worker: true,
        },
      });

      return activeTimeLog;
    }),

  // ========== CRUD Operations ==========
  create: protectedProcedure
    .input(createTimeLogSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in a subaccount context",
        });
      }

      const timeLog = await prisma.timeLog.create({
        data: {
          subaccountId: ctx.subaccountId,
          contactId: input.contactId,
          dealId: input.dealId,
          title: input.title,
          description: input.description,
          startTime: new Date(),
          checkInMethod: input.checkInMethod,
          checkInLocation: input.checkInLocation as Prisma.InputJsonValue,
          qrCodeId: input.qrCodeId,
          billable: input.billable,
          hourlyRate: input.hourlyRate,
          currency: input.currency,
          breakDuration: input.breakDuration,
          customFields: input.customFields as Prisma.InputJsonValue,
          status: TimeLogStatus.DRAFT,
        },
        include: {
          contact: true,
          deal: true,
        },
      });

      return timeLog;
    }),

  update: protectedProcedure
    .input(updateTimeLogSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in a subaccount context",
        });
      }

      const { id, ...data } = input;

      // First verify the time log belongs to this subaccount
      const existingLog = await prisma.timeLog.findUnique({
        where: { id },
        select: { subaccountId: true },
      });

      if (!existingLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (existingLog.subaccountId !== ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This time log does not belong to your subaccount",
        });
      }

      // Recalculate duration and total if times changed
      let updates: Prisma.TimeLogUpdateInput = {
        ...data,
        customFields: data.customFields as Prisma.InputJsonValue,
      };

      if (data.startTime && data.endTime) {
        const duration = calculateDuration(data.startTime, data.endTime);
        updates.duration = duration;

        if (data.hourlyRate && data.billable !== false) {
          updates.totalAmount = calculateTotalAmount(
            duration,
            data.hourlyRate,
            data.breakDuration
          );
        }
      }

      const timeLog = await prisma.timeLog.update({
        where: {
          id,
        },
        data: updates,
        include: {
          contact: true,
          deal: true,
        },
      });

      return timeLog;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in a subaccount context",
        });
      }

      // First verify the time log belongs to this subaccount
      const existingLog = await prisma.timeLog.findUnique({
        where: { id: input.id },
        select: { subaccountId: true },
      });

      if (!existingLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (existingLog.subaccountId !== ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This time log does not belong to your subaccount",
        });
      }

      await prisma.timeLog.delete({
        where: {
          id: input.id,
        },
      });

      return { success: true };
    }),

  list: baseProcedure
    .input(listTimeLogsSchema)
    .query(async ({ ctx, input }) => {
      // Get subaccountId from worker (portal) or from auth session (CRM)
      let subaccountId: string | undefined;

      if (input.workerId) {
        // Worker portal - get subaccount from worker
        const worker = await prisma.worker.findUnique({
          where: { id: input.workerId },
          select: { subaccountId: true },
        });
        subaccountId = worker?.subaccountId;
      } else {
        // CRM - get subaccount from authenticated user's session
        const { auth } = await import("@/lib/auth");
        const { headers } = await import("next/headers");

        const session = await auth.api.getSession({
          headers: await headers(),
        });

        if (session?.session?.token) {
          const sessionRecord = await prisma.session.findUnique({
            where: { token: session.session.token },
            select: { activeSubaccountId: true },
          });
          subaccountId = sessionRecord?.activeSubaccountId ?? undefined;
        }
      }

      if (!subaccountId) {
        return { items: [], nextCursor: null };
      }

      const where: Prisma.TimeLogWhereInput = {
        subaccountId,
      };

      const andConditions: Prisma.TimeLogWhereInput[] = [];

      // Legacy single-value filters (backward compatibility)
      if (input.contactId) {
        andConditions.push({ contactId: input.contactId });
      }
      if (input.workerId) {
        andConditions.push({ workerId: input.workerId });
      }
      if (input.dealId) {
        andConditions.push({ dealId: input.dealId });
      }
      if (input.status) {
        andConditions.push({ status: input.status });
      }

      // New multi-value filters
      if (input.workers && input.workers.length > 0) {
        andConditions.push({
          OR: input.workers.flatMap((workerId) => [
            { workerId },
            { contactId: workerId }, // Also search in legacy contactId field
          ]),
        });
      }

      if (input.deals && input.deals.length > 0) {
        andConditions.push({ dealId: { in: input.deals } });
      }

      if (input.statuses && input.statuses.length > 0) {
        andConditions.push({ status: { in: input.statuses } });
      }

      // Date range filter
      if (input.startDate || input.endDate) {
        andConditions.push({
          startTime: {
            ...(input.startDate && { gte: input.startDate }),
            ...(input.endDate && { lte: input.endDate }),
          },
        });
      }

      // Search filter
      if (input.search) {
        andConditions.push({
          OR: [
            { title: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
            { worker: { name: { contains: input.search, mode: "insensitive" } } },
            { contact: { name: { contains: input.search, mode: "insensitive" } } },
            { deal: { name: { contains: input.search, mode: "insensitive" } } },
          ],
        });
      }

      // Combine all conditions
      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      let items = await prisma.timeLog.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { startTime: "desc" },
        include: {
          contact: true,
          worker: true,
          deal: true,
        },
      });

      // Apply duration and amount filters in-memory
      if (input.durationMin !== undefined || input.durationMax !== undefined) {
        items = items.filter((item) => {
          const duration = item.duration ?? 0;
          if (input.durationMin !== undefined && duration < input.durationMin) {
            return false;
          }
          if (input.durationMax !== undefined && duration > input.durationMax) {
            return false;
          }
          return true;
        });
      }

      if (input.amountMin !== undefined || input.amountMax !== undefined) {
        items = items.filter((item) => {
          const amount = item.totalAmount ? Number(item.totalAmount) : 0;
          if (input.amountMin !== undefined && amount < input.amountMin) {
            return false;
          }
          if (input.amountMax !== undefined && amount > input.amountMax) {
            return false;
          }
          return true;
        });
      }

      let nextCursor: string | null = null;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in a subaccount context",
        });
      }

      const timeLog = await prisma.timeLog.findUnique({
        where: {
          id: input.id,
        },
        include: {
          contact: true,
          deal: true,
        },
      });

      if (!timeLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (timeLog.subaccountId !== ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This time log does not belong to your subaccount",
        });
      }

      return timeLog;
    }),

  // ========== Approval ==========
  approve: protectedProcedure
    .input(approveTimeLogSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in a subaccount context",
        });
      }

      // First verify the time log belongs to this subaccount
      const existingLog = await prisma.timeLog.findUnique({
        where: { id: input.id },
        select: { subaccountId: true },
      });

      if (!existingLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (existingLog.subaccountId !== ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This time log does not belong to your subaccount",
        });
      }

      const timeLog = await prisma.timeLog.update({
        where: {
          id: input.id,
        },
        data: input.approved
          ? {
              status: TimeLogStatus.APPROVED,
              approvedAt: new Date(),
              approvedBy: ctx.auth.user.id,
            }
          : {
              status: TimeLogStatus.REJECTED,
              rejectedAt: new Date(),
              rejectedBy: ctx.auth.user.id,
              rejectionReason: input.rejectionReason,
            },
        include: {
          contact: true,
          deal: true,
        },
      });

      return timeLog;
    }),

  // ========== QR Codes ==========
  createQRCode: protectedProcedure
    .input(createQRCodeSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in a subaccount context",
        });
      }

      // Generate unique QR code
      const code = crypto.randomUUID();

      const qrCode = await prisma.qRCode.create({
        data: {
          subaccountId: ctx.subaccountId,
          name: input.name,
          code,
          dealId: input.dealId,
          location: input.location as Prisma.InputJsonValue,
          expiresAt: input.expiresAt,
        },
      });

      return qrCode;
    }),

  listQRCodes: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.subaccountId) {
      return [];
    }

    const qrCodes = await prisma.qRCode.findMany({
      where: {
        subaccountId: ctx.subaccountId,
      },
      orderBy: { createdAt: "desc" },
    });

    return qrCodes;
  }),

  getQRCodeByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const qrCode = await prisma.qRCode.findUnique({
        where: { code: input.code },
      });

      if (!qrCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "QR code not found",
        });
      }

      if (!qrCode.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This QR code has been disabled",
        });
      }

      if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This QR code has expired",
        });
      }

      return qrCode;
    }),

  deleteQRCode: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in a subaccount context",
        });
      }

      await prisma.qRCode.delete({
        where: {
          id: input.id,
          subaccountId: ctx.subaccountId,
        },
      });

      return { success: true };
    }),

  // ========== Reports ==========
  getTimesheet: protectedProcedure
    .input(
      z.object({
        contactId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        return { timeLogs: [], totalHours: 0, totalAmount: 0 };
      }

      const whereClause: Prisma.TimeLogWhereInput = {
        subaccountId: ctx.subaccountId,
        contactId: input.contactId,
        status: {
          in: [
            TimeLogStatus.SUBMITTED,
            TimeLogStatus.APPROVED,
            TimeLogStatus.INVOICED,
          ],
        },
      };

      // Only add date filter if dates are provided
      if (input.startDate && input.endDate) {
        whereClause.startTime = {
          gte: input.startDate,
          lte: input.endDate,
        };
      }

      const timeLogs = await prisma.timeLog.findMany({
        where: whereClause,
        include: {
          contact: true,
          deal: true,
        },
        orderBy: { startTime: "asc" },
      });

      const totalMinutes = timeLogs.reduce(
        (sum, log) => sum + (log.duration ?? 0),
        0
      );
      const totalAmount = timeLogs.reduce(
        (sum, log) => sum + Number(log.totalAmount ?? 0),
        0
      );

      return {
        timeLogs,
        totalHours: totalMinutes / 60,
        totalAmount,
      };
    }),
});
