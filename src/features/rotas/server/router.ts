import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/db";
import { RotaStatus } from "@prisma/client";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addHours } from "date-fns";
import crypto from "crypto";
import { generateShiftOccurrences } from "../lib/recurrence-utils";

// ============================================================================
// Input Schemas
// ============================================================================

const createRotaSchema = z.object({
  workerId: z.string(),
  contactId: z.string().optional(),
  companyName: z.string().optional(),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  dealId: z.string().optional(),
  dealName: z.string().optional(), // For creating new deal on the fly
  startTime: z.date(),
  endTime: z.date(),
  color: z.enum(["blue", "orange", "violet", "rose", "emerald"]).default("blue"),
  sendMagicLink: z.boolean().default(false),
  // Recurrence fields
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(), // RRULE string
  generateOccurrences: z.boolean().default(true), // Auto-generate occurrences on creation
});

const updateRotaSchema = z.object({
  id: z.string(),
  workerId: z.string().optional(),
  contactId: z.string().optional(),
  companyName: z.string().optional(),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  dealId: z.string().optional(),
  dealName: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  status: z.nativeEnum(RotaStatus).optional(),
  color: z.enum(["blue", "orange", "violet", "rose", "emerald"]).optional(),
  hourlyRate: z.number().optional(),
  billable: z.boolean().optional(),
  notes: z.string().optional(),
});

const deleteRotaSchema = z.object({
  id: z.string(),
});

const listRotasSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  workerId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  status: z.nativeEnum(RotaStatus).optional(),
  view: z.enum(["day", "week", "month"]).default("week"),
});

const getRotaSchema = z.object({
  id: z.string(),
});

const updateRotaStatusSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(RotaStatus),
});

// ============================================================================
// Router
// ============================================================================

export const rotasRouter = createTRPCRouter({
  /**
   * Create a new rota/shift
   */
  create: protectedProcedure
    .input(createRotaSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active organization",
        });
      }

      // Verify worker exists and belongs to organization
      const worker = await prisma.worker.findFirst({
        where: {
          id: input.workerId,
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
        include: {
          subaccount: true,
          organization: true,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      // Check for scheduling conflicts - overlapping shifts for the same worker
      const conflictingRota = await prisma.rota.findFirst({
        where: {
          workerId: input.workerId,
          organizationId: orgId,
          status: {
            notIn: [RotaStatus.CANCELLED],
          },
          OR: [
            // New shift starts during existing shift
            {
              startTime: { lte: input.startTime },
              endTime: { gt: input.startTime },
            },
            // New shift ends during existing shift
            {
              startTime: { lt: input.endTime },
              endTime: { gte: input.endTime },
            },
            // New shift completely contains existing shift
            {
              startTime: { gte: input.startTime },
              endTime: { lte: input.endTime },
            },
          ],
        },
        include: {
          contact: {
            select: { name: true },
          },
        },
      });

      if (conflictingRota) {
        const conflictStart = conflictingRota.startTime.toLocaleString();
        const conflictEnd = conflictingRota.endTime.toLocaleString();
        const clientInfo = conflictingRota.contact?.name || conflictingRota.companyName || "another client";
        throw new TRPCError({
          code: "CONFLICT",
          message: `Worker already scheduled for ${clientInfo} from ${conflictStart} to ${conflictEnd}`,
        });
      }

      // If contactId provided, auto-fill company name from contact if not manually set
      let companyName = input.companyName;
      if (input.contactId && !companyName) {
        const contact = await prisma.contact.findUnique({
          where: { id: input.contactId },
          select: { companyName: true },
        });
        companyName = contact?.companyName || undefined;
      }

      // Handle deal creation if dealName provided but no dealId
      let dealId = input.dealId;
      if (!dealId && input.dealName && subaccountId && input.contactId && input.pipelineId && input.pipelineStageId) {
        // Verify pipeline exists and belongs to this subaccount
        const pipeline = await prisma.pipeline.findFirst({
          where: {
            id: input.pipelineId,
            organizationId: orgId,
            subaccountId,
          },
          include: {
            pipelineStage: {
              where: {
                id: input.pipelineStageId,
              },
            },
          },
        });

        if (!pipeline) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Selected pipeline not found.",
          });
        }

        if (pipeline.pipelineStage.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected pipeline stage not found.",
          });
        }

        // Calculate deal value based on worker's hourly rate and duration
        const durationMs = input.endTime.getTime() - input.startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60); // Convert milliseconds to hours
        const hourlyRate = worker.hourlyRate ? Number(worker.hourlyRate) : null;
        const dealValue = hourlyRate ? durationHours * hourlyRate : null;

        const deal = await prisma.deal.create({
          data: {
            id: crypto.randomUUID(),
            name: input.dealName,
            organizationId: orgId,
            subaccountId,
            pipelineId: input.pipelineId,
            pipelineStageId: input.pipelineStageId,
            deadline: input.endTime,
            value: dealValue,
            currency: worker.currency || "GBP",
            createdAt: new Date(),
            updatedAt: new Date(),
            dealContact: {
              create: {
                id: crypto.randomUUID(),
                contactId: input.contactId,
              },
            },
          },
        });

        dealId = deal.id;
      }

      // Calculate scheduled hours and value
      const scheduledMs = input.endTime.getTime() - input.startTime.getTime();
      const scheduledHours = scheduledMs / (1000 * 60 * 60); // Convert to hours
      const hourlyRate = worker.hourlyRate ? Number(worker.hourlyRate) : null;
      const scheduledValue = hourlyRate ? scheduledHours * hourlyRate : null;

      const rota = await prisma.rota.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: orgId,
          subaccountId: subaccountId || null,
          workerId: input.workerId,
          contactId: input.contactId || null,
          companyName,
          dealId: dealId || null,
          startTime: input.startTime,
          endTime: input.endTime,
          status: RotaStatus.SCHEDULED,
          color: input.color,
          hourlyRate: worker.hourlyRate,
          scheduledHours,
          scheduledValue,
          isRecurring: input.isRecurring || false,
          recurrenceRule: input.recurrenceRule || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          worker: {
            include: {
              organization: true,
              subaccount: true,
            },
          },
          contact: true,
        },
      });

      // Note: Recurring occurrences are generated dynamically when viewing the calendar
      // This prevents database bloat and allows editing the recurrence rule

      // Send magic link if requested
      if (input.sendMagicLink && worker.email) {
        const MAGIC_LINK_EXPIRY_HOURS = 72;

        // Generate a secure token
        const token = crypto.randomBytes(32).toString("hex");

        // Update worker with portal token
        await prisma.worker.update({
          where: { id: worker.id },
          data: {
            portalToken: token,
            portalTokenExpiry: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
          },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const magicLink = `${baseUrl}/portal/${worker.id}/auth?token=${token}`;

        // Send email (lazy import to avoid build issues if Resend is not configured)
        try {
          const { sendMagicLinkEmail } = await import("@/features/workers/lib/send-magic-link");
          const result = await sendMagicLinkEmail({
            to: worker.email,
            workerName: worker.name,
            magicLink,
            expiresAt: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
            organizationName: worker.subaccount?.companyName || worker.organization.name,
          });

          if (!result.success) {
            // Don't fail the whole operation if email sending fails
            console.error("Failed to send magic link email:", result.error);
          }
        } catch (error) {
          console.error("Error sending magic link:", error);
        }
      } else if (input.sendMagicLink && !worker.email) {
        console.warn("Cannot send magic link: Worker does not have an email address");
      }

      return rota;
    }),

  /**
   * Update a rota/shift
   */
  update: protectedProcedure
    .input(updateRotaSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;

      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active organization",
        });
      }

      // Check rota exists and belongs to organization
      const existingRota = await prisma.rota.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
        },
      });

      if (!existingRota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rota not found",
        });
      }

      const subaccountId = ctx.subaccountId;

      // Fetch worker to get hourly rate for deal value calculation
      const workerId = input.workerId || existingRota.workerId;
      const worker = await prisma.worker.findFirst({
        where: {
          id: workerId,
          organizationId: orgId,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      // Check for scheduling conflicts when time or worker is being changed
      const newStartTime = input.startTime || existingRota.startTime;
      const newEndTime = input.endTime || existingRota.endTime;
      const newWorkerId = input.workerId || existingRota.workerId;

      const conflictingRota = await prisma.rota.findFirst({
        where: {
          id: { not: input.id }, // Exclude current rota
          workerId: newWorkerId,
          organizationId: orgId,
          status: {
            notIn: [RotaStatus.CANCELLED],
          },
          OR: [
            // Updated shift starts during existing shift
            {
              startTime: { lte: newStartTime },
              endTime: { gt: newStartTime },
            },
            // Updated shift ends during existing shift
            {
              startTime: { lt: newEndTime },
              endTime: { gte: newEndTime },
            },
            // Updated shift completely contains existing shift
            {
              startTime: { gte: newStartTime },
              endTime: { lte: newEndTime },
            },
          ],
        },
        include: {
          contact: {
            select: { name: true },
          },
        },
      });

      if (conflictingRota) {
        const conflictStart = conflictingRota.startTime.toLocaleString();
        const conflictEnd = conflictingRota.endTime.toLocaleString();
        const clientInfo = conflictingRota.contact?.name || conflictingRota.companyName || "another client";
        throw new TRPCError({
          code: "CONFLICT",
          message: `Worker already scheduled for ${clientInfo} from ${conflictStart} to ${conflictEnd}`,
        });
      }

      // If contactId is being updated and companyName is not provided, auto-fill from contact
      let companyName = input.companyName;
      if (input.contactId && companyName === undefined) {
        const contact = await prisma.contact.findUnique({
          where: { id: input.contactId },
          select: { companyName: true },
        });
        companyName = contact?.companyName || undefined;
      }

      // Handle deal creation if dealName provided but no dealId
      let dealId = input.dealId;
      if (!dealId && input.dealName && subaccountId && input.contactId && input.pipelineId && input.pipelineStageId) {
        // Verify pipeline exists and belongs to this subaccount
        const pipeline = await prisma.pipeline.findFirst({
          where: {
            id: input.pipelineId,
            organizationId: orgId,
            subaccountId,
          },
          include: {
            pipelineStage: {
              where: {
                id: input.pipelineStageId,
              },
            },
          },
        });

        if (!pipeline) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Selected pipeline not found.",
          });
        }

        if (pipeline.pipelineStage.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected pipeline stage not found.",
          });
        }

        // Calculate deal value based on worker's hourly rate and duration
        const startTime = input.startTime || existingRota.startTime;
        const endTime = input.endTime || existingRota.endTime;
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60); // Convert milliseconds to hours
        const hourlyRate = worker.hourlyRate ? Number(worker.hourlyRate) : null;
        const dealValue = hourlyRate ? durationHours * hourlyRate : null;

        const deal = await prisma.deal.create({
          data: {
            id: crypto.randomUUID(),
            name: input.dealName,
            organizationId: orgId,
            subaccountId,
            pipelineId: input.pipelineId,
            pipelineStageId: input.pipelineStageId,
            deadline: endTime,
            value: dealValue,
            currency: worker.currency || "GBP",
            createdAt: new Date(),
            updatedAt: new Date(),
            dealContact: {
              create: {
                id: crypto.randomUUID(),
                contactId: input.contactId,
              },
            },
          },
        });

        dealId = deal.id;
      }

      const { id, dealName, pipelineId, pipelineStageId, ...updateData } = input;

      const rota = await prisma.rota.update({
        where: { id },
        data: {
          ...updateData,
          ...(companyName !== undefined && { companyName }),
          ...(dealId !== undefined && { dealId }),
        },
        include: {
          worker: true,
          contact: true,
          deal: true,
        },
      });

      return rota;
    }),

  /**
   * Delete a rota/shift
   */
  delete: protectedProcedure
    .input(deleteRotaSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;

      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active organization",
        });
      }

      const rota = await prisma.rota.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
        },
      });

      if (!rota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rota not found",
        });
      }

      await prisma.rota.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get a single rota by ID
   */
  get: protectedProcedure
    .input(getRotaSchema)
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;

      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active organization",
        });
      }

      const rota = await prisma.rota.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
        },
        include: {
          worker: true,
          contact: true,
          deal: true,
        },
      });

      if (!rota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rota not found",
        });
      }

      return rota;
    }),

  /**
   * List rotas for calendar view
   */
  list: protectedProcedure
    .input(listRotasSchema)
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active organization",
        });
      }

      // Calculate date range based on view
      let startDate = input.startDate;
      let endDate = input.endDate;

      if (!startDate || !endDate) {
        const now = new Date();

        if (input.view === "day") {
          startDate = startOfDay(now);
          endDate = endOfDay(now);
        } else if (input.view === "week") {
          startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
          endDate = endOfWeek(now, { weekStartsOn: 1 });
        } else if (input.view === "month") {
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
        }
      }

      const rotas = await prisma.rota.findMany({
        where: {
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
          ...(input.workerId && { workerId: input.workerId }),
          ...(input.contactId && { contactId: input.contactId }),
          ...(input.dealId && { dealId: input.dealId }),
          ...(input.status && { status: input.status }),
          ...(startDate && endDate && {
            OR: [
              // Non-recurring rotas: starts within range
              {
                isRecurring: false,
                startTime: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              // Non-recurring rotas: ends within range
              {
                isRecurring: false,
                endTime: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              // Non-recurring rotas: spans the entire range
              {
                isRecurring: false,
                AND: [
                  { startTime: { lte: startDate } },
                  { endTime: { gte: endDate } },
                ],
              },
              // Recurring rotas: include if start is before or during range
              {
                isRecurring: true,
                startTime: { lte: endDate },
              },
            ],
          }),
        },
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
          deal: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
      });

      // Expand recurring rotas into virtual occurrences
      const expandedRotas: any[] = [];

      console.log(`[Rotas] Found ${rotas.length} rotas, expanding recurring ones for ${startDate} to ${endDate}`);

      for (const rota of rotas) {
        if (rota.isRecurring && rota.recurrenceRule && startDate && endDate) {
          console.log(`[Rotas] Expanding recurring rota ${rota.id} with rule: ${rota.recurrenceRule}`);
          // Generate occurrences for this recurring rota within the view range
          try {
            const occurrences = generateShiftOccurrences(
              rota.startTime,
              rota.endTime,
              rota.recurrenceRule,
              365 // Max 1 year of occurrences
            );

            console.log(`[Rotas] Generated ${occurrences.length} total occurrences for rota ${rota.id}`);
            if (occurrences.length > 0) {
              console.log(`[Rotas] First 3 occurrences:`, occurrences.slice(0, 3).map(o => o.startTime.toISOString()));
            }

            // Filter occurrences to only those within the view range
            const visibleOccurrences = occurrences.filter((occurrence) => {
              return occurrence.startTime >= startDate && occurrence.startTime <= endDate;
            });

            console.log(`[Rotas] ${visibleOccurrences.length} occurrences visible in range ${startDate.toISOString()} to ${endDate.toISOString()}`);

            // Create virtual rota objects for each occurrence
            for (const occurrence of visibleOccurrences) {
              expandedRotas.push({
                ...rota,
                id: `${rota.id}-${occurrence.startTime.getTime()}`, // Virtual ID
                startTime: occurrence.startTime,
                endTime: occurrence.endTime,
                // Mark as virtual so frontend can distinguish
                isVirtual: true,
                parentRotaId: rota.id,
              } as any);
            }
          } catch (error) {
            console.error("Failed to expand recurring rota:", rota.id, error);
            // Still include the base rota if expansion fails
            expandedRotas.push(rota as any);
          }
        } else {
          // Non-recurring rota - include as-is
          expandedRotas.push(rota as any);
        }
      }

      console.log(`[Rotas] Returning ${expandedRotas.length} total rotas (including virtual occurrences)`);

      return expandedRotas;
    }),

  /**
   * Update rota status
   */
  updateStatus: protectedProcedure
    .input(updateRotaStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;

      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active organization",
        });
      }

      const rota = await prisma.rota.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
        },
      });

      if (!rota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rota not found",
        });
      }

      const updated = await prisma.rota.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          worker: true,
          contact: true,
          deal: true,
        },
      });

      return updated;
    }),

  /**
   * Check for scheduling conflicts before creating/updating a rota
   * Returns conflicting rotas if any exist
   */
  checkConflicts: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
        startTime: z.date(),
        endTime: z.date(),
        excludeRotaId: z.string().optional(), // Exclude current rota when updating
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;

      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active organization",
        });
      }

      const conflicts = await prisma.rota.findMany({
        where: {
          ...(input.excludeRotaId && { id: { not: input.excludeRotaId } }),
          workerId: input.workerId,
          organizationId: orgId,
          status: {
            notIn: [RotaStatus.CANCELLED],
          },
          OR: [
            // Shift starts during existing shift
            {
              startTime: { lte: input.startTime },
              endTime: { gt: input.startTime },
            },
            // Shift ends during existing shift
            {
              startTime: { lt: input.endTime },
              endTime: { gte: input.endTime },
            },
            // Shift completely contains existing shift
            {
              startTime: { gte: input.startTime },
              endTime: { lte: input.endTime },
            },
          ],
        },
        include: {
          worker: {
            select: { name: true },
          },
          contact: {
            select: { name: true },
          },
        },
        orderBy: { startTime: "asc" },
      });

      return {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts.map((rota) => ({
          id: rota.id,
          workerName: rota.worker.name,
          clientName: rota.contact?.name || rota.companyName || "Unknown",
          startTime: rota.startTime,
          endTime: rota.endTime,
          status: rota.status,
        })),
      };
    }),
});
