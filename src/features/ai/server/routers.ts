import { z } from "zod";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import prisma from "@/lib/db";

export const aiRouter = createTRPCRouter({
  getLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const logs = await prisma.aILog.findMany({
        where: {
          userId: ctx.auth.user.id,
          OR: [
            { organizationId: ctx.orgId },
            { subaccountId: ctx.subaccountId },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (logs.length > input.limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: logs,
        nextCursor,
      };
    }),

  createLog: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        intent: z.string().optional(),
        userMessage: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.aILog.create({
        data: {
          title: input.title,
          description: input.description,
          intent: input.intent,
          userMessage: input.userMessage,
          status: "RUNNING",
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId,
        },
      });
    }),

  updateLog: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]),
        error: z.string().optional(),
        result: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.aILog.update({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        data: {
          status: input.status,
          error: input.error,
          result: input.result,
          completedAt:
            input.status === "COMPLETED" || input.status === "FAILED"
              ? new Date()
              : undefined,
        },
      });
    }),

  deleteLog: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.aILog.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
    }),
});
