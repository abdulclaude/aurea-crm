import { z } from "zod";
import {
  protectedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/db";
import { CheckInMethod, TimeLogStatus, ActivityAction } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";

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
  description: z.string().nullable().optional(),
  descriptionMode: z.enum(["single", "structured"]).optional(),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .nullable()
    .optional(),
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
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(CRM_PAGE_SIZE),
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
  // Dual data table support
  subaccountId: z.string().optional(), // Override for "all-clients" view
  includeAllClients: z.boolean().optional(), // Flag to include all clients
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
  clockIn: baseProcedure.input(clockInSchema).mutation(async ({ input }) => {
    // Verify worker exists and is active
    const worker = await prisma.worker.findUnique({
      where: { id: input.workerId },
      select: {
        id: true,
        name: true,
        organizationId: true,
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

    if (!worker.organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Worker must belong to an organization",
      });
    }

    // Check if worker has an active time log (hasn't clocked out)
    const activeTimeLog = await prisma.timeLog.findFirst({
      where: {
        organizationId: worker.organizationId,
        workerId: input.workerId,
        endTime: null,
      },
    });

    if (activeTimeLog) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You already have an active time log. Please clock out first.",
      });
    }

    // Auto-generate title from worker info if not provided
    const title = input.title || `${worker.name} - Shift`;

    const timeLog = await prisma.timeLog.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: worker.organizationId,
        subaccountId: worker.subaccountId ?? null,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        worker: true,
        contact: true,
        deal: true,
      },
    });

    return timeLog;
  }),

  clockOut: baseProcedure.input(clockOutSchema).mutation(async ({ input }) => {
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

    // Use input hourlyRate if provided, otherwise use time log's rate, or fall back to worker's rate
    const hourlyRate = input.hourlyRate ?? timeLog.hourlyRate ?? timeLog.worker?.hourlyRate;
    const totalAmount =
      hourlyRate && input.billable !== false
        ? calculateTotalAmount(
            duration,
            Number(hourlyRate),
            input.breakDuration
          )
        : undefined;

    // Auto-approve logic: Check if time log matches a scheduled rota within tolerance
    // Default tolerance: 10% of scheduled duration or 15 minutes, whichever is greater
    const AUTO_APPROVE_TOLERANCE_PERCENT = 0.10; // 10%
    const AUTO_APPROVE_MIN_TOLERANCE_MINUTES = 15;

    let shouldAutoApprove = false;
    let matchingRota = null;

    // Find a matching rota for this worker on the same day
    if (timeLog.workerId && timeLog.organizationId) {
      const dayStart = new Date(timeLog.startTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(timeLog.startTime);
      dayEnd.setHours(23, 59, 59, 999);

      matchingRota = await prisma.rota.findFirst({
        where: {
          workerId: timeLog.workerId,
          organizationId: timeLog.organizationId,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          startTime: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        include: {
          contact: true,
          deal: true,
        },
      });

      if (matchingRota) {
        const scheduledDuration = calculateDuration(matchingRota.startTime, matchingRota.endTime);
        const toleranceMinutes = Math.max(
          scheduledDuration * AUTO_APPROVE_TOLERANCE_PERCENT,
          AUTO_APPROVE_MIN_TOLERANCE_MINUTES
        );

        // Check if actual time is within tolerance of scheduled time
        const startDiff = Math.abs(timeLog.startTime.getTime() - matchingRota.startTime.getTime()) / 60000; // minutes
        const endDiff = Math.abs(endTime.getTime() - matchingRota.endTime.getTime()) / 60000; // minutes
        const durationDiff = Math.abs(duration - scheduledDuration);

        // Auto-approve if start time, end time, and duration are all within tolerance
        if (startDiff <= toleranceMinutes && endDiff <= toleranceMinutes && durationDiff <= toleranceMinutes) {
          shouldAutoApprove = true;
        }
      }
    }

    // ==================== OVERTIME & COMPLIANCE TRACKING ====================
    const STANDARD_WEEKLY_HOURS = 40;
    const MINIMUM_BREAK_MINUTES_6H = 30; // 30 min break for 6+ hours
    const complianceFlags: string[] = [];
    let isOvertime = false;
    let overtimeHours = 0;

    // Check weekly hours for overtime
    if (timeLog.workerId) {
      const { startOfWeek, endOfWeek } = await import("date-fns");
      const weekStart = startOfWeek(timeLog.startTime, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(timeLog.startTime, { weekStartsOn: 1 });

      // Get all time logs for this worker in the same week
      const weeklyTimeLogs = await prisma.timeLog.findMany({
        where: {
          workerId: timeLog.workerId,
          startTime: { gte: weekStart, lte: weekEnd },
          status: { not: TimeLogStatus.REJECTED },
          NOT: { id: timeLog.id }, // Exclude current time log
        },
        select: {
          duration: true,
          breakDuration: true,
        },
      });

      // Calculate total weekly hours (excluding current log)
      const weeklyMinutes = weeklyTimeLogs.reduce((total, log) => {
        const billableMinutes = log.duration
          ? log.duration - (log.breakDuration || 0)
          : 0;
        return total + billableMinutes;
      }, 0);

      // Add current log's billable minutes
      const currentBillableMinutes = duration - (input.breakDuration || 0);
      const totalWeeklyMinutes = weeklyMinutes + currentBillableMinutes;
      const totalWeeklyHours = totalWeeklyMinutes / 60;

      // Check for overtime
      if (totalWeeklyHours > STANDARD_WEEKLY_HOURS) {
        isOvertime = true;
        overtimeHours = totalWeeklyHours - STANDARD_WEEKLY_HOURS;
        complianceFlags.push(
          `Overtime: ${overtimeHours.toFixed(1)}h over ${STANDARD_WEEKLY_HOURS}h weekly limit`
        );
      }
    }

    // Check break compliance
    const shiftHours = duration / 60;
    const breakMinutes = input.breakDuration || 0;

    if (shiftHours >= 6 && breakMinutes < MINIMUM_BREAK_MINUTES_6H) {
      complianceFlags.push(
        `Break violation: ${MINIMUM_BREAK_MINUTES_6H}min break required for ${shiftHours.toFixed(1)}h shift`
      );
    }

    // Fill in missing information from matching rota
    const updateData: Prisma.TimeLogUpdateInput = {
      endTime,
      duration,
      breakDuration: input.breakDuration,
      description: input.description,
      checkOutLocation: input.checkOutLocation as Prisma.InputJsonValue,
      hourlyRate: hourlyRate,
      totalAmount: totalAmount,
      billable: input.billable ?? timeLog.billable,
      status: shouldAutoApprove ? TimeLogStatus.APPROVED : TimeLogStatus.SUBMITTED,
      submittedAt: new Date(),
      isOvertime,
      overtimeHours: overtimeHours > 0 ? overtimeHours : null,
      complianceFlags:
        complianceFlags.length > 0
          ? (complianceFlags as Prisma.InputJsonValue)
          : undefined,
      ...(shouldAutoApprove && {
        approvedAt: new Date(),
        // Note: approvedBy is null for auto-approvals (system-approved)
      }),
    };

    // If we found a matching rota, use its contact and deal if time log is missing them
    if (matchingRota) {
      if (!timeLog.contactId && matchingRota.contactId) {
        updateData.contact = {
          connect: { id: matchingRota.contactId },
        };
      }
      if (!timeLog.dealId && matchingRota.dealId) {
        updateData.deal = {
          connect: { id: matchingRota.dealId },
        };
      }
      // Use rota's title if time log has generic title
      if (timeLog.title?.includes("Shift") && matchingRota.title) {
        updateData.title = matchingRota.title;
      }
      // Use rota's location if available
      if (matchingRota.location && !timeLog.checkOutLocation) {
        updateData.description = input.description
          ? `${input.description}\n\nLocation: ${matchingRota.location}`
          : `Location: ${matchingRota.location}`;
      }
    }

    const updatedTimeLog = await prisma.timeLog.update({
      where: { id: input.timeLogId },
      data: updateData,
      include: {
        contact: true,
        deal: true,
        worker: true,
      },
    });

    // If auto-approved, update the matching rota with actual times
    if (shouldAutoApprove && matchingRota) {
      await prisma.rota.update({
        where: { id: matchingRota.id },
        data: {
          status: "COMPLETED",
          actualStartTime: timeLog.startTime,
          actualEndTime: endTime,
          actualHours: duration / 60, // Convert minutes to hours
          actualValue: totalAmount,
        },
      });
    }

    return {
      ...updatedTimeLog,
      autoApproved: shouldAutoApprove,
      matchedRotaId: matchingRota?.id || null,
    };
  }),

  // Get active time log for a worker
  getActiveTimeLog: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
      })
    )
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
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const timeLog = await prisma.timeLog.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
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
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          contact: true,
          deal: true,
        },
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        subaccountId: ctx.subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "time_log",
        entityId: timeLog.id,
        entityName: timeLog.title || "Time Log",
        metadata: {
          checkInMethod: timeLog.checkInMethod,
          billable: timeLog.billable,
          status: timeLog.status,
        },
        posthogProperties: {
          check_in_method: timeLog.checkInMethod,
          billable: timeLog.billable,
          has_hourly_rate: !!timeLog.hourlyRate,
          has_deal: !!timeLog.dealId,
          currency: timeLog.currency,
        },
      });

      return timeLog;
    }),

  update: protectedProcedure
    .input(updateTimeLogSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const { id, ...data } = input;

      // First verify the time log belongs to this subaccount
      const existingLog = await prisma.timeLog.findUnique({
        where: { id },
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
        // Handle sections - convert to JSON or set to null
        sections: data.sections !== undefined
          ? (data.sections === null ? Prisma.JsonNull : (data.sections as Prisma.InputJsonValue))
          : undefined,
        // Handle description - set to null if explicitly null
        description: data.description !== undefined
          ? (data.description === null ? null : data.description)
          : undefined,
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

      // Log analytics - prepare existing data for comparison
      const existingForComparison = {
        contactId: existingLog.contactId,
        dealId: existingLog.dealId,
        title: existingLog.title,
        description: existingLog.description,
        startTime: existingLog.startTime,
        endTime: existingLog.endTime,
        breakDuration: existingLog.breakDuration,
        status: existingLog.status,
        billable: existingLog.billable,
        hourlyRate: existingLog.hourlyRate ? Number(existingLog.hourlyRate) : null,
      };
      const changes = getChangedFields(existingForComparison, data);
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        subaccountId: ctx.subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "time_log",
        entityId: timeLog.id,
        entityName: timeLog.title || "Time Log",
        changes,
        metadata: {
          fieldsChanged: changes ? Object.keys(changes) : [],
          status: timeLog.status,
        },
        posthogProperties: {
          fields_changed: changes ? Object.keys(changes) : [],
          status: timeLog.status,
          billable: timeLog.billable,
        },
      });

      return timeLog;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
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

      // Log analytics (existingLog only has subaccountId at this point)
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        subaccountId: ctx.subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        entityType: "time_log",
        entityId: input.id,
        entityName: "Time Log",
        metadata: {},
        posthogProperties: {},
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
        subaccountId = worker?.subaccountId ?? undefined;
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
            select: { activeSubaccountId: true, activeOrganizationId: true },
          });

          // Use input subaccountId if provided (for "all-clients" view filter)
          subaccountId = input?.subaccountId !== undefined
            ? (input.subaccountId || undefined)
            : (sessionRecord?.activeSubaccountId ?? undefined);
        }
      }

      // Get organizationId for filtering
      let organizationId: string | undefined;
      if (!input.workerId) {
        const { auth } = await import("@/lib/auth");
        const { headers } = await import("next/headers");

        const session = await auth.api.getSession({
          headers: await headers(),
        });

        if (session?.session?.token) {
          const sessionRecord = await prisma.session.findUnique({
            where: { token: session.session.token },
            select: { activeOrganizationId: true },
          });
          organizationId = sessionRecord?.activeOrganizationId ?? undefined;
        }
      }

      if (!subaccountId && !input.includeAllClients && !organizationId) {
        return { items: [], nextCursor: null };
      }

      const where: Prisma.TimeLogWhereInput = {
        // Filter by organization for all queries
        ...(organizationId && { organizationId }),
        // Only filter by subaccount if not viewing all clients
        ...(input?.includeAllClients
          ? {}
          : subaccountId !== undefined
            ? { subaccountId }
            : {}
        ),
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
            {
              worker: { name: { contains: input.search, mode: "insensitive" } },
            },
            {
              contact: {
                name: { contains: input.search, mode: "insensitive" },
              },
            },
            { deal: { name: { contains: input.search, mode: "insensitive" } } },
          ],
        });
      }

      // Combine all conditions
      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      // Get total count for pagination
      const totalItems = await prisma.timeLog.count({ where });

      let items = await prisma.timeLog.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
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

      const totalPages = Math.ceil(totalItems / input.pageSize);

      return {
        items,
        pagination: {
          currentPage: input.page,
          totalPages,
          pageSize: input.pageSize,
          totalItems,
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
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
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
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
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      // Generate unique QR code
      const code = crypto.randomUUID();

      const qrCode = await prisma.qRCode.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
          name: input.name,
          code,
          dealId: input.dealId,
          location: input.location as Prisma.InputJsonValue,
          expiresAt: input.expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return qrCode;
    }),

  listQRCodes: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      return [];
    }

    const qrCodes = await prisma.qRCode.findMany({
      where: {
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
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
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      await prisma.qRCode.delete({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
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
      if (!ctx.orgId) {
        return { timeLogs: [], totalHours: 0, totalAmount: 0 };
      }

      const whereClause: Prisma.TimeLogWhereInput = {
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
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

  // Bulk assign contact to time logs
  bulkAssignContact: protectedProcedure
    .input(
      z.object({
        timeLogIds: z.array(z.string()).min(1, "At least one time log is required"),
        contactId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Verify all time logs exist and belong to this organization
      const timeLogs = await prisma.timeLog.findMany({
        where: {
          id: { in: input.timeLogIds },
          organizationId: ctx.orgId,
        },
        select: {
          id: true,
          workerId: true,
          worker: {
            select: {
              name: true,
            },
          },
        },
      });

      if (timeLogs.length !== input.timeLogIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some time logs were not found",
        });
      }

      // If assigning a contact, verify it exists
      if (input.contactId) {
        const contact = await prisma.contact.findUnique({
          where: { id: input.contactId },
          select: { id: true, name: true, organizationId: true },
        });

        if (!contact) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contact not found",
          });
        }

        if (contact.organizationId !== ctx.orgId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Contact does not belong to your organization",
          });
        }
      }

      // Update all time logs
      const result = await prisma.timeLog.updateMany({
        where: {
          id: { in: input.timeLogIds },
        },
        data: {
          contactId: input.contactId,
        },
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? undefined,
        userId: ctx.auth.user.id,
        type: "TIME_LOG",
        action: ActivityAction.UPDATED,
        entityType: "time_log",
        entityId: input.timeLogIds[0] || "",
        entityName: `Bulk assigned contact to ${result.count} time log(s)`,
      });

      return {
        success: true,
        updatedCount: result.count,
      };
    }),

  // Bulk approve time logs
  bulkApprove: protectedProcedure
    .input(
      z.object({
        timeLogIds: z.array(z.string()).min(1, "At least one time log is required"),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Verify all time logs exist and belong to this organization
      const timeLogs = await prisma.timeLog.findMany({
        where: {
          id: { in: input.timeLogIds },
          organizationId: ctx.orgId,
          status: TimeLogStatus.SUBMITTED, // Only submitted logs can be approved/rejected
        },
        select: {
          id: true,
          subaccountId: true,
        },
      });

      if (timeLogs.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No submitted time logs found to process",
        });
      }

      // Filter to only process logs in the current subaccount context if one is set
      const eligibleLogIds = ctx.subaccountId
        ? timeLogs.filter((log) => log.subaccountId === ctx.subaccountId).map((log) => log.id)
        : timeLogs.map((log) => log.id);

      if (eligibleLogIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No time logs in current subaccount context",
        });
      }

      const result = await prisma.timeLog.updateMany({
        where: {
          id: { in: eligibleLogIds },
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
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? undefined,
        userId: ctx.auth.user.id,
        type: "TIME_LOG",
        action: ActivityAction.UPDATED,
        entityType: "time_log",
        entityId: eligibleLogIds[0] || "",
        entityName: `Bulk ${input.approved ? "approved" : "rejected"} ${result.count} time log(s)`,
      });

      return {
        success: true,
        updatedCount: result.count,
        action: input.approved ? "approved" : "rejected",
      };
    }),

  // Check which time logs can be auto-approved based on matching rotas
  checkAutoApprovalEligibility: protectedProcedure
    .input(
      z.object({
        timeLogIds: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        return { eligible: [], ineligible: [] };
      }

      const AUTO_APPROVE_TOLERANCE_PERCENT = 0.10;
      const AUTO_APPROVE_MIN_TOLERANCE_MINUTES = 15;

      const timeLogs = await prisma.timeLog.findMany({
        where: {
          id: { in: input.timeLogIds },
          organizationId: ctx.orgId,
          status: TimeLogStatus.SUBMITTED,
        },
        include: {
          worker: true,
        },
      });

      const eligible: string[] = [];
      const ineligible: { id: string; reason: string }[] = [];

      for (const log of timeLogs) {
        if (!log.workerId || !log.endTime) {
          ineligible.push({ id: log.id, reason: "Missing worker or end time" });
          continue;
        }

        const dayStart = new Date(log.startTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(log.startTime);
        dayEnd.setHours(23, 59, 59, 999);

        const matchingRota = await prisma.rota.findFirst({
          where: {
            workerId: log.workerId,
            organizationId: log.organizationId,
            status: { in: ["SCHEDULED", "CONFIRMED"] },
            startTime: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        });

        if (!matchingRota) {
          ineligible.push({ id: log.id, reason: "No matching rota found" });
          continue;
        }

        const scheduledDuration = calculateDuration(matchingRota.startTime, matchingRota.endTime);
        const actualDuration = log.duration || 0;
        const toleranceMinutes = Math.max(
          scheduledDuration * AUTO_APPROVE_TOLERANCE_PERCENT,
          AUTO_APPROVE_MIN_TOLERANCE_MINUTES
        );

        const startDiff = Math.abs(log.startTime.getTime() - matchingRota.startTime.getTime()) / 60000;
        const endDiff = Math.abs(log.endTime.getTime() - matchingRota.endTime.getTime()) / 60000;
        const durationDiff = Math.abs(actualDuration - scheduledDuration);

        if (startDiff <= toleranceMinutes && endDiff <= toleranceMinutes && durationDiff <= toleranceMinutes) {
          eligible.push(log.id);
        } else {
          const reasons: string[] = [];
          if (startDiff > toleranceMinutes) reasons.push(`Start time off by ${Math.round(startDiff)} min`);
          if (endDiff > toleranceMinutes) reasons.push(`End time off by ${Math.round(endDiff)} min`);
          if (durationDiff > toleranceMinutes) reasons.push(`Duration off by ${Math.round(durationDiff)} min`);
          ineligible.push({ id: log.id, reason: reasons.join(", ") });
        }
      }

      return { eligible, ineligible };
    }),
});
