import { Input } from "@/components/ui/input";
import { PAGINATION } from "@/config/constants";
import { CredentialType, NodeType } from "@prisma/client";
import prisma from "@/lib/db";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import type { Node, Edge } from "@xyflow/react";
import z from "zod";

const executionScopeWhere = (ctx: {
  auth: { user: { id: string } };
  subaccountId?: string | null;
}) => ({
  Workflows: {
    userId: ctx.auth.user.id,
    subaccountId: ctx.subaccountId ?? null,
  },
  subaccountId: ctx.subaccountId ?? null,
});

export const executionsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.execution.findFirstOrThrow({
        where: {
          id: input.id,
          ...executionScopeWhere(ctx),
        },
        include: {
          Workflows: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),
  // Fetch all executions without pagination for timeline view
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return prisma.execution.findMany({
      where: executionScopeWhere(ctx),
      orderBy: {
        startedAt: "desc",
      },
      include: {
        Workflows: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;

      const [items, totalCount] = await Promise.all([
        prisma.execution.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: executionScopeWhere(ctx),
          orderBy: {
            startedAt: "desc",
          },
          include: {
            Workflows: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.execution.count({
          where: executionScopeWhere(ctx),
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
});
