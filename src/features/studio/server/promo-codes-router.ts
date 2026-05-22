import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { and, desc, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { promoCode } from "@/db/schema";

export const promoCodesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      return db.query.promoCode.findMany({
        where: and(
          eq(promoCode.organizationId, ctx.orgId),
          ...(ctx.locationId ? [eq(promoCode.locationId, ctx.locationId)] : []),
          ...(!input?.includeInactive ? [eq(promoCode.isActive, true)] : [])
        ),
        orderBy: desc(promoCode.createdAt),
        columns: {
          id: true,
          code: true,
          discountType: true,
          discountValue: true,
          maxRedemptions: true,
          redemptionCount: true,
          expiresAt: true,
          isActive: true,
          applicablePlanIds: true,
          createdAt: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        code: z
          .string()
          .min(3)
          .max(30)
          .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, hyphens, or underscores"),
        discountType: z.enum(["PERCENT", "FIXED"]),
        discountValue: z.number().positive(),
        maxRedemptions: z.number().int().positive().optional(),
        applicablePlanIds: z.array(z.string()).optional(),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      if (input.discountType === "PERCENT" && input.discountValue > 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Percentage discount cannot exceed 100" });
      }

      const existing = await db.query.promoCode.findFirst({
        where: and(eq(promoCode.organizationId, ctx.orgId), eq(promoCode.code, input.code.toUpperCase())),
      });
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A promo code with this name already exists" });
      }

      const now = new Date();
      const [createdPromoCode] = await db
        .insert(promoCode)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          code: input.code.toUpperCase(),
          discountType: input.discountType,
          discountValue: input.discountValue.toString(),
          maxRedemptions: input.maxRedemptions ?? null,
          applicablePlanIds: input.applicablePlanIds ?? [],
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdPromoCode;
    }),

  validate: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        planId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const promo = await db.query.promoCode.findFirst({
        where: and(
          eq(promoCode.organizationId, ctx.orgId),
          eq(promoCode.code, input.code.toUpperCase()),
          eq(promoCode.isActive, true)
        ),
      });

      if (!promo) {
        return { valid: false, reason: "Invalid promo code" } as const;
      }

      if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
        return { valid: false, reason: "Promo code has reached its redemption limit" } as const;
      }

      if (promo.expiresAt && promo.expiresAt < new Date()) {
        return { valid: false, reason: "Promo code has expired" } as const;
      }

      const applicablePlanIds = promo.applicablePlanIds ?? [];
      if (input.planId && applicablePlanIds.length > 0 && !applicablePlanIds.includes(input.planId)) {
        return { valid: false, reason: "Promo code is not valid for this membership plan" } as const;
      }

      return {
        valid: true,
        promoCode: {
          id: promo.id,
          code: promo.code,
          discountType: promo.discountType,
          discountValue: Number(promo.discountValue),
        },
      } as const;
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const promo = await db.query.promoCode.findFirst({
        where: and(eq(promoCode.id, input.id), eq(promoCode.organizationId, ctx.orgId)),
      });
      if (!promo) throw new TRPCError({ code: "NOT_FOUND", message: "Promo code not found" });

      const [updatedPromoCode] = await db
        .update(promoCode)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(promoCode.id, input.id))
        .returning();

      return updatedPromoCode;
    }),
});
