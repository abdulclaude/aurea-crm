import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { UserStatus } from "@/db/enums";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
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
      const [updatedUser] = await db
        .update(userTable)
        .set({
          status: input.status,
          statusMessage: input.statusMessage ?? null,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, ctx.auth.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select({
        status: userTable.status,
        statusMessage: userTable.statusMessage,
      })
      .from(userTable)
      .where(eq(userTable.id, ctx.auth.user.id))
      .limit(1);

    return user ?? null;
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
      })
      .from(userTable)
      .where(eq(userTable.id, ctx.auth.user.id))
      .limit(1);

    return user ?? null;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        image: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await db
        .update(userTable)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.image !== undefined && { image: input.image }),
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, ctx.auth.user.id))
        .returning({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          image: userTable.image,
        });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),
});
