import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { cancellationCharge, cancellationPolicy, classCredit } from "@/db/schema";

const scopedPolicyConditions = (organizationId: string, locationId: string | null): SQL[] => [
  eq(cancellationPolicy.organizationId, organizationId),
  ...(locationId ? [eq(cancellationPolicy.locationId, locationId)] : []),
];

export const cancellationPolicyRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    return db.query.cancellationPolicy.findMany({
      where: and(...scopedPolicyConditions(ctx.orgId, ctx.locationId ?? null)),
      orderBy: desc(cancellationPolicy.createdAt),
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        lateCancelWindow: z.number().int().min(1).max(72).default(12),
        noShowFeeAmount: z.number().min(0),
        lateCancelFee: z.number().min(0),
        currency: z.string().default("GBP"),
        deductCredits: z.boolean().default(true),
        creditsDeducted: z.number().int().min(0).default(1),
        chargeCard: z.boolean().default(false),
        sendNotification: z.boolean().default(true),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const organizationId = ctx.orgId;

      return db.transaction(async (tx) => {
        if (input.isDefault) {
          await tx
            .update(cancellationPolicy)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(and(...scopedPolicyConditions(organizationId, ctx.locationId ?? null)));
        }

        const now = new Date();
        const [createdPolicy] = await tx
          .insert(cancellationPolicy)
          .values({
          id: createId(),
          organizationId,
          locationId: ctx.locationId ?? null,
          ...input,
          noShowFeeAmount: input.noShowFeeAmount.toString(),
          lateCancelFee: input.lateCancelFee.toString(),
          createdAt: now,
          updatedAt: now,
        })
          .returning();

        return createdPolicy;
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        lateCancelWindow: z.number().int().min(1).max(72).optional(),
        noShowFeeAmount: z.number().min(0).optional(),
        lateCancelFee: z.number().min(0).optional(),
        deductCredits: z.boolean().optional(),
        creditsDeducted: z.number().int().min(0).optional(),
        chargeCard: z.boolean().optional(),
        sendNotification: z.boolean().optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const { id, noShowFeeAmount, lateCancelFee, ...data } = input;

      const existing = await db.query.cancellationPolicy.findFirst({
        where: and(eq(cancellationPolicy.id, id), eq(cancellationPolicy.organizationId, ctx.orgId)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Cancellation policy not found" });

      return db.transaction(async (tx) => {
        if (data.isDefault) {
          await tx
            .update(cancellationPolicy)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(and(...scopedPolicyConditions(ctx.orgId!, ctx.locationId ?? null)));
        }

        const [updatedPolicy] = await tx
          .update(cancellationPolicy)
          .set({
            ...data,
            ...(noShowFeeAmount !== undefined ? { noShowFeeAmount: noShowFeeAmount.toString() } : {}),
            ...(lateCancelFee !== undefined ? { lateCancelFee: lateCancelFee.toString() } : {}),
            updatedAt: new Date(),
          })
          .where(eq(cancellationPolicy.id, id))
          .returning();

        return updatedPolicy;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const [deletedPolicy] = await db
        .delete(cancellationPolicy)
        .where(and(eq(cancellationPolicy.id, input.id), eq(cancellationPolicy.organizationId, ctx.orgId)))
        .returning();

      if (!deletedPolicy) throw new TRPCError({ code: "NOT_FOUND", message: "Cancellation policy not found" });
      return deletedPolicy;
    }),

  chargeNoShow: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        classId: z.string(),
        bookingId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const organizationId = ctx.orgId;

      const policy = await db.query.cancellationPolicy.findFirst({
        where: and(
          eq(cancellationPolicy.organizationId, organizationId),
          eq(cancellationPolicy.isDefault, true),
          eq(cancellationPolicy.isActive, true)
        ),
      });

      if (!policy) throw new TRPCError({ code: "NOT_FOUND", message: "No cancellation policy configured" });

      return db.transaction(async (tx) => {
        const [charge] = await tx
          .insert(cancellationCharge)
          .values({
            id: createId(),
            organizationId,
            clientId: input.clientId,
            classId: input.classId,
            bookingId: input.bookingId,
            type: "NO_SHOW",
            amount: policy.noShowFeeAmount,
            currency: policy.currency,
            creditsDeducted: policy.deductCredits ? policy.creditsDeducted : 0,
          })
          .returning();

        if (policy.deductCredits) {
          const credit = await tx.query.classCredit.findFirst({
            where: eq(classCredit.clientId, input.clientId),
            orderBy: desc(classCredit.createdAt),
          });
          if (credit && credit.usedCredits < credit.totalCredits) {
            const increment = Math.min(policy.creditsDeducted, credit.totalCredits - credit.usedCredits);
            await tx
              .update(classCredit)
              .set({
                usedCredits: sql`${classCredit.usedCredits} + ${increment}`,
                updatedAt: new Date(),
              })
              .where(eq(classCredit.id, credit.id));
          }
        }

        return charge;
      });
    }),

  chargeLateCancel: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        classId: z.string(),
        bookingId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const policy = await db.query.cancellationPolicy.findFirst({
        where: and(
          eq(cancellationPolicy.organizationId, ctx.orgId),
          eq(cancellationPolicy.isDefault, true),
          eq(cancellationPolicy.isActive, true)
        ),
      });

      if (!policy) throw new TRPCError({ code: "NOT_FOUND", message: "No cancellation policy configured" });

      const [charge] = await db
        .insert(cancellationCharge)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          clientId: input.clientId,
          classId: input.classId,
          bookingId: input.bookingId,
          type: "LATE_CANCEL",
          amount: policy.lateCancelFee,
          currency: policy.currency,
          creditsDeducted: policy.deductCredits ? policy.creditsDeducted : 0,
        })
        .returning();

      return charge;
    }),

  waiveCharge: protectedProcedure
    .input(
      z.object({
        chargeId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [charge] = await db
        .update(cancellationCharge)
        .set({
          waived: true,
          waivedBy: ctx.auth.user.id,
          waivedReason: input.reason,
        })
        .where(eq(cancellationCharge.id, input.chargeId))
        .returning();

      return charge;
    }),

  getCharges: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        classId: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      return db.query.cancellationCharge.findMany({
        where: and(
          eq(cancellationCharge.organizationId, ctx.orgId),
          ...(input.clientId ? [eq(cancellationCharge.clientId, input.clientId)] : []),
          ...(input.classId ? [eq(cancellationCharge.classId, input.classId)] : [])
        ),
        limit: input.limit,
        orderBy: desc(cancellationCharge.createdAt),
      });
    }),
});
