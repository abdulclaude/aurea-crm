import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { UserStatus } from "@prisma/client";
import z from "zod";

export const usersRouter = createTRPCRouter({
  updateStatus: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(UserStatus),
        statusMessage: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await prisma.user.update({
        where: { id: ctx.auth.user.id },
        data: {
          status: input.status,
          statusMessage: input.statusMessage ?? null,
        },
      });

      return updatedUser;
    }),

  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.auth.user.id },
      select: {
        status: true,
        statusMessage: true,
      },
    });

    return user;
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.auth.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        image: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.update({
        where: { id: ctx.auth.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.image !== undefined && { image: input.image }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      return user;
    }),
});
