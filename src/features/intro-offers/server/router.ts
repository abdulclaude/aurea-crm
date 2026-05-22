import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { client, introOffer, introOfferRedemption } from "@/db/schema";
import { NodeType } from "@/db/enums";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

const withRedemptionCount = (row: {
  offer: typeof introOffer.$inferSelect;
  redemptionCount: number;
}) => ({
  ...row.offer,
  _count: { redemptions: row.redemptionCount },
});

export const introOffersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    const offers = await db
      .select({
        offer: introOffer,
        redemptionCount: count(introOfferRedemption.id),
      })
      .from(introOffer)
      .leftJoin(introOfferRedemption, eq(introOfferRedemption.offerId, introOffer.id))
      .where(
        and(
          eq(introOffer.organizationId, ctx.orgId),
          ...(ctx.locationId ? [eq(introOffer.locationId, ctx.locationId)] : [])
        )
      )
      .groupBy(introOffer.id)
      .orderBy(desc(introOffer.createdAt));

    return offers.map(withRedemptionCount);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        offerType: z.enum(["TRIAL_CLASSES", "UNLIMITED_TRIAL", "DISCOUNTED_PACK", "FREE_CLASS", "FIRST_MONTH_DISCOUNT"]),
        price: z.number().min(0),
        originalPrice: z.number().optional(),
        currency: z.string().default("GBP"),
        durationDays: z.number().int().min(1).max(90).default(7),
        classCredits: z.number().int().min(1).optional(),
        allowedClassTypes: z.array(z.string()).default([]),
        maxRedemptions: z.number().int().min(1).optional(),
        displayOnWidget: z.boolean().default(true),
        followUpPlanId: z.string().optional(),
        autoConvert: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const now = new Date();
      const [createdOffer] = await db
        .insert(introOffer)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          ...input,
          price: input.price.toString(),
          originalPrice: input.originalPrice?.toString(),
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdOffer;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price: z.number().min(0).optional(),
        originalPrice: z.number().optional(),
        durationDays: z.number().int().min(1).max(90).optional(),
        classCredits: z.number().int().min(1).optional(),
        allowedClassTypes: z.array(z.string()).optional(),
        maxRedemptions: z.number().int().min(1).optional(),
        displayOnWidget: z.boolean().optional(),
        followUpPlanId: z.string().nullable().optional(),
        autoConvert: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const { id, price, originalPrice, ...data } = input;

      const offer = await db.query.introOffer.findFirst({
        where: and(eq(introOffer.id, id), eq(introOffer.organizationId, ctx.orgId)),
      });

      if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "Offer not found" });

      const [updatedOffer] = await db
        .update(introOffer)
        .set({
          ...data,
          ...(price !== undefined ? { price: price.toString() } : {}),
          ...(originalPrice !== undefined ? { originalPrice: originalPrice?.toString() ?? null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(introOffer.id, id))
        .returning();

      return updatedOffer;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const offer = await db.query.introOffer.findFirst({
        where: and(eq(introOffer.id, input.id), eq(introOffer.organizationId, ctx.orgId)),
      });

      if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "Offer not found" });

      const [deletedOffer] = await db
        .delete(introOffer)
        .where(eq(introOffer.id, input.id))
        .returning();

      return deletedOffer;
    }),

  getPublicOffers: baseProcedure
    .input(z.object({ organizationId: z.string(), locationId: z.string().optional() }))
    .query(async ({ input }) => {
      return db.query.introOffer.findMany({
        where: and(
          eq(introOffer.organizationId, input.organizationId),
          ...(input.locationId ? [eq(introOffer.locationId, input.locationId)] : []),
          eq(introOffer.isActive, true),
          eq(introOffer.displayOnWidget, true),
          sql`${introOffer.maxRedemptions} IS NULL OR ${introOffer.redemptionCount} < ${introOffer.maxRedemptions}`
        ),
        columns: {
          id: true,
          name: true,
          description: true,
          offerType: true,
          price: true,
          originalPrice: true,
          currency: true,
          durationDays: true,
          classCredits: true,
        },
        orderBy: asc(introOffer.price),
      });
    }),

  redeem: baseProcedure
    .input(
      z.object({
        offerId: z.string(),
        clientId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const offer = await db.query.introOffer.findFirst({
        where: and(eq(introOffer.id, input.offerId), eq(introOffer.isActive, true)),
      });

      if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "Offer not found or inactive" });

      if (offer.maxRedemptions && offer.redemptionCount >= offer.maxRedemptions) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Offer fully redeemed" });
      }

      const existing = await db.query.introOfferRedemption.findFirst({
        where: and(eq(introOfferRedemption.offerId, input.offerId), eq(introOfferRedemption.clientId, input.clientId)),
      });

      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Already redeemed this offer" });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + offer.durationDays);

      const redemption = await db.transaction(async (tx) => {
        const [createdRedemption] = await tx
          .insert(introOfferRedemption)
          .values({
            id: createId(),
            offerId: input.offerId,
            clientId: input.clientId,
            expiresAt,
            status: "ACTIVE",
          })
          .returning();

        await tx
          .update(introOffer)
          .set({
            redemptionCount: sql`${introOffer.redemptionCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(introOffer.id, input.offerId));

        return createdRedemption;
      });

      const redeemedClient = await db.query.client.findFirst({
        where: and(eq(client.id, input.clientId), eq(client.organizationId, offer.organizationId)),
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          tags: true,
          acquisitionStage: true,
          attendanceCount: true,
          currentStreak: true,
        },
      });

      await triggerWorkflowsForNodeType({
        nodeType: NodeType.INTRO_OFFER_REDEEMED_TRIGGER,
        organizationId: offer.organizationId,
        locationId: offer.locationId,
        triggerData: {
          redemptionId: redemption.id,
          offerId: offer.id,
          offerName: offer.name,
          clientId: input.clientId,
          client: redeemedClient,
          redeemedAt: redemption.redeemedAt.toISOString(),
          expiresAt: redemption.expiresAt.toISOString(),
          status: redemption.status,
        },
      }).catch((error: unknown) => {
        console.error("Failed to trigger intro offer workflows", error);
      });

      return redemption;
    }),

  getRedemptions: protectedProcedure
    .input(z.object({ offerId: z.string().optional(), clientId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const rows = await db
        .select({
          redemption: introOfferRedemption,
          offerName: introOffer.name,
          offerType: introOffer.offerType,
        })
        .from(introOfferRedemption)
        .innerJoin(introOffer, eq(introOfferRedemption.offerId, introOffer.id))
        .where(
          and(
            eq(introOffer.organizationId, ctx.orgId),
            ...(input.offerId ? [eq(introOfferRedemption.offerId, input.offerId)] : []),
            ...(input.clientId ? [eq(introOfferRedemption.clientId, input.clientId)] : [])
          )
        )
        .orderBy(desc(introOfferRedemption.redeemedAt));

      return rows.map(({ redemption, offerName, offerType }) => ({
        ...redemption,
        offer: { name: offerName, offerType },
      }));
    }),
});
