import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { client, introOffer, introOfferRedemption } from "@/db/schema";
import { NodeType } from "@/db/enums";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";
import {
  regionalCurrencySchema,
  resolveRegionalCurrency,
} from "@/lib/regional-context/contracts";
import { getRegionalContext } from "@/lib/regional-context/server";

const withRedemptionCount = (row: {
  offer: typeof introOffer.$inferSelect;
  redemptionCount: number;
}) => ({
  ...row.offer,
  _count: { redemptions: row.redemptionCount },
});

function introOfferScope(organizationId: string, locationId: string | null) {
  return and(
    eq(introOffer.organizationId, organizationId),
    locationId
      ? eq(introOffer.locationId, locationId)
      : isNull(introOffer.locationId),
  );
}

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
          introOfferScope(ctx.orgId, ctx.locationId),
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
        currency: regionalCurrencySchema.optional(),
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
      const regionalContext = await getRegionalContext({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      const now = new Date();
      const [createdOffer] = await db
        .insert(introOffer)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          ...input,
          currency: resolveRegionalCurrency(
            input.currency,
            regionalContext.currency,
          ),
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
        where: and(
          eq(introOffer.id, id),
          introOfferScope(ctx.orgId, ctx.locationId),
        ),
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
        .where(and(eq(introOffer.id, id), introOfferScope(ctx.orgId, ctx.locationId)))
        .returning();

      return updatedOffer;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const offer = await db.query.introOffer.findFirst({
        where: and(
          eq(introOffer.id, input.id),
          introOfferScope(ctx.orgId, ctx.locationId),
        ),
      });

      if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "Offer not found" });

      const [deletedOffer] = await db
        .delete(introOffer)
        .where(
          and(
            eq(introOffer.id, input.id),
            introOfferScope(ctx.orgId, ctx.locationId),
          ),
        )
        .returning();

      return deletedOffer;
    }),

  getPublicOffers: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }
      return db.query.introOffer.findMany({
        where: and(
          introOfferScope(ctx.orgId, ctx.locationId),
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

  redeem: protectedProcedure
    .input(
      z.object({
        offerId: z.string(),
        clientId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }
      const organizationId = ctx.orgId;
      const result = await db.transaction(async (tx) => {
        const [offer] = await tx
          .select()
          .from(introOffer)
          .where(
            and(
              eq(introOffer.id, input.offerId),
              introOfferScope(organizationId, ctx.locationId),
              eq(introOffer.isActive, true),
            ),
          )
          .limit(1)
          .for("update");
        if (!offer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Offer not found or inactive",
          });
        }
        if (
          offer.maxRedemptions &&
          offer.redemptionCount >= offer.maxRedemptions
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Offer fully redeemed",
          });
        }
        const [selectedClient] = await tx
          .select({
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            tags: client.tags,
            acquisitionStage: client.acquisitionStage,
            attendanceCount: client.attendanceCount,
            currentStreak: client.currentStreak,
          })
          .from(client)
          .where(
            and(
              eq(client.id, input.clientId),
              eq(client.organizationId, organizationId),
              ctx.locationId
                ? eq(client.locationId, ctx.locationId)
                : isNull(client.locationId),
            ),
          )
          .limit(1);
        if (!selectedClient) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        const [existing] = await tx
          .select({ id: introOfferRedemption.id })
          .from(introOfferRedemption)
          .where(
            and(
              eq(introOfferRedemption.offerId, input.offerId),
              eq(introOfferRedemption.clientId, input.clientId),
            ),
          )
          .limit(1);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Already redeemed this offer",
          });
        }
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + offer.durationDays);
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
          .where(
            and(
              eq(introOffer.id, input.offerId),
              introOfferScope(organizationId, ctx.locationId),
            ),
          );

        return { redemption: createdRedemption, offer, selectedClient };
      });

      await triggerWorkflowsForNodeType({
        nodeType: NodeType.INTRO_OFFER_REDEEMED_TRIGGER,
        organizationId: result.offer.organizationId,
        locationId: result.offer.locationId,
        triggerData: {
          redemptionId: result.redemption.id,
          offerId: result.offer.id,
          offerName: result.offer.name,
          clientId: input.clientId,
          client: result.selectedClient,
          redeemedAt: result.redemption.redeemedAt.toISOString(),
          expiresAt: result.redemption.expiresAt.toISOString(),
          status: result.redemption.status,
        },
      }).catch((error: unknown) => {
        console.error("Failed to trigger intro offer workflows", error);
      });

      return result.redemption;
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
            ctx.locationId
              ? eq(introOffer.locationId, ctx.locationId)
              : isNull(introOffer.locationId),
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
