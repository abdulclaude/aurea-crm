import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { AILogStatus } from "@prisma/client";
import prisma from "@/lib/db";

export const logsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        statuses: z.array(z.nativeEnum(AILogStatus)).optional(),
        intents: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        createdAtStart: z.date().optional(),
        createdAtEnd: z.date().optional(),
        completedAtStart: z.date().optional(),
        completedAtEnd: z.date().optional(),
        subaccountId: z.string().optional(), // Override for "all-clients" view
        includeAllClients: z.boolean().optional(), // Flag to include all clients
      })
    )
    .query(async ({ ctx, input }) => {
      const subaccountId =
        input?.subaccountId !== undefined
          ? input.subaccountId || null
          : ctx.subaccountId;

      const where: any = {
        organizationId: ctx.orgId,
        ...(input?.includeAllClients
          ? {}
          : subaccountId
            ? { subaccountId }
            : { subaccountId: null }),
      };

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
          { intent: { contains: input.search, mode: "insensitive" } },
          { userMessage: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input.statuses && input.statuses.length > 0) {
        where.status = { in: input.statuses };
      }

      if (input.intents && input.intents.length > 0) {
        where.intent = { in: input.intents };
      }

      if (input.userIds && input.userIds.length > 0) {
        where.userId = { in: input.userIds };
      }

      if (input.createdAtStart || input.createdAtEnd) {
        where.createdAt = {};
        if (input.createdAtStart) {
          where.createdAt.gte = input.createdAtStart;
        }
        if (input.createdAtEnd) {
          where.createdAt.lte = input.createdAtEnd;
        }
      }

      if (input.completedAtStart || input.completedAtEnd) {
        where.completedAt = {};
        if (input.completedAtStart) {
          where.completedAt.gte = input.completedAtStart;
        }
        if (input.completedAtEnd) {
          where.completedAt.lte = input.completedAtEnd;
        }
      }

      const logs = await prisma.aILog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        items: logs,
      };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const logs = await prisma.aILog.findMany({
      where: {
        organizationId: ctx.orgId,
      },
      select: {
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const statusCounts = logs.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {} as Record<AILogStatus, number>);

    return {
      total: logs.length,
      statusCounts,
    };
  }),

  dateRange: protectedProcedure.query(async ({ ctx }) => {
    const result = await prisma.aILog.aggregate({
      where: {
        organizationId: ctx.orgId,
      },
      _min: {
        createdAt: true,
        completedAt: true,
      },
      _max: {
        createdAt: true,
        completedAt: true,
      },
    });

    return {
      createdAtMin: result._min.createdAt,
      createdAtMax: result._max.createdAt,
      completedAtMin: result._min.completedAt,
      completedAtMax: result._max.completedAt,
    };
  }),

  filterOptions: protectedProcedure.query(async ({ ctx }) => {
    const logs = await prisma.aILog.findMany({
      where: {
        organizationId: ctx.orgId,
      },
      select: {
        intent: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      distinct: ["intent", "userId"],
    });

    // Get unique intents (filter out null/empty)
    const intents = Array.from(
      new Set(
        logs
          .map((log) => log.intent)
          .filter((intent): intent is string => !!intent)
      )
    ).sort();

    // Get unique users
    const usersMap = new Map();
    logs.forEach((log) => {
      if (log.user && !usersMap.has(log.user.id)) {
        usersMap.set(log.user.id, log.user);
      }
    });
    const users = Array.from(usersMap.values());

    return {
      intents,
      users,
    };
  }),
});
