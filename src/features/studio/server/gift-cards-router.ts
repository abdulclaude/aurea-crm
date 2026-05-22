import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { giftCard, studioPayment } from "@/db/schema";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { nanoid } from "nanoid";
import { triggerStudioPaymentWorkflows } from "./payment-workflow-triggers";

function generateGiftCardCode(): string {
  return nanoid(12).toUpperCase().replace(/[^A-Z0-9]/g, "0").substring(0, 12);
}

export const giftCardsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        includeRedeemed: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const cursorCard = input?.cursor
        ? await db.query.giftCard.findFirst({
            where: eq(giftCard.id, input.cursor),
            columns: { id: true, createdAt: true },
          })
        : null;

      const where = and(
        eq(giftCard.organizationId, ctx.orgId),
        ctx.locationId ? eq(giftCard.locationId, ctx.locationId) : undefined,
        !input?.includeRedeemed ? eq(giftCard.isActive, true) : undefined,
        cursorCard
          ? or(
              lt(giftCard.createdAt, cursorCard.createdAt),
              and(eq(giftCard.createdAt, cursorCard.createdAt), lt(giftCard.id, cursorCard.id))
            )
          : undefined
      );

      const cards = await db.query.giftCard.findMany({
        where,
        with: {
          client_purchasedByClientId: { columns: { id: true, name: true, email: true } },
          client_redeemedByClientId: { columns: { id: true, name: true, email: true } },
        },
        orderBy: [desc(giftCard.createdAt), desc(giftCard.id)],
        limit: (input?.limit ?? 20) + 1,
      });

      let nextCursor: string | undefined;
      if (cards.length > (input?.limit ?? 20)) {
        nextCursor = cards.pop()!.id;
      }

      return {
        cards: cards.map(({ client_purchasedByClientId, client_redeemedByClientId, ...card }) => ({
          ...card,
          purchasedBy: client_purchasedByClientId,
          redeemedBy: client_redeemedByClientId,
        })),
        nextCursor,
      };
    }),

  issue: protectedProcedure
    .input(
      z.object({
        value: z.number().positive(),
        currency: z.string().max(3).default("GBP"),
        purchasedByClientId: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      let code: string;
      let attempts = 0;
      do {
        code = generateGiftCardCode();
        const existing = await db.query.giftCard.findFirst({
          where: and(eq(giftCard.organizationId, ctx.orgId), eq(giftCard.code, code)),
          columns: { id: true },
        });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      const [card] = await db
        .insert(giftCard)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          code,
          initialValue: input.value.toString(),
          remainingBalance: input.value.toString(),
          currency: input.currency.toUpperCase(),
          purchasedByClientId: input.purchasedByClientId ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        })
        .returning();

      return card;
    }),

  validate: protectedProcedure
    .input(z.object({ code: z.string(), requiredAmount: z.number().positive().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const card = await db.query.giftCard.findFirst({
        where: and(
          eq(giftCard.organizationId, ctx.orgId),
          eq(giftCard.code, input.code.toUpperCase()),
          eq(giftCard.isActive, true)
        ),
      });

      if (!card) return { valid: false, reason: "Gift card not found" } as const;
      if (Number(card.remainingBalance) <= 0) return { valid: false, reason: "Gift card has no remaining balance" } as const;
      if (card.expiresAt && card.expiresAt < new Date()) return { valid: false, reason: "Gift card has expired" } as const;
      if (input.requiredAmount && Number(card.remainingBalance) < input.requiredAmount) {
        return {
          valid: false,
          reason: `Insufficient balance (£${Number(card.remainingBalance).toFixed(2)} remaining)`,
        } as const;
      }

      return {
        valid: true,
        card: {
          id: card.id,
          code: card.code,
          remainingBalance: Number(card.remainingBalance),
          currency: card.currency,
        },
      } as const;
    }),

  redeem: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        amountToRedeem: z.number().positive(),
        redeemedByClientId: z.string().optional(),
        membershipId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });
      const organizationId = ctx.orgId;

      const card = await db.query.giftCard.findFirst({
        where: and(
          eq(giftCard.organizationId, organizationId),
          eq(giftCard.code, input.code.toUpperCase()),
          eq(giftCard.isActive, true)
        ),
      });

      if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Gift card not found" });
      if (Number(card.remainingBalance) < input.amountToRedeem) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient gift card balance" });
      }
      if (card.expiresAt && card.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Gift card has expired" });
      }

      const newBalance = Number(card.remainingBalance) - input.amountToRedeem;

      const { updatedCard, payment } = await db.transaction(async (tx) => {
        const [updatedGiftCard] = await tx
          .update(giftCard)
          .set({
            remainingBalance: newBalance.toString(),
            isActive: newBalance > 0,
            redeemedAt: newBalance <= 0 ? new Date() : undefined,
            redeemedByClientId: input.redeemedByClientId ?? null,
            updatedAt: new Date(),
          })
          .where(eq(giftCard.id, card.id))
          .returning();

        const [createdPayment] = await tx
          .insert(studioPayment)
          .values({
            id: createId(),
            organizationId,
            locationId: ctx.locationId ?? null,
            clientId: input.redeemedByClientId ?? null,
            membershipId: input.membershipId ?? null,
            amount: input.amountToRedeem.toString(),
            currency: card.currency,
            status: "SUCCEEDED",
            type: "GIFT_CARD",
            description: `Gift card redemption: ${card.code}`,
            updatedAt: new Date(),
          })
          .returning();

        if (!updatedGiftCard || !createdPayment) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Gift card redemption could not be completed",
          });
        }

        return { updatedCard: updatedGiftCard, payment: createdPayment };
      });

      await triggerStudioPaymentWorkflows({ payment }).catch((error: unknown) => {
        console.error("Failed to trigger gift card payment workflows", error);
      });

      return { success: true, remainingBalance: Number(updatedCard.remainingBalance) };
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const card = await db.query.giftCard.findFirst({
        where: and(eq(giftCard.id, input.id), eq(giftCard.organizationId, ctx.orgId)),
      });
      if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Gift card not found" });

      const [deactivatedCard] = await db
        .update(giftCard)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(giftCard.id, card.id))
        .returning();

      return deactivatedCard;
    }),
});
