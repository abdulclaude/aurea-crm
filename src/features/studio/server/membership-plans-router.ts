import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { membershipPlan, studioMembership } from "@/db/schema";

const membershipPlanScopeConditions = ({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string | null;
}): SQL[] => [
  eq(membershipPlan.organizationId, organizationId),
  locationId ? eq(membershipPlan.locationId, locationId) : isNull(membershipPlan.locationId),
];

const selectPlansWithMembershipCount = (conditions: SQL[]) =>
  db
    .select({
      plan: membershipPlan,
      studioMembershipCount: count(studioMembership.id),
    })
    .from(membershipPlan)
    .leftJoin(studioMembership, eq(studioMembership.planId, membershipPlan.id))
    .where(and(...conditions))
    .groupBy(membershipPlan.id)
    .orderBy(asc(membershipPlan.sortOrder));

const withMembershipCount = (row: {
  plan: typeof membershipPlan.$inferSelect;
  studioMembershipCount: number;
}) => ({
  ...row.plan,
  _count: { studioMembership: row.studioMembershipCount },
});

export const membershipPlansRouter = createTRPCRouter({
  /**
   * List all membership plans
   */
  list: protectedProcedure
    .input(
      z
        .object({
          includeInactive: z.boolean().optional().default(false),
          publicOnly: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const conditions = membershipPlanScopeConditions({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
      });
      if (!input?.includeInactive) conditions.push(eq(membershipPlan.isActive, true));
      if (input?.publicOnly) conditions.push(eq(membershipPlan.isPublic, true));

      const plans = await selectPlansWithMembershipCount(conditions);
      return plans.map(withMembershipCount);
    }),

  /**
   * Get a single plan by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const [plan] = await selectPlansWithMembershipCount([
        eq(membershipPlan.id, input.id),
        eq(membershipPlan.organizationId, ctx.orgId),
      ]);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Membership plan not found" });
      }

      return withMembershipCount(plan);
    }),

  /**
   * Create a new membership plan
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        type: z.enum([
          "UNLIMITED",
          "CLASS_PACK",
          "DROP_IN",
          "TIME_BASED",
          "TIERED",
          "INTRO_OFFER",
          "TRIAL",
        ]),
        price: z.number().min(0),
        currency: z.string().max(3).default("USD"),
        billingInterval: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"]),
        classCredits: z.number().int().min(1).optional(),
        durationDays: z.number().int().min(1).optional(),
        maxFreezeDays: z.number().int().min(0).optional(),
        allowedClassTypeIds: z.array(z.string()).optional(),
        isIntroOffer: z.boolean().optional(),
        trialDays: z.number().int().min(1).optional(),
        cancellationNoticeDays: z.number().int().min(0).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }

      const maxSort = await db.query.membershipPlan.findFirst({
        where: eq(membershipPlan.organizationId, ctx.orgId),
        orderBy: desc(membershipPlan.sortOrder),
        columns: { sortOrder: true },
      });

      const now = new Date();
      const [createdPlan] = await db
        .insert(membershipPlan)
        .values({
          id: createId(),
          name: input.name,
          description: input.description,
          type: input.type,
          price: input.price.toString(),
          currency: input.currency,
          billingInterval: input.billingInterval,
          classCredits: input.classCredits,
          durationDays: input.durationDays,
          maxFreezeDays: input.maxFreezeDays,
          allowedClassTypeIds: input.allowedClassTypeIds ?? [],
          isIntroOffer: input.isIntroOffer ?? false,
          trialDays: input.trialDays,
          cancellationNoticeDays: input.cancellationNoticeDays,
          isPublic: input.isPublic ?? true,
          sortOrder: (maxSort?.sortOrder ?? 0) + 1,
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdPlan;
    }),

  /**
   * Update a membership plan
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional().nullable(),
        type: z
          .enum(["UNLIMITED", "CLASS_PACK", "DROP_IN", "TIME_BASED", "TIERED", "INTRO_OFFER", "TRIAL"])
          .optional(),
        price: z.number().min(0).optional(),
        currency: z.string().max(3).optional(),
        billingInterval: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"]).optional(),
        classCredits: z.number().int().min(1).optional().nullable(),
        durationDays: z.number().int().min(1).optional().nullable(),
        maxFreezeDays: z.number().int().min(0).optional().nullable(),
        allowedClassTypeIds: z.array(z.string()).optional(),
        isIntroOffer: z.boolean().optional(),
        trialDays: z.number().int().min(1).optional().nullable(),
        cancellationNoticeDays: z.number().int().min(0).optional().nullable(),
        isPublic: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const { id, price, ...data } = input;

      const existing = await db.query.membershipPlan.findFirst({
        where: and(eq(membershipPlan.id, id), eq(membershipPlan.organizationId, ctx.orgId)),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Membership plan not found" });
      }

      const [updatedPlan] = await db
        .update(membershipPlan)
        .set({
          ...data,
          ...(price !== undefined ? { price: price.toString() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(membershipPlan.id, id))
        .returning();

      return updatedPlan;
    }),

  /**
   * Archive a plan (soft delete)
   */
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const existing = await db.query.membershipPlan.findFirst({
        where: and(eq(membershipPlan.id, input.id), eq(membershipPlan.organizationId, ctx.orgId)),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Membership plan not found" });
      }

      const [updatedPlan] = await db
        .update(membershipPlan)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(membershipPlan.id, input.id))
        .returning();

      return updatedPlan;
    }),
});
