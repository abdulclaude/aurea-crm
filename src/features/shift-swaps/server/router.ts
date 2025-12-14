import { z } from "zod";
import { prisma } from "@/lib/db";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { ShiftSwapStatus } from "@prisma/client";
import { addDays } from "date-fns";

const createSwapRequestSchema = z.object({
  rotaId: z.string(),
  targetWorkerId: z.string().optional(), // If provided, specific worker; otherwise open to all
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
  workerId: z.string().optional(), // Filter by specific worker
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const shiftSwapsRouter = createTRPCRouter({
  /**
   * List swap requests (admin view or worker view)
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

      const where: any = {
        organizationId: ctx.orgId,
        ...(input.status && { status: input.status }),
        ...(input.workerId && {
          OR: [
            { requesterId: input.workerId },
            { targetWorkerId: input.workerId },
          ],
        }),
      };

      const items = await prisma.shiftSwapRequest.findMany({
        where,
        include: {
          rota: {
            include: {
              contact: true,
              deal: true,
            },
          },
          requester: true,
          targetWorker: true,
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

      const swapRequest = await prisma.shiftSwapRequest.findFirst({
        where: {
          id: input.swapRequestId,
          organizationId: ctx.orgId,
        },
        include: {
          rota: {
            include: {
              contact: true,
              deal: true,
            },
          },
          requester: true,
          targetWorker: true,
        },
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
   * Create swap request (worker initiates)
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

      // Get the rota and verify it belongs to a worker
      const rota = await prisma.rota.findFirst({
        where: {
          id: input.rotaId,
          organizationId: ctx.orgId,
        },
        include: {
          worker: true,
        },
      });

      if (!rota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shift not found",
        });
      }

      // Check if there's already a pending swap request for this rota
      const existingRequest = await prisma.shiftSwapRequest.findFirst({
        where: {
          rotaId: input.rotaId,
          status: ShiftSwapStatus.PENDING,
        },
      });

      if (existingRequest) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A swap request already exists for this shift",
        });
      }

      // Verify target worker exists if provided
      if (input.targetWorkerId) {
        const targetWorker = await prisma.worker.findFirst({
          where: {
            id: input.targetWorkerId,
            organizationId: ctx.orgId,
            isActive: true,
          },
        });

        if (!targetWorker) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target worker not found or inactive",
          });
        }
      }

      const expiresAt = addDays(new Date(), input.expiresInDays);

      const swapRequest = await prisma.shiftSwapRequest.create({
        data: {
          organizationId: ctx.orgId,
          subaccountId: rota.subaccountId,
          rotaId: input.rotaId,
          requesterId: rota.workerId,
          targetWorkerId: input.targetWorkerId,
          reason: input.reason,
          expiresAt,
          status: ShiftSwapStatus.PENDING,
        },
        include: {
          rota: {
            include: {
              contact: true,
              deal: true,
            },
          },
          requester: true,
          targetWorker: true,
        },
      });

      // TODO: Send notification to target worker or broadcast to eligible workers

      return swapRequest;
    }),

  /**
   * Worker responds to swap request (accept/reject)
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

      const swapRequest = await prisma.shiftSwapRequest.findFirst({
        where: {
          id: input.swapRequestId,
          organizationId: ctx.orgId,
          status: ShiftSwapStatus.PENDING,
        },
        include: {
          rota: true,
        },
      });

      if (!swapRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Swap request not found or already processed",
        });
      }

      // Check if expired
      if (swapRequest.expiresAt && swapRequest.expiresAt < new Date()) {
        await prisma.shiftSwapRequest.update({
          where: { id: input.swapRequestId },
          data: { status: ShiftSwapStatus.EXPIRED },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This swap request has expired",
        });
      }

      const updatedRequest = await prisma.shiftSwapRequest.update({
        where: { id: input.swapRequestId },
        data: {
          status: input.accept
            ? ShiftSwapStatus.WORKER_ACCEPTED
            : ShiftSwapStatus.WORKER_REJECTED,
          respondedAt: new Date(),
          respondedBy: ctx.auth.user.id,
          ...(input.rejectionReason && {
            rejectionReason: input.rejectionReason,
          }),
        },
        include: {
          rota: {
            include: {
              contact: true,
              deal: true,
            },
          },
          requester: true,
          targetWorker: true,
        },
      });

      // TODO: Send notification to requester and admin

      return updatedRequest;
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

      const swapRequest = await prisma.shiftSwapRequest.findFirst({
        where: {
          id: input.swapRequestId,
          organizationId: ctx.orgId,
        },
        include: {
          rota: true,
          targetWorker: true,
        },
      });

      if (!swapRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Swap request not found",
        });
      }

      // Must be worker-accepted before admin can approve
      if (
        input.approve &&
        swapRequest.status !== ShiftSwapStatus.WORKER_ACCEPTED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Swap must be accepted by worker before admin approval",
        });
      }

      const newStatus = input.approve
        ? ShiftSwapStatus.ADMIN_APPROVED
        : ShiftSwapStatus.ADMIN_REJECTED;

      // If approving, update the rota with new worker
      if (input.approve && swapRequest.targetWorker) {
        await prisma.rota.update({
          where: { id: swapRequest.rotaId },
          data: {
            workerId: swapRequest.targetWorker.id,
          },
        });
      }

      const updatedRequest = await prisma.shiftSwapRequest.update({
        where: { id: input.swapRequestId },
        data: {
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
        },
        include: {
          rota: {
            include: {
              contact: true,
              deal: true,
            },
          },
          requester: true,
          targetWorker: true,
        },
      });

      // TODO: Send notifications to both workers

      return updatedRequest;
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

      const swapRequest = await prisma.shiftSwapRequest.findFirst({
        where: {
          id: input.swapRequestId,
          organizationId: ctx.orgId,
          status: {
            in: [ShiftSwapStatus.PENDING, ShiftSwapStatus.WORKER_ACCEPTED],
          },
        },
      });

      if (!swapRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Swap request not found or cannot be cancelled",
        });
      }

      const updatedRequest = await prisma.shiftSwapRequest.update({
        where: { id: input.swapRequestId },
        data: {
          status: ShiftSwapStatus.CANCELLED,
        },
        include: {
          rota: {
            include: {
              contact: true,
              deal: true,
            },
          },
          requester: true,
          targetWorker: true,
        },
      });

      return updatedRequest;
    }),

  /**
   * Get eligible workers for shift swap
   */
  getEligibleWorkers: protectedProcedure
    .input(z.object({ rotaId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const rota = await prisma.rota.findFirst({
        where: {
          id: input.rotaId,
          organizationId: ctx.orgId,
        },
      });

      if (!rota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shift not found",
        });
      }

      // Get all active workers excluding the current worker
      const eligibleWorkers = await prisma.worker.findMany({
        where: {
          organizationId: ctx.orgId,
          isActive: true,
          NOT: {
            id: rota.workerId,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          skills: true,
          hourlyRate: true,
        },
      });

      // TODO: Filter by availability, skills, etc.

      return eligibleWorkers;
    }),
});
