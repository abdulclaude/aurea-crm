import { z } from "zod";
import {
  protectedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import {
  timeLog,
  instructor,
  client,
  rota,
  qrCode,
  session as sessionTable,
} from "@/db/schema";
import { CheckInMethod, TimeLogStatus, ActivityAction } from "@/db/enums";
import {
  eq,
  and,
  or,
  gte,
  lte,
  ne,
  isNull,
  inArray,
  sql,
  count,
  desc,
  asc,
  ilike,
  type SQL,
} from "drizzle-orm";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { resolveStaffRuntimeSnapshot } from "@/features/staff-settings/server/runtime-resolver";
import {
  breakComplianceMessage,
  calculateAmount,
  preserveStaffRuntimeSnapshot,
  readStaffRuntimeSnapshot,
  roundDurationMinutes,
  stripStaffRuntimeSnapshot,
  withStaffRuntimeSnapshot,
} from "@/features/staff-settings/server/runtime-snapshot";

const CRM_PAGE_SIZE = 20;

// ============================================================================
// Input Schemas
// ============================================================================

const createTimeLogSchema = z.object({
  clientId: z.string().optional(),
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
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const clockInSchema = z.object({
  instructorId: z.string(), // Required - instructor ID for portal
  clientId: z.string().optional(), // Legacy: for backward compatibility
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
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const clockOutSchema = z.object({
  instructorId: z.string(), // Required for instructor procedure
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
  clientId: z.string().optional(),
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
  customFields: z.record(z.string(), z.unknown()).optional(),
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
  instructors: z.array(z.string()).optional(),
  deals: z.array(z.string()).optional(),
  statuses: z.array(z.nativeEnum(TimeLogStatus)).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  durationMin: z.number().optional(),
  durationMax: z.number().optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  // Legacy fields for backward compatibility
  clientId: z.string().optional(),
  instructorId: z.string().optional(),
  dealId: z.string().optional(),
  status: z.nativeEnum(TimeLogStatus).optional(),
  // Dual data table support
  locationId: z.string().optional(), // Override for "all-clients" view
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
    // Verify instructor exists and is active
    const foundInstructor = await db.query.instructor.findFirst({
      where: (t, { eq }) => eq(t.id, input.instructorId),
      columns: {
        id: true,
        name: true,
        organizationId: true,
        locationId: true,
        isActive: true,
        hourlyRate: true,
        currency: true,
      },
    });

    if (!foundInstructor) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Instructor not found",
      });
    }

    if (!foundInstructor.isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Instructor account is inactive",
      });
    }

    if (!foundInstructor.organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Instructor must belong to an organization",
      });
    }

    // Check if instructor has an active time log (hasn't clocked out)
    const activeTimeLog = await db.query.timeLog.findFirst({
      where: (t, { eq, and, isNull }) =>
        and(
          eq(t.organizationId, foundInstructor.organizationId),
          eq(t.instructorId, input.instructorId),
          isNull(t.endTime)
        ),
    });

    if (activeTimeLog) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You already have an active time log. Please clock out first.",
      });
    }

    // Auto-generate title from instructor info if not provided
    const title = input.title || `${foundInstructor.name} - Shift`;

    const now = new Date();
    const runtimeSnapshot = await resolveStaffRuntimeSnapshot({
      organizationId: foundInstructor.organizationId,
      locationId: foundInstructor.locationId ?? null,
      instructorId: foundInstructor.id,
      effectiveAt: now,
      legacyHourlyRate: foundInstructor.hourlyRate,
      legacyCurrency: foundInstructor.currency,
    });
    const [created] = await db
      .insert(timeLog)
      .values({
        id: crypto.randomUUID(),
        organizationId: foundInstructor.organizationId,
        locationId: foundInstructor.locationId ?? null,
        instructorId: input.instructorId,
        dealId: input.dealId ?? null,
        title,
        startTime: now,
        checkInMethod: input.checkInMethod,
        checkInLocation: input.checkInLocation ?? null,
        qrCodeId: input.qrCodeId ?? null,
        customFields: withStaffRuntimeSnapshot(
          input.customFields,
          runtimeSnapshot,
        ),
        status: TimeLogStatus.DRAFT,
        hourlyRate: runtimeSnapshot.compensation.hourlyRate,
        currency: runtimeSnapshot.compensation.currency,
        billable: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Fetch with relations
    const createdTimeLog = await db.query.timeLog.findFirst({
      where: (t, { eq }) => eq(t.id, created!.id),
      with: {
        instructor: true,
        client: true,
        deal: true,
      },
    });

    return createdTimeLog;
  }),

  clockOut: baseProcedure.input(clockOutSchema).mutation(async ({ input }) => {
    if (input.hourlyRate !== undefined) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Pay-rate overrides are not allowed from the public time clock.",
      });
    }
    // Verify instructor exists and is active
    const foundInstructor = await db.query.instructor.findFirst({
      where: (t, { eq }) => eq(t.id, input.instructorId),
      columns: { isActive: true },
    });

    if (!foundInstructor) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Instructor not found",
      });
    }

    if (!foundInstructor.isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Instructor account is inactive",
      });
    }

    // Verify the time log belongs to this instructor
    const existingTimeLog = await db.query.timeLog.findFirst({
      where: (t, { eq }) => eq(t.id, input.timeLogId),
      with: {
        instructor: true,
      },
    });

    if (!existingTimeLog) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Time log not found",
      });
    }

    if (existingTimeLog.instructorId !== input.instructorId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This time log does not belong to you",
      });
    }

    if (existingTimeLog.endTime) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This time log has already been clocked out",
      });
    }

    const endTime = new Date();
    const runtimeSnapshot =
      readStaffRuntimeSnapshot(existingTimeLog.customFields) ??
      (await resolveStaffRuntimeSnapshot({
        organizationId: existingTimeLog.organizationId,
        locationId: existingTimeLog.locationId,
        instructorId: input.instructorId,
        effectiveAt: existingTimeLog.startTime,
        legacyHourlyRate: existingTimeLog.hourlyRate,
        legacyCurrency: existingTimeLog.currency,
      }));
    const rawDuration = calculateDuration(existingTimeLog.startTime, endTime);
    const duration = roundDurationMinutes(
      rawDuration,
      runtimeSnapshot.operationsPolicy.values.timeClockRoundingMinutes,
    );
    const breakDuration = input.breakDuration ?? 0;
    const hourlyRate = runtimeSnapshot.compensation.hourlyRate;
    const billable = input.billable ?? existingTimeLog.billable;
    const totalAmount = billable
      ? calculateAmount(duration, breakDuration, hourlyRate)
      : null;
    const shouldAutoApprove =
      runtimeSnapshot.operationsPolicy.values.timeEntryApprovalMode ===
      "AUTO_APPROVE";

    let matchingRota = null;

    // Find a matching rota for this instructor on the same day
    if (existingTimeLog.instructorId && existingTimeLog.organizationId) {
      const dayStart = new Date(existingTimeLog.startTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(existingTimeLog.startTime);
      dayEnd.setHours(23, 59, 59, 999);

      matchingRota = await db.query.rota.findFirst({
        where: (t, { eq, and, gte: gte_, lte: lte_, inArray: inArr }) =>
          and(
            eq(t.instructorId, existingTimeLog.instructorId!),
            eq(t.organizationId, existingTimeLog.organizationId),
            inArr(t.status, ["SCHEDULED", "CONFIRMED"]),
            gte_(t.startTime, dayStart),
            lte_(t.startTime, dayEnd)
          ),
        with: {
          client: true,
          deal: true,
        },
      });

    }

    // ==================== OVERTIME & COMPLIANCE TRACKING ====================
    const STANDARD_WEEKLY_HOURS = 40;
    const complianceFlags: string[] = [];
    let isOvertime = false;
    let overtimeHours = 0;

    // Check weekly hours for overtime
    if (existingTimeLog.instructorId) {
      const { startOfWeek, endOfWeek } = await import("date-fns");
      const weekStart = startOfWeek(existingTimeLog.startTime, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(existingTimeLog.startTime, { weekStartsOn: 1 });

      // Get all time logs for this instructor in the same week
      const weeklyTimeLogs = await db.query.timeLog.findMany({
        where: (t, { eq, and, gte: gte_, lte: lte_, ne: ne_ }) =>
          and(
            eq(t.instructorId, existingTimeLog.instructorId!),
            gte_(t.startTime, weekStart),
            lte_(t.startTime, weekEnd),
            ne_(t.status, TimeLogStatus.REJECTED),
            ne_(t.id, existingTimeLog.id)
          ),
        columns: {
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
      const currentBillableMinutes = duration - breakDuration;
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
    const breakViolation = breakComplianceMessage({
      durationMinutes: duration,
      breakMinutes: breakDuration,
      policy: runtimeSnapshot.operationsPolicy,
    });
    if (breakViolation) {
      complianceFlags.push(breakViolation);
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      endTime,
      duration,
      breakDuration,
      description: input.description ?? null,
      checkOutLocation: input.checkOutLocation ?? null,
      hourlyRate,
      totalAmount,
      billable,
      status: shouldAutoApprove ? TimeLogStatus.APPROVED : TimeLogStatus.SUBMITTED,
      submittedAt: new Date(),
      isOvertime,
      overtimeHours: overtimeHours > 0 ? String(overtimeHours) : null,
      customFields: withStaffRuntimeSnapshot(
        existingTimeLog.customFields,
        runtimeSnapshot,
      ),
      updatedAt: new Date(),
    };

    if (complianceFlags.length > 0) {
      updateData.complianceFlags = complianceFlags;
    }

    if (shouldAutoApprove) {
      updateData.approvedAt = new Date();
      // Note: approvedBy is null for auto-approvals (system-approved)
    }

    // If we found a matching rota, use its client and deal if time log is missing them
    if (matchingRota) {
      if (!existingTimeLog.clientId && matchingRota.clientId) {
        updateData.clientId = matchingRota.clientId;
      }
      if (!existingTimeLog.dealId && matchingRota.dealId) {
        updateData.dealId = matchingRota.dealId;
      }
      // Use rota's title if time log has generic title
      if (existingTimeLog.title?.includes("Shift") && matchingRota.title) {
        updateData.title = matchingRota.title;
      }
      // Use rota's location if available
      if (matchingRota.location && !existingTimeLog.checkOutLocation) {
        updateData.description = input.description
          ? `${input.description}\n\nLocation: ${matchingRota.location}`
          : `Location: ${matchingRota.location}`;
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(timeLog)
        .set(updateData)
        .where(eq(timeLog.id, input.timeLogId));

      if (shouldAutoApprove && matchingRota) {
        await tx
          .update(rota)
          .set({
            status: "COMPLETED",
            actualStartTime: existingTimeLog.startTime,
            actualEndTime: endTime,
            actualHours: String(duration / 60),
            actualValue: totalAmount,
          })
          .where(eq(rota.id, matchingRota.id));
      }
    });

    const updatedTimeLog = await db.query.timeLog.findFirst({
      where: (t, { eq }) => eq(t.id, input.timeLogId),
      with: {
        client: true,
        deal: true,
        instructor: true,
      },
    });

    return {
      ...updatedTimeLog!,
      autoApproved: shouldAutoApprove,
      matchedRotaId: matchingRota?.id || null,
    };
  }),

  // Get active time log for a instructor
  getActiveTimeLog: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Verify instructor exists and is active
      const foundInstructor = await db.query.instructor.findFirst({
        where: (t, { eq }) => eq(t.id, input.instructorId),
        columns: { isActive: true },
      });

      if (!foundInstructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      if (!foundInstructor.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Instructor account is inactive",
        });
      }

      const activeTimeLog = await db.query.timeLog.findFirst({
        where: (t, { eq, and, isNull }) =>
          and(isNull(t.endTime), eq(t.instructorId, input.instructorId)),
        with: {
          client: true,
          deal: true,
          instructor: true,
        },
      });

      return activeTimeLog ?? null;
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

      const now = new Date();
      const [created] = await db
        .insert(timeLog)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          clientId: input.clientId ?? null,
          dealId: input.dealId ?? null,
          title: input.title ?? null,
          description: input.description ?? null,
          startTime: now,
          checkInMethod: input.checkInMethod,
          checkInLocation: input.checkInLocation ?? null,
          qrCodeId: input.qrCodeId ?? null,
          billable: input.billable,
          hourlyRate: input.hourlyRate != null ? String(input.hourlyRate) : null,
          currency: input.currency,
          breakDuration: input.breakDuration ?? null,
          customFields:
            input.customFields === undefined
              ? null
              : stripStaffRuntimeSnapshot(input.customFields),
          status: TimeLogStatus.DRAFT,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Fetch with relations
      const createdTimeLog = await db.query.timeLog.findFirst({
        where: (t, { eq }) => eq(t.id, created!.id),
        with: {
          client: true,
          deal: true,
        },
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "time_log",
        entityId: created!.id,
        entityName: created!.title || "Time Log",
        metadata: {
          checkInMethod: created!.checkInMethod,
          billable: created!.billable,
          status: created!.status,
        },
        posthogProperties: {
          check_in_method: created!.checkInMethod,
          billable: created!.billable,
          has_hourly_rate: !!created!.hourlyRate,
          has_deal: !!created!.dealId,
          currency: created!.currency,
        },
      });

      return createdTimeLog;
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

      // First verify the time log belongs to this location
      const existingLog = await db.query.timeLog.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!existingLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (existingLog.locationId !== ctx.locationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This time log does not belong to your location",
        });
      }

      // Build update object
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (data.clientId !== undefined) updates.clientId = data.clientId;
      if (data.dealId !== undefined) updates.dealId = data.dealId;
      if (data.title !== undefined) updates.title = data.title;
      if (data.status !== undefined) updates.status = data.status;
      if (data.billable !== undefined) updates.billable = data.billable;
      if (data.startTime !== undefined) updates.startTime = data.startTime;
      if (data.endTime !== undefined) updates.endTime = data.endTime;
      if (data.breakDuration !== undefined) updates.breakDuration = data.breakDuration;
      if (data.hourlyRate !== undefined) updates.hourlyRate = data.hourlyRate != null ? String(data.hourlyRate) : null;
      if (data.customFields !== undefined) {
        updates.customFields = preserveStaffRuntimeSnapshot(
          existingLog.customFields,
          data.customFields,
        );
      }
      if (data.descriptionMode !== undefined) updates.descriptionMode = data.descriptionMode;

      // Handle description - set to null if explicitly null
      if (data.description !== undefined) {
        updates.description = data.description === null ? null : data.description;
      }

      // Handle sections - convert to JSON or set to null
      if (data.sections !== undefined) {
        updates.sections = data.sections === null ? null : data.sections;
      }

      // Recalculate duration and total if times changed
      if (data.startTime && data.endTime) {
        const duration = calculateDuration(data.startTime, data.endTime);
        updates.duration = duration;

        if (data.hourlyRate && data.billable !== false) {
          updates.totalAmount = String(
            calculateTotalAmount(duration, data.hourlyRate, data.breakDuration)
          );
        }
      }

      await db.update(timeLog).set(updates).where(eq(timeLog.id, id));

      // Fetch updated with relations
      const updatedTimeLog = await db.query.timeLog.findFirst({
        where: (t, { eq }) => eq(t.id, id),
        with: {
          client: true,
          deal: true,
        },
      });

      if (!updatedTimeLog) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch updated time log",
        });
      }

      // Log analytics - prepare existing data for comparison
      const existingForComparison = {
        clientId: existingLog.clientId,
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
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "time_log",
        entityId: id,
        entityName: updatedTimeLog.title || "Time Log",
        changes,
        metadata: {
          fieldsChanged: changes ? Object.keys(changes) : [],
          status: updatedTimeLog.status,
        },
        posthogProperties: {
          fields_changed: changes ? Object.keys(changes) : [],
          status: updatedTimeLog.status,
          billable: updatedTimeLog.billable,
        },
      });

      return updatedTimeLog;
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

      // First verify the time log belongs to this location
      const existingLog = await db.query.timeLog.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        columns: { locationId: true },
      });

      if (!existingLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (existingLog.locationId !== ctx.locationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This time log does not belong to your location",
        });
      }

      await db.delete(timeLog).where(eq(timeLog.id, input.id));

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        locationId: ctx.locationId ?? null,
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
      // Get locationId from instructor (portal) or from auth session (CRM)
      let locationId: string | undefined;

      if (input.instructorId) {
        // Instructor portal - get location from instructor
        const foundInstructor = await db.query.instructor.findFirst({
          where: (t, { eq }) => eq(t.id, input.instructorId!),
          columns: { locationId: true },
        });
        locationId = foundInstructor?.locationId ?? undefined;
      } else {
        // CRM - get location from authenticated user's session
        const { auth } = await import("@/lib/auth");
        const { headers } = await import("next/headers");

        const authSession = await auth.api.getSession({
          headers: await headers(),
        });

        if (authSession?.session?.token) {
          const sessionRecord = await db.query.session.findFirst({
            where: (t, { eq }) => eq(t.token, authSession.session.token),
            columns: { activeLocationId: true, activeOrganizationId: true },
          });

          // Use input locationId if provided (for "all-clients" view filter)
          locationId = input?.locationId !== undefined
            ? (input.locationId || undefined)
            : (sessionRecord?.activeLocationId ?? undefined);
        }
      }

      // Get organizationId for filtering
      let organizationId: string | undefined;
      if (!input.instructorId) {
        const { auth } = await import("@/lib/auth");
        const { headers } = await import("next/headers");

        const authSession = await auth.api.getSession({
          headers: await headers(),
        });

        if (authSession?.session?.token) {
          const sessionRecord = await db.query.session.findFirst({
            where: (t, { eq }) => eq(t.token, authSession.session.token),
            columns: { activeOrganizationId: true },
          });
          organizationId = sessionRecord?.activeOrganizationId ?? undefined;
        }
      }

      if (!locationId && !input.includeAllClients && !organizationId) {
        return { items: [], nextCursor: null };
      }

      // Build where conditions
      const conditions: SQL[] = [];

      // Filter by organization for all queries
      if (organizationId) {
        conditions.push(eq(timeLog.organizationId, organizationId));
      }

      // Only filter by location if not viewing all clients
      if (!input?.includeAllClients && locationId !== undefined) {
        conditions.push(eq(timeLog.locationId, locationId));
      }

      // Legacy single-value filters (backward compatibility)
      if (input.clientId) {
        conditions.push(eq(timeLog.clientId, input.clientId));
      }
      if (input.instructorId) {
        conditions.push(eq(timeLog.instructorId, input.instructorId));
      }
      if (input.dealId) {
        conditions.push(eq(timeLog.dealId, input.dealId));
      }
      if (input.status) {
        conditions.push(eq(timeLog.status, input.status));
      }

      // New multi-value filters
      if (input.instructors && input.instructors.length > 0) {
        const instructorConditions = input.instructors.flatMap((instructorId) => [
          eq(timeLog.instructorId, instructorId),
          eq(timeLog.clientId, instructorId), // Also search in legacy clientId field
        ]);
        conditions.push(or(...instructorConditions)!);
      }

      if (input.deals && input.deals.length > 0) {
        conditions.push(inArray(timeLog.dealId, input.deals));
      }

      if (input.statuses && input.statuses.length > 0) {
        conditions.push(inArray(timeLog.status, input.statuses));
      }

      // Date range filter
      if (input.startDate) {
        conditions.push(gte(timeLog.startTime, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(timeLog.startTime, input.endDate));
      }

      // Search filter
      if (input.search) {
        conditions.push(
          or(
            ilike(timeLog.title, `%${input.search}%`),
            ilike(timeLog.description, `%${input.search}%`),
            sql`EXISTS (SELECT 1 FROM "Instructor" WHERE "Instructor"."id" = ${timeLog.instructorId} AND "Instructor"."name" ILIKE ${`%${input.search}%`})`,
            sql`EXISTS (SELECT 1 FROM "Client" WHERE "Client"."id" = ${timeLog.clientId} AND "Client"."name" ILIKE ${`%${input.search}%`})`,
            sql`EXISTS (SELECT 1 FROM "Deal" WHERE "Deal"."id" = ${timeLog.dealId} AND "Deal"."name" ILIKE ${`%${input.search}%`})`,
          )!
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count for pagination
      const [countResult] = await db
        .select({ total: count() })
        .from(timeLog)
        .where(whereClause);

      const totalItems = countResult?.total ?? 0;

      let items = await db.query.timeLog.findMany({
        where: whereClause ? () => whereClause : undefined,
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize,
        orderBy: (t, { desc }) => desc(t.startTime),
        with: {
          client: true,
          instructor: true,
          deal: true,
        },
      });

      // Apply duration and amount filters in-memory
      if (input.durationMin !== undefined || input.durationMax !== undefined) {
        items = items.filter((item) => {
          const dur = item.duration ?? 0;
          if (input.durationMin !== undefined && dur < input.durationMin) {
            return false;
          }
          if (input.durationMax !== undefined && dur > input.durationMax) {
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

      const foundTimeLog = await db.query.timeLog.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        with: {
          client: true,
          deal: true,
        },
      });

      if (!foundTimeLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (foundTimeLog.locationId !== ctx.locationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This time log does not belong to your location",
        });
      }

      return foundTimeLog;
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

      // First verify the time log belongs to this location
      const existingLog = await db.query.timeLog.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        columns: { locationId: true },
      });

      if (!existingLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (existingLog.locationId !== ctx.locationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This time log does not belong to your location",
        });
      }

      const updateData = input.approved
        ? {
            status: TimeLogStatus.APPROVED as typeof TimeLogStatus.APPROVED,
            approvedAt: new Date(),
            approvedBy: ctx.auth.user.id,
            updatedAt: new Date(),
          }
        : {
            status: TimeLogStatus.REJECTED as typeof TimeLogStatus.REJECTED,
            rejectedAt: new Date(),
            rejectedBy: ctx.auth.user.id,
            rejectionReason: input.rejectionReason ?? null,
            updatedAt: new Date(),
          };

      await db
        .update(timeLog)
        .set(updateData)
        .where(eq(timeLog.id, input.id));

      const updatedTimeLog = await db.query.timeLog.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        with: {
          client: true,
          deal: true,
        },
      });

      return updatedTimeLog;
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
      const now = new Date();

      const [created] = await db
        .insert(qrCode)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          name: input.name,
          code,
          dealId: input.dealId ?? null,
          location: input.location ?? null,
          expiresAt: input.expiresAt ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return created;
    }),

  listQRCodes: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      return [];
    }

    const conditions: SQL[] = [eq(qrCode.organizationId, ctx.orgId)];

    if (ctx.locationId) {
      conditions.push(eq(qrCode.locationId, ctx.locationId));
    } else {
      conditions.push(isNull(qrCode.locationId));
    }

    const qrCodes = await db.query.qrCode.findMany({
      where: and(...conditions),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });

    return qrCodes;
  }),

  getQRCodeByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const foundQrCode = await db.query.qrCode.findFirst({
        where: (t, { eq }) => eq(t.code, input.code),
      });

      if (!foundQrCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "QR code not found",
        });
      }

      if (!foundQrCode.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This QR code has been disabled",
        });
      }

      if (foundQrCode.expiresAt && foundQrCode.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This QR code has expired",
        });
      }

      return foundQrCode;
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

      const conditions: SQL[] = [
        eq(qrCode.id, input.id),
        eq(qrCode.organizationId, ctx.orgId),
      ];

      if (ctx.locationId) {
        conditions.push(eq(qrCode.locationId, ctx.locationId));
      } else {
        conditions.push(isNull(qrCode.locationId));
      }

      await db.delete(qrCode).where(and(...conditions));

      return { success: true };
    }),

  // ========== Reports ==========
  getTimesheet: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        return { timeLogs: [], totalHours: 0, totalAmount: 0 };
      }

      const conditions: SQL[] = [
        eq(timeLog.organizationId, ctx.orgId),
        inArray(timeLog.status, [
          TimeLogStatus.SUBMITTED,
          TimeLogStatus.APPROVED,
          TimeLogStatus.INVOICED,
        ]),
      ];

      if (ctx.locationId) {
        conditions.push(eq(timeLog.locationId, ctx.locationId));
      } else {
        conditions.push(isNull(timeLog.locationId));
      }

      if (input.clientId) {
        conditions.push(eq(timeLog.clientId, input.clientId));
      }

      // Only add date filter if dates are provided
      if (input.startDate) {
        conditions.push(gte(timeLog.startTime, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(timeLog.startTime, input.endDate));
      }

      const whereClause = and(...conditions);

      const timeLogs = await db.query.timeLog.findMany({
        where: whereClause ? () => whereClause : undefined,
        with: {
          client: true,
          deal: true,
        },
        orderBy: (t, { asc }) => asc(t.startTime),
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

  // Bulk assign client to time logs
  bulkAssignClient: protectedProcedure
    .input(
      z.object({
        timeLogIds: z.array(z.string()).min(1, "At least one time log is required"),
        clientId: z.string().nullable(),
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
      const timeLogs = await db.query.timeLog.findMany({
        where: and(
          inArray(timeLog.id, input.timeLogIds),
          eq(timeLog.organizationId, ctx.orgId)
        ),
        columns: {
          id: true,
          instructorId: true,
        },
        with: {
          instructor: {
            columns: {
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

      // If assigning a client, verify it exists
      if (input.clientId) {
        const foundClient = await db.query.client.findFirst({
          where: (t, { eq }) => eq(t.id, input.clientId!),
          columns: { id: true, name: true, organizationId: true },
        });

        if (!foundClient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        if (foundClient.organizationId !== ctx.orgId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Client does not belong to your organization",
          });
        }
      }

      // Update all time logs
      await db
        .update(timeLog)
        .set({
          clientId: input.clientId,
          updatedAt: new Date(),
        })
        .where(inArray(timeLog.id, input.timeLogIds));

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
        userId: ctx.auth.user.id,
        type: "TIME_LOG",
        action: ActivityAction.UPDATED,
        entityType: "time_log",
        entityId: input.timeLogIds[0] || "",
        entityName: `Bulk assigned client to ${timeLogs.length} time log(s)`,
      });

      return {
        success: true,
        updatedCount: timeLogs.length,
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
      const timeLogs = await db.query.timeLog.findMany({
        where: and(
          inArray(timeLog.id, input.timeLogIds),
          eq(timeLog.organizationId, ctx.orgId),
          eq(timeLog.status, TimeLogStatus.SUBMITTED)
        ),
        columns: {
          id: true,
          locationId: true,
        },
      });

      if (timeLogs.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No submitted time logs found to process",
        });
      }

      // Filter to only process logs in the current location context if one is set
      const eligibleLogIds = ctx.locationId
        ? timeLogs.filter((log) => log.locationId === ctx.locationId).map((log) => log.id)
        : timeLogs.map((log) => log.id);

      if (eligibleLogIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No time logs in current location context",
        });
      }

      const updateData = input.approved
        ? {
            status: TimeLogStatus.APPROVED as typeof TimeLogStatus.APPROVED,
            approvedAt: new Date(),
            approvedBy: ctx.auth.user.id,
            updatedAt: new Date(),
          }
        : {
            status: TimeLogStatus.REJECTED as typeof TimeLogStatus.REJECTED,
            rejectedAt: new Date(),
            rejectedBy: ctx.auth.user.id,
            rejectionReason: input.rejectionReason ?? null,
            updatedAt: new Date(),
          };

      await db
        .update(timeLog)
        .set(updateData)
        .where(inArray(timeLog.id, eligibleLogIds));

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
        userId: ctx.auth.user.id,
        type: "TIME_LOG",
        action: ActivityAction.UPDATED,
        entityType: "time_log",
        entityId: eligibleLogIds[0] || "",
        entityName: `Bulk ${input.approved ? "approved" : "rejected"} ${eligibleLogIds.length} time log(s)`,
      });

      return {
        success: true,
        updatedCount: eligibleLogIds.length,
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

      const timeLogs = await db.query.timeLog.findMany({
        where: and(
          inArray(timeLog.id, input.timeLogIds),
          eq(timeLog.organizationId, ctx.orgId),
          eq(timeLog.status, TimeLogStatus.SUBMITTED)
        ),
        with: {
          instructor: true,
        },
      });

      const eligible: string[] = [];
      const ineligible: { id: string; reason: string }[] = [];

      for (const log of timeLogs) {
        if (!log.instructorId || !log.endTime) {
          ineligible.push({ id: log.id, reason: "Missing instructor or end time" });
          continue;
        }

        const dayStart = new Date(log.startTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(log.startTime);
        dayEnd.setHours(23, 59, 59, 999);

        const matchingRotaResult = await db.query.rota.findFirst({
          where: (t, { eq, and, gte: gte_, lte: lte_, inArray: inArr }) =>
            and(
              eq(t.instructorId, log.instructorId!),
              eq(t.organizationId, log.organizationId),
              inArr(t.status, ["SCHEDULED", "CONFIRMED"]),
              gte_(t.startTime, dayStart),
              lte_(t.startTime, dayEnd)
            ),
        });

        if (!matchingRotaResult) {
          ineligible.push({ id: log.id, reason: "No matching rota found" });
          continue;
        }

        const scheduledDuration = calculateDuration(matchingRotaResult.startTime, matchingRotaResult.endTime);
        const actualDuration = log.duration || 0;
        const toleranceMinutes = Math.max(
          scheduledDuration * AUTO_APPROVE_TOLERANCE_PERCENT,
          AUTO_APPROVE_MIN_TOLERANCE_MINUTES
        );

        const startDiff = Math.abs(log.startTime.getTime() - matchingRotaResult.startTime.getTime()) / 60000;
        const endDiff = Math.abs(log.endTime.getTime() - matchingRotaResult.endTime.getTime()) / 60000;
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
