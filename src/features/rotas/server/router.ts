import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { rota, instructor, client, deal, pipeline, pipelineStage, dealClient } from "@/db/schema";
import { eq, and, or, not, notInArray, gte, lte, gt, lt } from "drizzle-orm";
import { RotaStatus } from "@/db/enums";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addHours } from "date-fns";
import crypto from "crypto";
import { generateShiftOccurrences } from "../lib/recurrence-utils";
import { generateInstructorMagicLinkToken } from "@/features/instructors/lib/magic-link-token";
import { resolveStaffRuntimeSnapshot } from "@/features/staff-settings/server/runtime-resolver";
import {
  calculateAmount,
  withStaffRuntimeSnapshot,
} from "@/features/staff-settings/server/runtime-snapshot";

// ============================================================================
// Input Schemas
// ============================================================================

const createRotaSchema = z.object({
  instructorId: z.string(),
  clientId: z.string().optional(),
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
  instructorId: z.string().optional(),
  clientId: z.string().optional(),
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
  instructorId: z.string().optional(),
  clientId: z.string().optional(),
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
// Helpers
// ============================================================================

/**
 * Build the overlap-conflict WHERE clause for a given instructor/time range.
 * Excludes cancelled rotas and optionally excludes a specific rota ID.
 */
function buildConflictWhere(
  instructorId: string,
  orgId: string,
  startTime: Date,
  endTime: Date,
  excludeRotaId?: string,
) {
  return and(
    ...(excludeRotaId ? [not(eq(rota.id, excludeRotaId))] : []),
    eq(rota.instructorId, instructorId),
    eq(rota.organizationId, orgId),
    notInArray(rota.status, [RotaStatus.CANCELLED]),
    or(
      // New shift starts during existing shift
      and(lte(rota.startTime, startTime), gt(rota.endTime, startTime)),
      // New shift ends during existing shift
      and(lt(rota.startTime, endTime), gte(rota.endTime, endTime)),
      // New shift completely contains existing shift
      and(gte(rota.startTime, startTime), lte(rota.endTime, endTime)),
    ),
  );
}

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
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active organization",
        });
      }

      // Verify instructor exists and belongs to organization
      const foundInstructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructor.id, input.instructorId),
          eq(instructor.organizationId, orgId),
          ...(locationId ? [eq(instructor.locationId, locationId)] : []),
        ),
        with: {
          location: true,
          organization: true,
        },
      });

      if (!foundInstructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const runtimeSnapshot = await resolveStaffRuntimeSnapshot({
        organizationId: orgId,
        locationId: locationId ?? null,
        instructorId: foundInstructor.id,
        effectiveAt: input.startTime,
        legacyHourlyRate: foundInstructor.hourlyRate,
        legacyCurrency: foundInstructor.currency,
      });
      const resolvedHourlyRate = runtimeSnapshot.compensation.hourlyRate;
      const resolvedCurrency = runtimeSnapshot.compensation.currency;

      // Check for scheduling conflicts - overlapping shifts for the same instructor
      const conflictingRota = await db.query.rota.findFirst({
        where: buildConflictWhere(input.instructorId, orgId, input.startTime, input.endTime),
        with: {
          client: {
            columns: { name: true },
          },
        },
      });

      if (conflictingRota) {
        const conflictStart = conflictingRota.startTime.toLocaleString();
        const conflictEnd = conflictingRota.endTime.toLocaleString();
        const clientInfo = conflictingRota.client?.name || conflictingRota.companyName || "another client";
        throw new TRPCError({
          code: "CONFLICT",
          message: `Instructor already scheduled for ${clientInfo} from ${conflictStart} to ${conflictEnd}`,
        });
      }

      // If clientId provided, auto-fill company name from client if not manually set
      let companyName = input.companyName;
      if (input.clientId && !companyName) {
        const foundClient = await db.query.client.findFirst({
          where: eq(client.id, input.clientId),
          columns: { companyName: true },
        });
        companyName = foundClient?.companyName || undefined;
      }

      // Handle deal creation if dealName provided but no dealId
      let dealId = input.dealId;
      if (!dealId && input.dealName && locationId && input.clientId && input.pipelineId && input.pipelineStageId) {
        // Verify pipeline exists and belongs to this location
        const foundPipeline = await db.query.pipeline.findFirst({
          where: and(
            eq(pipeline.id, input.pipelineId),
            eq(pipeline.organizationId, orgId),
            eq(pipeline.locationId, locationId),
          ),
          with: {
            pipelineStages: {
              where: eq(pipelineStage.id, input.pipelineStageId),
            },
          },
        });

        if (!foundPipeline) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Selected pipeline not found.",
          });
        }

        if (foundPipeline.pipelineStages.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected pipeline stage not found.",
          });
        }

        // Calculate deal value based on instructor's hourly rate and duration
        const durationMinutes = Math.floor(
          (input.endTime.getTime() - input.startTime.getTime()) / 60000,
        );
        const dealValue = calculateAmount(
          durationMinutes,
          0,
          resolvedHourlyRate,
        );

        const newDealId = crypto.randomUUID();
        await db.transaction(async (tx) => {
          await tx.insert(deal).values({
            id: newDealId,
            name: input.dealName!,
            organizationId: orgId,
            locationId,
            pipelineId: input.pipelineId!,
            pipelineStageId: input.pipelineStageId!,
            deadline: input.endTime,
            value: dealValue,
            currency: resolvedCurrency,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await tx.insert(dealClient).values({
            id: crypto.randomUUID(),
            dealId: newDealId,
            clientId: input.clientId!,
          });
        });

        dealId = newDealId;
      }

      // Calculate scheduled hours and value
      const scheduledMs = input.endTime.getTime() - input.startTime.getTime();
      const scheduledHours = scheduledMs / (1000 * 60 * 60); // Convert to hours
      const scheduledValue = calculateAmount(
        Math.floor(scheduledMs / 60000),
        0,
        resolvedHourlyRate,
      );

      const newRotaId = crypto.randomUUID();
      await db.insert(rota).values({
        id: newRotaId,
        organizationId: orgId,
        locationId: locationId || null,
        instructorId: input.instructorId,
        clientId: input.clientId || null,
        companyName,
        dealId: dealId || null,
        startTime: input.startTime,
        endTime: input.endTime,
        status: RotaStatus.SCHEDULED,
        color: input.color,
        hourlyRate: resolvedHourlyRate,
        currency: resolvedCurrency,
        scheduledHours: scheduledHours !== null ? String(scheduledHours) : null,
        scheduledValue,
        customFields: withStaffRuntimeSnapshot(null, runtimeSnapshot),
        isRecurring: input.isRecurring || false,
        recurrenceRule: input.recurrenceRule || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const createdRota = await db.query.rota.findFirst({
        where: eq(rota.id, newRotaId),
        with: {
          instructor: {
            with: {
              organization: true,
              location: true,
            },
          },
          client: true,
        },
      });

      // Note: Recurring occurrences are generated dynamically when viewing the calendar
      // This prevents database bloat and allows editing the recurrence rule

      // Send magic link if requested
      let magicLinkDelivery:
        | { status: "NOT_REQUESTED" }
        | { status: "QUEUED"; deliveryId: string }
        | { status: "FAILED"; error: string } = { status: "NOT_REQUESTED" };
      if (input.sendMagicLink && foundInstructor.email) {
        const MAGIC_LINK_EXPIRY_HOURS = 72;

        // Generate a secure token
        const { token, tokenDigest } = generateInstructorMagicLinkToken();

        // Update instructor with portal token
        await db.update(instructor)
          .set({
            portalToken: tokenDigest,
            portalTokenExpiry: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
          })
          .where(eq(instructor.id, foundInstructor.id));

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const magicLink = `${baseUrl}/instructor-signup?token=${token}&id=${foundInstructor.id}`;

        // Send email (lazy import to avoid build issues if Resend is not configured)
        try {
          const { sendMagicLinkEmail } = await import("@/features/instructors/lib/send-magic-link");
          const result = await sendMagicLinkEmail({
            organizationId: foundInstructor.organizationId,
            locationId: foundInstructor.locationId,
            instructorId: foundInstructor.id,
            tokenDigest,
            to: foundInstructor.email,
            instructorName: foundInstructor.name,
            magicLink,
            expiresAt: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
            organizationName: foundInstructor.location?.companyName || foundInstructor.organization.name,
          });

          if (!result.success) {
            magicLinkDelivery = { status: "FAILED", error: result.error };
          } else {
            magicLinkDelivery = {
              status: "QUEUED",
              deliveryId: result.deliveryId,
            };
          }
        } catch (error) {
          magicLinkDelivery = {
            status: "FAILED",
            error:
              error instanceof Error
                ? error.message
                : "Failed to queue magic link email",
          };
        }
      } else if (input.sendMagicLink && !foundInstructor.email) {
        magicLinkDelivery = {
          status: "FAILED",
          error: "Instructor does not have an email address",
        };
      }

      return createdRota
        ? { ...createdRota, magicLinkDelivery }
        : createdRota;
    }),

  /**
   * Update a rota/shift
   */
  update: protectedProcedure
    .input(updateRotaSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.hourlyRate !== undefined) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Manual pay-rate overrides require an audited reason and are not supported on rota edits.",
        });
      }
      const orgId = ctx.orgId;

      if (!orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No active organization",
        });
      }

      // Check rota exists and belongs to organization
      const existingRota = await db.query.rota.findFirst({
        where: and(
          eq(rota.id, input.id),
          eq(rota.organizationId, orgId),
        ),
      });

      if (!existingRota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rota not found",
        });
      }

      const locationId = ctx.locationId;

      // Fetch instructor to get hourly rate for deal value calculation
      const instructorId = input.instructorId || existingRota.instructorId;
      const foundInstructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructor.id, instructorId),
          eq(instructor.organizationId, orgId),
        ),
      });

      if (!foundInstructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      // Check for scheduling conflicts when time or instructor is being changed
      const newStartTime = input.startTime || existingRota.startTime;
      const newEndTime = input.endTime || existingRota.endTime;
      const newInstructorId = input.instructorId || existingRota.instructorId;

      const conflictingRota = await db.query.rota.findFirst({
        where: buildConflictWhere(newInstructorId, orgId, newStartTime, newEndTime, input.id),
        with: {
          client: {
            columns: { name: true },
          },
        },
      });

      if (conflictingRota) {
        const conflictStart = conflictingRota.startTime.toLocaleString();
        const conflictEnd = conflictingRota.endTime.toLocaleString();
        const clientInfo = conflictingRota.client?.name || conflictingRota.companyName || "another client";
        throw new TRPCError({
          code: "CONFLICT",
          message: `Instructor already scheduled for ${clientInfo} from ${conflictStart} to ${conflictEnd}`,
        });
      }

      // If clientId is being updated and companyName is not provided, auto-fill from client
      let companyName = input.companyName;
      if (input.clientId && companyName === undefined) {
        const foundClient = await db.query.client.findFirst({
          where: eq(client.id, input.clientId),
          columns: { companyName: true },
        });
        companyName = foundClient?.companyName || undefined;
      }

      // Handle deal creation if dealName provided but no dealId
      let dealId = input.dealId;
      if (!dealId && input.dealName && locationId && input.clientId && input.pipelineId && input.pipelineStageId) {
        // Verify pipeline exists and belongs to this location
        const foundPipeline = await db.query.pipeline.findFirst({
          where: and(
            eq(pipeline.id, input.pipelineId),
            eq(pipeline.organizationId, orgId),
            eq(pipeline.locationId, locationId),
          ),
          with: {
            pipelineStages: {
              where: eq(pipelineStage.id, input.pipelineStageId),
            },
          },
        });

        if (!foundPipeline) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Selected pipeline not found.",
          });
        }

        if (foundPipeline.pipelineStages.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected pipeline stage not found.",
          });
        }

        // Calculate deal value based on instructor's hourly rate and duration
        const startTime = input.startTime || existingRota.startTime;
        const endTime = input.endTime || existingRota.endTime;
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60); // Convert milliseconds to hours
        const hourlyRate = foundInstructor.hourlyRate ? Number(foundInstructor.hourlyRate) : null;
        const dealValue = hourlyRate ? durationHours * hourlyRate : null;

        const newDealId = crypto.randomUUID();
        await db.transaction(async (tx) => {
          await tx.insert(deal).values({
            id: newDealId,
            name: input.dealName!,
            organizationId: orgId,
            locationId,
            pipelineId: input.pipelineId!,
            pipelineStageId: input.pipelineStageId!,
            deadline: endTime,
            value: dealValue !== null ? String(dealValue) : null,
            currency: foundInstructor.currency || "GBP",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await tx.insert(dealClient).values({
            id: crypto.randomUUID(),
            dealId: newDealId,
            clientId: input.clientId!,
          });
        });

        dealId = newDealId;
      }

      const { id, dealName, pipelineId: _pipelineId, pipelineStageId: _pipelineStageId, ...updateData } = input;

      const setData: Record<string, unknown> = { ...updateData };
      if (companyName !== undefined) {
        setData.companyName = companyName;
      }
      if (dealId !== undefined) {
        setData.dealId = dealId;
      }

      await db.update(rota)
        .set(setData)
        .where(eq(rota.id, id));

      const updatedRota = await db.query.rota.findFirst({
        where: eq(rota.id, id),
        with: {
          instructor: true,
          client: true,
          deal: true,
        },
      });

      return updatedRota;
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

      const existingRota = await db.query.rota.findFirst({
        where: and(
          eq(rota.id, input.id),
          eq(rota.organizationId, orgId),
        ),
      });

      if (!existingRota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rota not found",
        });
      }

      await db.delete(rota).where(eq(rota.id, input.id));

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

      const foundRota = await db.query.rota.findFirst({
        where: and(
          eq(rota.id, input.id),
          eq(rota.organizationId, orgId),
        ),
        with: {
          instructor: true,
          client: true,
          deal: true,
        },
      });

      if (!foundRota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rota not found",
        });
      }

      return foundRota;
    }),

  /**
   * List rotas for calendar view
   */
  list: protectedProcedure
    .input(listRotasSchema)
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

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

      // Build filter conditions
      const conditions = [
        eq(rota.organizationId, orgId),
        ...(locationId ? [eq(rota.locationId, locationId)] : []),
        ...(input.instructorId ? [eq(rota.instructorId, input.instructorId)] : []),
        ...(input.clientId ? [eq(rota.clientId, input.clientId)] : []),
        ...(input.dealId ? [eq(rota.dealId, input.dealId)] : []),
        ...(input.status ? [eq(rota.status, input.status)] : []),
      ];

      // Add date range filter
      if (startDate && endDate) {
        conditions.push(
          or(
            // Non-recurring rotas: starts within range
            and(
              eq(rota.isRecurring, false),
              gte(rota.startTime, startDate),
              lte(rota.startTime, endDate),
            ),
            // Non-recurring rotas: ends within range
            and(
              eq(rota.isRecurring, false),
              gte(rota.endTime, startDate),
              lte(rota.endTime, endDate),
            ),
            // Non-recurring rotas: spans the entire range
            and(
              eq(rota.isRecurring, false),
              lte(rota.startTime, startDate),
              gte(rota.endTime, endDate),
            ),
            // Recurring rotas: include if start is before or during range
            and(
              eq(rota.isRecurring, true),
              lte(rota.startTime, endDate),
            ),
          )!,
        );
      }

      const rotas = await db.query.rota.findMany({
        where: and(...conditions),
        with: {
          instructor: {
            columns: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          client: {
            columns: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
          deal: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: (t, { asc }) => asc(t.startTime),
      });

      // Expand recurring rotas into virtual occurrences
      type RotaListItem = (typeof rotas)[number] & {
        isVirtual?: boolean;
        parentRotaId?: string;
      };
      const expandedRotas: RotaListItem[] = [];

      console.log(`[Rotas] Found ${rotas.length} rotas, expanding recurring ones for ${startDate} to ${endDate}`);

      for (const rotaItem of rotas) {
        if (rotaItem.isRecurring && rotaItem.recurrenceRule && startDate && endDate) {
          console.log(`[Rotas] Expanding recurring rota ${rotaItem.id} with rule: ${rotaItem.recurrenceRule}`);
          // Generate occurrences for this recurring rota within the view range
          try {
            const occurrences = generateShiftOccurrences(
              rotaItem.startTime,
              rotaItem.endTime,
              rotaItem.recurrenceRule,
              365 // Max 1 year of occurrences
            );

            console.log(`[Rotas] Generated ${occurrences.length} total occurrences for rota ${rotaItem.id}`);
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
                ...rotaItem,
                id: `${rotaItem.id}-${occurrence.startTime.getTime()}`, // Virtual ID
                startTime: occurrence.startTime,
                endTime: occurrence.endTime,
                // Mark as virtual so frontend can distinguish
                isVirtual: true,
                parentRotaId: rotaItem.id,
              });
            }
          } catch (error) {
            console.error("Failed to expand recurring rota:", rotaItem.id, error);
            // Still include the base rota if expansion fails
            expandedRotas.push(rotaItem);
          }
        } else {
          // Non-recurring rota - include as-is
          expandedRotas.push(rotaItem);
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

      const existingRota = await db.query.rota.findFirst({
        where: and(
          eq(rota.id, input.id),
          eq(rota.organizationId, orgId),
        ),
      });

      if (!existingRota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rota not found",
        });
      }

      await db.update(rota)
        .set({ status: input.status })
        .where(eq(rota.id, input.id));

      const updated = await db.query.rota.findFirst({
        where: eq(rota.id, input.id),
        with: {
          instructor: true,
          client: true,
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
        instructorId: z.string(),
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

      const conflicts = await db.query.rota.findMany({
        where: buildConflictWhere(
          input.instructorId,
          orgId,
          input.startTime,
          input.endTime,
          input.excludeRotaId,
        ),
        with: {
          instructor: {
            columns: { name: true },
          },
          client: {
            columns: { name: true },
          },
        },
        orderBy: (t, { asc }) => asc(t.startTime),
      });

      return {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts.map((rotaItem) => ({
          id: rotaItem.id,
          instructorName: rotaItem.instructor.name,
          clientName: rotaItem.client?.name || rotaItem.companyName || "Unknown",
          startTime: rotaItem.startTime,
          endTime: rotaItem.endTime,
          status: rotaItem.status,
        })),
      };
    }),
});
