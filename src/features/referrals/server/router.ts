import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { randomBytes } from "crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { referral, referralProgram } from "@/db/schema";

const countReferrals = async (programId: string, status?: string): Promise<number> => {
  const [row] = await db
    .select({ total: count() })
    .from(referral)
    .where(
      and(
        eq(referral.programId, programId),
        ...(status ? [eq(referral.status, status as (typeof referral.status.enumValues)[number])] : [])
      )
    );

  return row?.total ?? 0;
};

export const referralsRouter = createTRPCRouter({
  getProgram: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    const program = await db.query.referralProgram.findFirst({
      where: eq(referralProgram.organizationId, ctx.orgId),
    });

    if (!program) return null;

    return {
      ...program,
      _count: { referrals: await countReferrals(program.id) },
    };
  }),

  setupProgram: protectedProcedure
    .input(z.object({
      name: z.string().min(1).default("Refer a Friend"),
      referrerRewardType: z.enum(["CREDIT", "DISCOUNT", "FREE_CLASS", "CASH"]).default("CREDIT"),
      referrerRewardValue: z.number().min(0),
      refereeRewardType: z.enum(["CREDIT", "DISCOUNT", "FREE_CLASS", "CASH"]).default("DISCOUNT"),
      refereeRewardValue: z.number().min(0),
      refereeOfferDays: z.number().int().min(1).max(90).default(30),
      maxReferralsPerMember: z.number().int().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const now = new Date();
      const values = {
        organizationId: ctx.orgId,
        name: input.name,
        referrerRewardType: input.referrerRewardType,
        referrerRewardValue: input.referrerRewardValue.toString(),
        refereeRewardType: input.refereeRewardType,
        refereeRewardValue: input.refereeRewardValue.toString(),
        refereeOfferDays: input.refereeOfferDays,
        maxReferralsPerMember: input.maxReferralsPerMember,
        updatedAt: now,
      };

      const [program] = await db
        .insert(referralProgram)
        .values({
          id: createId(),
          ...values,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: referralProgram.organizationId,
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
        .update(referralProgram)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(referralProgram.organizationId, ctx.orgId))
        .returning();

      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Referral program not found" });
      }

      return program;
    }),

  createReferral: protectedProcedure
    .input(z.object({
      referrerClientId: z.string(),
      refereeEmail: z.string().email(),
      refereePhone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const program = await db.query.referralProgram.findFirst({
        where: eq(referralProgram.organizationId, ctx.orgId),
      });

      if (!program || !program.isActive) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Referral program not active" });
      }

      if (program.maxReferralsPerMember) {
        const [row] = await db
          .select({ total: count() })
          .from(referral)
          .where(
            and(
              eq(referral.programId, program.id),
              eq(referral.referrerClientId, input.referrerClientId)
            )
          );
        if ((row?.total ?? 0) >= program.maxReferralsPerMember) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Referral limit reached" });
        }
      }

      const code = randomBytes(4).toString("hex").toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + program.refereeOfferDays);

      const [createdReferral] = await db
        .insert(referral)
        .values({
          id: createId(),
          programId: program.id,
          referrerClientId: input.referrerClientId,
          refereeEmail: input.refereeEmail,
          refereePhone: input.refereePhone,
          code,
          expiresAt,
        })
        .returning();

      return createdReferral;
    }),

  validateCode: baseProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const existingReferral = await db.query.referral.findFirst({
        where: eq(referral.code, input.code),
        with: {
          referralProgram: {
            columns: {
              refereeRewardType: true,
              refereeRewardValue: true,
              currency: true,
              isActive: true,
            },
          },
        },
      });

      if (!existingReferral || existingReferral.status !== "PENDING" || existingReferral.expiresAt < new Date()) {
        return { valid: false, referral: null };
      }

      if (!existingReferral.referralProgram.isActive) return { valid: false, referral: null };

      return { valid: true, referral: { code: existingReferral.code, reward: existingReferral.referralProgram } };
    }),

  convertReferral: protectedProcedure
    .input(z.object({ code: z.string(), refereeClientId: z.string() }))
    .mutation(async ({ input }) => {
      const existingReferral = await db.query.referral.findFirst({
        where: eq(referral.code, input.code),
      });

      if (!existingReferral || existingReferral.status !== "PENDING") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral" });
      }

      const [updatedReferral] = await db
        .update(referral)
        .set({
          status: "CONVERTED",
          refereeClientId: input.refereeClientId,
          convertedAt: new Date(),
        })
        .where(eq(referral.code, input.code))
        .returning();

      return updatedReferral;
    }),

  listReferrals: protectedProcedure
    .input(z.object({
      status: z.enum(["PENDING", "SIGNED_UP", "CONVERTED", "REWARDED", "EXPIRED"]).optional(),
      referrerClientId: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const program = await db.query.referralProgram.findFirst({
        where: eq(referralProgram.organizationId, ctx.orgId),
      });

      if (!program) return [];

      const referrals = await db.query.referral.findMany({
        where: and(
          eq(referral.programId, program.id),
          ...(input.status ? [eq(referral.status, input.status)] : []),
          ...(input.referrerClientId ? [eq(referral.referrerClientId, input.referrerClientId)] : [])
        ),
        limit: input.limit,
        orderBy: desc(referral.createdAt),
        with: {
          client_referrerClientId: {
            columns: { id: true, name: true, email: true },
          },
          client_refereeClientId: {
            columns: { id: true, name: true },
          },
        },
      });

      return referrals.map(({ client_referrerClientId, client_refereeClientId, ...item }) => ({
        ...item,
        referrerClient: client_referrerClientId,
        refereeClient: client_refereeClientId,
      }));
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    const program = await db.query.referralProgram.findFirst({
      where: eq(referralProgram.organizationId, ctx.orgId),
    });
    if (!program) return null;

    const [total, converted, pending] = await Promise.all([
      countReferrals(program.id),
      countReferrals(program.id, "CONVERTED"),
      countReferrals(program.id, "PENDING"),
    ]);

    return {
      totalReferrals: total,
      converted,
      pending,
      conversionRate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
    };
  }),
});
