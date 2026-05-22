import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { ShiftSwapStatus } from "@/db/enums";
import { addDays } from "date-fns";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, lt, ne, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { rota, shiftSwapRequest, instructor } from "@/db/schema";

const createSwapRequestSchema = z.object({
  rotaId: z.string(),
  targetInstructorId: z.string().optional(), // If provided, specific instructor; otherwise open to all
  reason: z.string().optional(),
  expiresInDays: z.number().default(7), // Auto-expire after 7 days
});

const respondToSwapSchema = z.object({
  swapRequestId: z.string(),
  accept: z.boolean(),
  rejectionReason: z.string().optional(),
});

const adminApprovalSchema = z.object({
  swapRequestId: z.string(),
  approve: z.boolean(),
  rejectionReason: z.string().optional(),
});

const listSwapRequestsSchema = z.object({
  status: z.nativeEnum(ShiftSwapStatus).optional(),
  instructorId: z.string().optional(), // Filter by specific instructor
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const getSwapRequestWithRelations = async ({
  id,
  organizationId,
}: {
  id: string;
  organizationId: string;
}) => {
  const swapRequest = await db.query.shiftSwapRequest.findFirst({
    where: and(eq(shiftSwapRequest.id, id), eq(shiftSwapRequest.organizationId, organizationId)),
    with: {
      rota: {
        with: {
          client: true,
          deal: true,
        },
      },
      instructor_requesterId: true,
      instructor_targetInstructorId: true,
    },
  });

  if (!swapRequest) return null;
  const { instructor_requesterId, instructor_targetInstructorId, ...rest } = swapRequest;

  return {
    ...rest,
    requester: instructor_requesterId,
    targetInstructor: instructor_targetInstructorId,
  };
};

export const shiftSwapsRouter = createTRPCRouter({
  /**
   * List swap requests (admin view or instructor view)
   */
  list: protectedProcedure
    .input(listSwapRequestsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const conditions: SQL[] = [eq(shiftSwapRequest.organizationId, ctx.orgId)];
      if (input.status) conditions.push(eq(shiftSwapRequest.status, input.status));
      if (input.instructorId) {
        conditions.push(
          or(
            eq(shiftSwapRequest.requesterId, input.instructorId),
            eq(shiftSwapRequest.targetInstructorId, input.instructorId)
          )!
        );
      }

      if (input.cursor) {
        const cursor = await db.query.shiftSwapRequest.findFirst({
          where: eq(shiftSwapRequest.id, input.cursor),
          columns: { id: true, requestedAt: true },
        });
        if (cursor) {
          conditions.push(
            or(
              lt(shiftSwapRequest.requestedAt, cursor.requestedAt),
              and(eq(shiftSwapRequest.requestedAt, cursor.requestedAt), lt(shiftSwapRequest.id, cursor.id))
            )!
          );
        }
      }

      const rows = await db.query.shiftSwapRequest.findMany({
        where: and(...conditions),
        with: {
          rota: {
            with: {
              client: true,
              deal: true,
            },
          },
          instructor_requesterId: true,
          instructor_targetInstructorId: true,
        },
        orderBy: [desc(shiftSwapRequest.requestedAt), desc(shiftSwapRequest.id)],
        limit: input.limit + 1,
      });

      const items = rows.map(({ instructor_requesterId, instructor_targetInstructorId, ...item }) => ({
        ...item,
        requester: instructor_requesterId,
        targetInstructor: instructor_targetInstructorId,
      }));

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
   * Get swap request by ID
   */
  getById: protectedProcedure
    .input(z.object({ swapRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const swapRequest = await getSwapRequestWithRelations({
        id: input.swapRequestId,
        organizationId: ctx.orgId,
      });

      if (!swapRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Swap request not found",
        });
      }

      return swapRequest;
    }),

  /**
   * Create swap request (instructor initiates)
   */
  create: protectedProcedure
    .input(createSwapRequestSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      // Get the rota and verify it belongs to a instructor
      const existingRota = await db.query.rota.findFirst({
        where: and(eq(rota.id, input.rotaId), eq(rota.organizationId, ctx.orgId)),
        with: { instructor: true },
      });

      if (!existingRota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shift not found",
        });
      }

      // Check if there's already a pending swap request for this rota
      const existingRequest = await db.query.shiftSwapRequest.findFirst({
        where: and(
          eq(shiftSwapRequest.rotaId, input.rotaId),
          eq(shiftSwapRequest.status, ShiftSwapStatus.PENDING)
        ),
      });

      if (existingRequest) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A swap request already exists for this shift",
        });
      }

      // Verify target instructor exists if provided
      if (input.targetInstructorId) {
        const targetInstructor = await db.query.instructor.findFirst({
          where: and(
            eq(instructor.id, input.targetInstructorId),
            eq(instructor.organizationId, ctx.orgId),
            eq(instructor.isActive, true)
          ),
        });

        if (!targetInstructor) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target instructor not found or inactive",
          });
        }
      }

      const expiresAt = addDays(new Date(), input.expiresInDays);
      const now = new Date();

      const [createdRequest] = await db
        .insert(shiftSwapRequest)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: existingRota.locationId,
          rotaId: input.rotaId,
          requesterId: existingRota.instructorId,
          targetInstructorId: input.targetInstructorId,
          reason: input.reason,
          expiresAt,
          status: ShiftSwapStatus.PENDING,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: shiftSwapRequest.id });

      return getSwapRequestWithRelations({ id: createdRequest.id, organizationId: ctx.orgId });
    }),

  /**
   * Instructor responds to swap request (accept/reject)
   */
  respond: protectedProcedure
    .input(respondToSwapSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const existingRequest = await db.query.shiftSwapRequest.findFirst({
        where: and(
          eq(shiftSwapRequest.id, input.swapRequestId),
          eq(shiftSwapRequest.organizationId, ctx.orgId),
          eq(shiftSwapRequest.status, ShiftSwapStatus.PENDING)
        ),
        with: { rota: true },
      });

      if (!existingRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Swap request not found or already processed",
        });
      }

      // Check if expired
      if (existingRequest.expiresAt && existingRequest.expiresAt < new Date()) {
        await db
          .update(shiftSwapRequest)
          .set({ status: ShiftSwapStatus.EXPIRED, updatedAt: new Date() })
          .where(eq(shiftSwapRequest.id, input.swapRequestId));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This swap request has expired",
        });
      }

      await db
        .update(shiftSwapRequest)
        .set({
          status: input.accept
            ? ShiftSwapStatus.INSTRUCTOR_ACCEPTED
            : ShiftSwapStatus.INSTRUCTOR_REJECTED,
          respondedAt: new Date(),
          respondedBy: ctx.auth.user.id,
          ...(input.rejectionReason && {
            rejectionReason: input.rejectionReason,
          }),
          updatedAt: new Date(),
        })
        .where(eq(shiftSwapRequest.id, input.swapRequestId));

      return getSwapRequestWithRelations({ id: input.swapRequestId, organizationId: ctx.orgId });
    }),

  /**
   * Admin approves/rejects swap request
   */
  adminApproval: protectedProcedure
    .input(adminApprovalSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const existingRequest = await db.query.shiftSwapRequest.findFirst({
        where: and(eq(shiftSwapRequest.id, input.swapRequestId), eq(shiftSwapRequest.organizationId, ctx.orgId)),
        with: {
          rota: true,
          instructor_targetInstructorId: true,
        },
      });

      if (!existingRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Swap request not found",
        });
      }

      // Must be instructor-accepted before admin can approve
      if (
        input.approve &&
        existingRequest.status !== ShiftSwapStatus.INSTRUCTOR_ACCEPTED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Swap must be accepted by instructor before admin approval",
        });
      }

      const newStatus = input.approve
        ? ShiftSwapStatus.ADMIN_APPROVED
        : ShiftSwapStatus.ADMIN_REJECTED;

      await db.transaction(async (tx) => {
        if (input.approve && existingRequest.instructor_targetInstructorId) {
          await tx
            .update(rota)
            .set({
              instructorId: existingRequest.instructor_targetInstructorId.id,
              updatedAt: new Date(),
            })
            .where(eq(rota.id, existingRequest.rotaId));
        }

        await tx
          .update(shiftSwapRequest)
          .set({
            status: newStatus,
            ...(input.approve
              ? {
                  adminApprovedAt: new Date(),
                  adminApprovedBy: ctx.auth.user.id,
                }
              : {
                  adminRejectedAt: new Date(),
                  adminRejectedBy: ctx.auth.user.id,
                  rejectionReason: input.rejectionReason,
                }),
            updatedAt: new Date(),
          })
          .where(eq(shiftSwapRequest.id, input.swapRequestId));
      });

      return getSwapRequestWithRelations({ id: input.swapRequestId, organizationId: ctx.orgId });
    }),

  /**
   * Cancel swap request (requester cancels)
   */
  cancel: protectedProcedure
    .input(z.object({ swapRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const existingRequest = await db.query.shiftSwapRequest.findFirst({
        where: and(
          eq(shiftSwapRequest.id, input.swapRequestId),
          eq(shiftSwapRequest.organizationId, ctx.orgId),
          or(
            eq(shiftSwapRequest.status, ShiftSwapStatus.PENDING),
            eq(shiftSwapRequest.status, ShiftSwapStatus.INSTRUCTOR_ACCEPTED)
          )!
        ),
      });

      if (!existingRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Swap request not found or cannot be cancelled",
        });
      }

      await db
        .update(shiftSwapRequest)
        .set({
          status: ShiftSwapStatus.CANCELLED,
          updatedAt: new Date(),
        })
        .where(eq(shiftSwapRequest.id, input.swapRequestId));

      return getSwapRequestWithRelations({ id: input.swapRequestId, organizationId: ctx.orgId });
    }),

  /**
   * Get eligible instructors for shift swap
   */
  getEligibleInstructors: protectedProcedure
    .input(z.object({ rotaId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const existingRota = await db.query.rota.findFirst({
        where: and(eq(rota.id, input.rotaId), eq(rota.organizationId, ctx.orgId)),
      });

      if (!existingRota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shift not found",
        });
      }

      // Get all active instructors excluding the current instructor
      const eligibleInstructors = await db.query.instructor.findMany({
        where: and(
          eq(instructor.organizationId, ctx.orgId),
          eq(instructor.isActive, true),
          ne(instructor.id, existingRota.instructorId)
        ),
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          skills: true,
          hourlyRate: true,
        },
      });

      return eligibleInstructors;
    }),
});
