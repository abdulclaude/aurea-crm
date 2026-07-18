import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { client, pricingOption, promoCode, studioPayment } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";

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
          applicablePricingOptionIds: true,
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
        applicablePricingOptionIds: z.array(z.string()).optional(),
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
          applicablePricingOptionIds: input.applicablePricingOptionIds ?? [],
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
        pricingOptionId: z.string().optional(),
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

      const applicablePricingOptionIds = promo.applicablePricingOptionIds ?? [];
      if (
        input.pricingOptionId &&
        applicablePricingOptionIds.length > 0 &&
        !applicablePricingOptionIds.includes(input.pricingOptionId)
      ) {
        return { valid: false, reason: "Promo code is not valid for this pricing option" } as const;
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

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        discountType: z.enum(["PERCENT", "FIXED"]).optional(),
        discountValue: z.number().positive().optional(),
        maxRedemptions: z.number().int().positive().nullable().optional(),
        applicablePlanIds: z.array(z.string()).optional(),
        applicablePricingOptionIds: z.array(z.string()).optional(),
        expiresAt: z.string().datetime().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      if (input.discountType === "PERCENT" && input.discountValue && input.discountValue > 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Percentage discount cannot exceed 100" });
      }

      const existing = await db.query.promoCode.findFirst({
        where: and(eq(promoCode.id, input.id), eq(promoCode.organizationId, ctx.orgId)),
        columns: { id: true, discountType: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Promo code not found" });

      const nextDiscountType = input.discountType ?? existing.discountType;
      if (nextDiscountType === "PERCENT" && input.discountValue && input.discountValue > 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Percentage discount cannot exceed 100" });
      }

      const [updatedPromoCode] = await db
        .update(promoCode)
        .set({
          ...(input.discountType ? { discountType: input.discountType } : {}),
          ...(input.discountValue !== undefined ? { discountValue: input.discountValue.toString() } : {}),
          ...(input.maxRedemptions !== undefined ? { maxRedemptions: input.maxRedemptions } : {}),
          ...(input.applicablePlanIds ? { applicablePlanIds: input.applicablePlanIds } : {}),
          ...(input.applicablePricingOptionIds ? { applicablePricingOptionIds: input.applicablePricingOptionIds } : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(promoCode.id, input.id))
        .returning();

      return updatedPromoCode;
    }),

  redemptions: protectedProcedure
    .input(z.object({ promoCodeId: z.string(), limit: z.number().int().min(1).max(100).default(25) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const promo = await db.query.promoCode.findFirst({
        where: and(eq(promoCode.id, input.promoCodeId), eq(promoCode.organizationId, ctx.orgId)),
        columns: { id: true },
      });
      if (!promo) throw new TRPCError({ code: "NOT_FOUND", message: "Promo code not found" });

      return db.query.studioPayment.findMany({
        where: and(eq(studioPayment.promoCodeId, input.promoCodeId), eq(studioPayment.organizationId, ctx.orgId)),
        columns: { id: true, amount: true, currency: true, createdAt: true, description: true, status: true },
        with: { client: { columns: { id: true, name: true, email: true } } },
        orderBy: desc(studioPayment.createdAt),
        limit: input.limit,
      });
    }),

  listRedemptions: protectedProcedure
    .input(
      z.object({ limit: z.number().int().min(1).max(100).default(100) }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organisation",
        });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "commerce.view",
        resource: {
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
      });

      const pricingOptionId = sql<string | null>`${studioPayment.metadata} ->> 'pricingOptionId'`;

      return db
        .select({
          id: studioPayment.id,
          redeemedAt: studioPayment.createdAt,
          status: studioPayment.status,
          currency: studioPayment.currency,
          discountAmount: studioPayment.discountAmount,
          amountAfterDiscount: studioPayment.amount,
          amountBeforeDiscount:
            sql<string | null>`case when ${studioPayment.discountAmount} is null then null else (${studioPayment.amount} + ${studioPayment.discountAmount})::text end`,
          memberId: client.id,
          memberName: client.name,
          memberEmail: client.email,
          promoCodeId: promoCode.id,
          promoCode: promoCode.code,
          pricingOptionReferenceId: pricingOptionId,
          pricingOptionId: pricingOption.id,
          pricingOptionName: pricingOption.name,
        })
        .from(studioPayment)
        .innerJoin(
          promoCode,
          and(
            eq(promoCode.id, studioPayment.promoCodeId),
            eq(promoCode.organizationId, studioPayment.organizationId),
          ),
        )
        .leftJoin(client, eq(client.id, studioPayment.clientId))
        .leftJoin(
          pricingOption,
          and(
            eq(pricingOption.id, pricingOptionId),
            eq(pricingOption.organizationId, studioPayment.organizationId),
          ),
        )
        .where(
          and(
            eq(studioPayment.organizationId, ctx.orgId),
            ctx.locationId
              ? eq(studioPayment.locationId, ctx.locationId)
              : isNull(studioPayment.locationId),
            isNull(studioPayment.deletedAt),
          ),
        )
        .orderBy(desc(studioPayment.createdAt), desc(studioPayment.id))
        .limit(input.limit);
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
