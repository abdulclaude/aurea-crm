import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { loyaltyBalance, loyaltyProgram, loyaltyReward, loyaltyTransaction } from "@/db/schema";

function calculateTier(lifetimePoints: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" {
  if (lifetimePoints >= 5000) return "PLATINUM";
  if (lifetimePoints >= 2000) return "GOLD";
  if (lifetimePoints >= 500) return "SILVER";
  return "BRONZE";
}

export const loyaltyRouter = createTRPCRouter({
  getProgram: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    const program = await db.query.loyaltyProgram.findFirst({
      where: eq(loyaltyProgram.organizationId, ctx.orgId),
      with: {
        loyaltyRewards: {
          where: eq(loyaltyReward.isActive, true),
          orderBy: asc(loyaltyReward.pointsCost),
        },
      },
    });

    if (!program) return null;
    const { loyaltyRewards, ...rest } = program;
    return { ...rest, rewards: loyaltyRewards };
  }),

  setupProgram: protectedProcedure
    .input(z.object({
      name: z.string().min(1).default("Rewards"),
      pointsPerClass: z.number().int().min(0).default(10),
      pointsPerReferral: z.number().int().min(0).default(50),
      pointsPerPurchase: z.number().int().min(0).default(1),
      purchasePointsUnit: z.number().min(0.01).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const now = new Date();
      const values = {
        organizationId: ctx.orgId,
        name: input.name,
        pointsPerClass: input.pointsPerClass,
        pointsPerReferral: input.pointsPerReferral,
        pointsPerPurchase: input.pointsPerPurchase,
        purchasePointsUnit: input.purchasePointsUnit.toString(),
        updatedAt: now,
      };

      const [program] = await db
        .insert(loyaltyProgram)
        .values({
          id: createId(),
          ...values,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: loyaltyProgram.organizationId,
          set: values,
        })
        .returning();

      return program;
    }),

  toggleProgram: protectedProcedure
    .input(z.object({ isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const [program] = await db
        .update(loyaltyProgram)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(loyaltyProgram.organizationId, ctx.orgId))
        .returning();

      if (!program) throw new TRPCError({ code: "NOT_FOUND", message: "Loyalty program not found" });

      return program;
    }),

  createReward: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      pointsCost: z.number().int().min(1),
      type: z.enum(["FREE_CLASS", "DISCOUNT_PERCENT", "DISCOUNT_FIXED", "MERCHANDISE", "EXPERIENCE"]),
      value: z.string().optional(),
      stock: z.number().int().min(0).optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const program = await db.query.loyaltyProgram.findFirst({
        where: eq(loyaltyProgram.organizationId, ctx.orgId),
      });
      if (!program) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set up loyalty program first" });

      const now = new Date();
      const [reward] = await db
        .insert(loyaltyReward)
        .values({
          id: createId(),
          programId: program.id,
          ...input,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return reward;
    }),

  updateReward: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      pointsCost: z.number().int().min(1).optional(),
      value: z.string().optional(),
      stock: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [reward] = await db
        .update(loyaltyReward)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(loyaltyReward.id, id))
        .returning();

      return reward;
    }),

  getBalance: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      return db.query.loyaltyBalance.findFirst({
        where: and(eq(loyaltyBalance.organizationId, ctx.orgId), eq(loyaltyBalance.clientId, input.clientId)),
      });
    }),

  earnPoints: protectedProcedure
    .input(z.object({
      clientId: z.string(),
      points: z.number().int().min(1),
      type: z.enum(["EARN_CLASS", "EARN_PURCHASE", "EARN_REFERRAL", "EARN_CHALLENGE", "EARN_BONUS"]),
      description: z.string(),
      referenceId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const organizationId = ctx.orgId;

      const balance = await db.transaction(async (tx) => {
        const now = new Date();
        const [upsertedBalance] = await tx
          .insert(loyaltyBalance)
          .values({
            id: createId(),
            organizationId,
            clientId: input.clientId,
            points: input.points,
            lifetimePoints: input.points,
            tier: calculateTier(input.points),
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [loyaltyBalance.organizationId, loyaltyBalance.clientId],
            set: {
              points: sql`${loyaltyBalance.points} + ${input.points}`,
              lifetimePoints: sql`${loyaltyBalance.lifetimePoints} + ${input.points}`,
              updatedAt: now,
            },
          })
          .returning();

        await tx
          .insert(loyaltyTransaction)
          .values({
            id: createId(),
            organizationId,
            clientId: input.clientId,
            points: input.points,
            type: input.type,
            description: input.description,
            referenceId: input.referenceId,
          });

        const newTier = calculateTier(upsertedBalance.lifetimePoints);
        if (newTier === upsertedBalance.tier) return upsertedBalance;

        const [updatedBalance] = await tx
          .update(loyaltyBalance)
          .set({ tier: newTier, updatedAt: now })
          .where(and(eq(loyaltyBalance.organizationId, organizationId), eq(loyaltyBalance.clientId, input.clientId)))
          .returning();

        return updatedBalance;
      });

      return balance;
    }),

  redeemReward: protectedProcedure
    .input(z.object({ clientId: z.string(), rewardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const organizationId = ctx.orgId;

      return db.transaction(async (tx) => {
        const [balance] = await tx
          .select()
          .from(loyaltyBalance)
          .where(and(eq(loyaltyBalance.organizationId, organizationId), eq(loyaltyBalance.clientId, input.clientId)))
          .limit(1);

        const [rewardRow] = await tx
          .select({ reward: loyaltyReward })
          .from(loyaltyReward)
          .innerJoin(loyaltyProgram, eq(loyaltyReward.programId, loyaltyProgram.id))
          .where(
            and(
              eq(loyaltyReward.id, input.rewardId),
              eq(loyaltyReward.isActive, true),
              eq(loyaltyProgram.organizationId, organizationId)
            )
          )
          .limit(1);

        if (!balance) throw new TRPCError({ code: "NOT_FOUND", message: "No loyalty balance" });
        const reward = rewardRow?.reward;
        if (!reward) throw new TRPCError({ code: "NOT_FOUND", message: "Reward not available" });
        if (balance.points < reward.pointsCost) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Not enough points" });
        }
        if (reward.stock !== null && reward.stock <= 0) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Reward out of stock" });
        }

        const now = new Date();
        await tx
          .update(loyaltyBalance)
          .set({
            points: sql`${loyaltyBalance.points} - ${reward.pointsCost}`,
            updatedAt: now,
          })
          .where(and(eq(loyaltyBalance.organizationId, organizationId), eq(loyaltyBalance.clientId, input.clientId)));

        await tx
          .insert(loyaltyTransaction)
          .values({
            id: createId(),
            organizationId,
            clientId: input.clientId,
            points: -reward.pointsCost,
            type: "REDEEM",
            description: `Redeemed: ${reward.name}`,
            referenceId: reward.id,
          });

        if (reward.stock !== null) {
          await tx
            .update(loyaltyReward)
            .set({ stock: sql`${loyaltyReward.stock} - 1`, updatedAt: now })
            .where(eq(loyaltyReward.id, reward.id));
        }

        return { redeemed: true, reward: reward.name, pointsSpent: reward.pointsCost };
      });
    }),

  getLeaderboard: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      return db.query.loyaltyBalance.findMany({
        where: eq(loyaltyBalance.organizationId, ctx.orgId),
        with: { client: { columns: { name: true, email: true } } },
        limit: input.limit,
        orderBy: desc(loyaltyBalance.lifetimePoints),
      });
    }),

  getTransactions: protectedProcedure
    .input(z.object({
      clientId: z.string(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      return db.query.loyaltyTransaction.findMany({
        where: and(eq(loyaltyTransaction.organizationId, ctx.orgId), eq(loyaltyTransaction.clientId, input.clientId)),
        limit: input.limit,
        orderBy: desc(loyaltyTransaction.createdAt),
      });
    }),
});
