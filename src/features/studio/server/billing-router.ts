import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, lt, type SQL } from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";

import { db } from "@/db";
import {
  client,
  membershipPlan,
  promoCode,
  stripeConnection,
  studioMembership,
  studioPayment,
} from "@/db/schema";
import { getStripeInstance } from "@/lib/stripe";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";

const BILLING_INTERVAL_MAP = {
  WEEKLY: { interval: "week" as const, interval_count: 1 },
  MONTHLY: { interval: "month" as const, interval_count: 1 },
  QUARTERLY: { interval: "month" as const, interval_count: 3 },
  ANNUALLY: { interval: "year" as const, interval_count: 1 },
  ONE_TIME: null,
};

function planToStripeAmount(price: unknown): number {
  return Math.round(Number(price) * 100);
}

function requireOrganization(orgId: string | null): string {
  if (!orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });
  return orgId;
}

export const studioBillingRouter = createTRPCRouter({
  syncPlanWithStripe: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);

      const plan = await db.query.membershipPlan.findFirst({
        where: and(eq(membershipPlan.id, input.planId), eq(membershipPlan.organizationId, orgId)),
      });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Membership plan not found" });

      const stripe = getStripeInstance();

      let productId = plan.stripeProductId;

      if (productId) {
        await stripe.products.update(productId, {
          name: plan.name,
          description: plan.description ?? undefined,
          metadata: { planId: plan.id, organizationId: orgId },
        });
      } else {
        const product = await stripe.products.create(
          {
            name: plan.name,
            description: plan.description ?? undefined,
            metadata: { planId: plan.id, organizationId: orgId },
          },
          { idempotencyKey: `product_${plan.id}` }
        );
        productId = product.id;
      }

      const amountInPence = planToStripeAmount(plan.price);
      const intervalConfig = BILLING_INTERVAL_MAP[plan.billingInterval];
      const priceData: Stripe.PriceCreateParams = {
        product: productId,
        unit_amount: amountInPence,
        currency: (plan.currency ?? "GBP").toLowerCase(),
        metadata: { planId: plan.id },
      };

      if (intervalConfig) {
        priceData.recurring = {
          interval: intervalConfig.interval,
          interval_count: intervalConfig.interval_count,
        };
      }

      const price = await stripe.prices.create(priceData, {
        idempotencyKey: `price_${plan.id}_${amountInPence}_${plan.billingInterval}`,
      });

      if (plan.stripePriceId && plan.stripePriceId !== price.id) {
        await stripe.prices.update(plan.stripePriceId, { active: false });
      }

      await db
        .update(membershipPlan)
        .set({ stripeProductId: productId, stripePriceId: price.id, updatedAt: new Date() })
        .where(eq(membershipPlan.id, plan.id));

      return { stripeProductId: productId, stripePriceId: price.id };
    }),

  createMembershipCheckout: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        clientId: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
        promoCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);

      const [plan, targetClient] = await Promise.all([
        db.query.membershipPlan.findFirst({
          where: and(
            eq(membershipPlan.id, input.planId),
            eq(membershipPlan.organizationId, orgId),
            eq(membershipPlan.isActive, true)
          ),
        }),
        db.query.client.findFirst({
          where: and(eq(client.id, input.clientId), eq(client.organizationId, orgId)),
          columns: { id: true, email: true, name: true, stripeCustomerId: true },
        }),
      ]);

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Membership plan not found" });
      if (!targetClient) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      if (!plan.stripePriceId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Plan not synced with Stripe. Run syncPlanWithStripe first.",
        });
      }

      const stripe = getStripeInstance();

      let customerId = targetClient.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create(
          {
            email: targetClient.email ?? undefined,
            name: targetClient.name,
            metadata: { clientId: targetClient.id, organizationId: orgId },
          },
          { idempotencyKey: `customer_${targetClient.id}` }
        );
        customerId = customer.id;
        await db
          .update(client)
          .set({ stripeCustomerId: customerId, updatedAt: new Date() })
          .where(eq(client.id, targetClient.id));
      }

      let promoCodeId: string | undefined;
      if (input.promoCode) {
        const promo = await db.query.promoCode.findFirst({
          where: and(
            eq(promoCode.organizationId, orgId),
            eq(promoCode.code, input.promoCode.toUpperCase()),
            eq(promoCode.isActive, true)
          ),
        });
        if (!promo) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired promo code" });
        }
        if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Promo code has reached its redemption limit" });
        }
        if (promo.expiresAt && promo.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Promo code has expired" });
        }
        promoCodeId = promo.id;
      }

      const intervalConfig = BILLING_INTERVAL_MAP[plan.billingInterval];
      const mode = intervalConfig ? ("subscription" as const) : ("payment" as const);

      const studioConnection = await db.query.stripeConnection.findFirst({
        where: and(
          eq(stripeConnection.organizationId, orgId),
          ctx.locationId ? eq(stripeConnection.locationId, ctx.locationId) : undefined
        ),
        columns: { stripeAccountId: true, applicationFeePercent: true, chargesEnabled: true },
      });

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        mode,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          planId: plan.id,
          clientId: targetClient.id,
          organizationId: orgId,
          locationId: ctx.locationId ?? "",
          ...(promoCodeId ? { promoCodeId } : {}),
        },
        ...(mode === "subscription" && {
          subscription_data: {
            metadata: {
              planId: plan.id,
              clientId: targetClient.id,
              organizationId: orgId,
            },
          },
        }),
        ...(mode === "payment" && {
          payment_intent_data: {
            metadata: {
              planId: plan.id,
              clientId: targetClient.id,
              organizationId: orgId,
            },
            ...(studioConnection?.chargesEnabled && studioConnection.stripeAccountId
              ? {
                  transfer_data: { destination: studioConnection.stripeAccountId },
                  application_fee_amount: studioConnection.applicationFeePercent
                    ? Math.round(
                        planToStripeAmount(plan.price) *
                          (Number(studioConnection.applicationFeePercent) / 100)
                      )
                    : 0,
                }
              : {}),
          },
        }),
      };

      const session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: `checkout_${plan.id}_${targetClient.id}_${Date.now()}`,
      });

      return { sessionId: session.id, url: session.url };
    }),

  cancelMembership: protectedProcedure
    .input(
      z.object({
        membershipId: z.string(),
        cancelAtPeriodEnd: z.boolean().default(true),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);

      const membership = await db.query.studioMembership.findFirst({
        where: and(eq(studioMembership.id, input.membershipId), eq(studioMembership.organizationId, orgId)),
      });
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });

      if (membership.stripeSubscriptionId) {
        const stripe = getStripeInstance();
        if (input.cancelAtPeriodEnd) {
          await stripe.subscriptions.update(membership.stripeSubscriptionId, {
            cancel_at_period_end: true,
          });
        } else {
          await stripe.subscriptions.cancel(membership.stripeSubscriptionId);
        }
      }

      const updateData: Partial<typeof studioMembership.$inferInsert> = {
        cancelReason: input.reason,
        status: input.cancelAtPeriodEnd ? "ACTIVE" : "CANCELLED",
        updatedAt: new Date(),
      };
      if (!input.cancelAtPeriodEnd) updateData.cancelledAt = new Date();

      await db.update(studioMembership).set(updateData).where(eq(studioMembership.id, membership.id));

      return { success: true };
    }),

  getPayments: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const cursorPayment = input.cursor
        ? await db.query.studioPayment.findFirst({
            where: and(eq(studioPayment.id, input.cursor), eq(studioPayment.organizationId, orgId)),
            columns: { createdAt: true },
          })
        : null;

      const conditions: SQL[] = [
        eq(studioPayment.organizationId, orgId),
        isNull(studioPayment.deletedAt),
      ];
      if (ctx.locationId) conditions.push(eq(studioPayment.locationId, ctx.locationId));
      if (input.clientId) conditions.push(eq(studioPayment.clientId, input.clientId));
      if (cursorPayment) conditions.push(lt(studioPayment.createdAt, cursorPayment.createdAt));

      const payments = await db.query.studioPayment.findMany({
        where: and(...conditions),
        with: {
          client: { columns: { id: true, name: true, email: true } },
          studioMembership: { columns: { id: true, name: true } },
          promoCode: { columns: { id: true, code: true } },
        },
        orderBy: desc(studioPayment.createdAt),
        limit: input.limit + 1,
      });

      let nextCursor: string | undefined;
      if (payments.length > input.limit) {
        nextCursor = payments.pop()?.id;
      }

      return {
        payments: payments.map((payment) => ({
          ...payment,
          membership: payment.studioMembership,
        })),
        nextCursor,
      };
    }),
});
