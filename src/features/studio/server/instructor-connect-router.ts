import { randomUUID } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { instructor, instructorPayout } from "@/db/schema";
import { getStripeInstance } from "@/lib/stripe";

const APP_URL = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const instructorConnectRouter = createTRPCRouter({
  createOnboardingLink: protectedProcedure
    .input(z.object({ instructorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const targetInstructor = await db.query.instructor.findFirst({
        where: and(eq(instructor.id, input.instructorId), eq(instructor.organizationId, ctx.orgId)),
        columns: {
          id: true,
          name: true,
          email: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
        },
      });
      if (!targetInstructor) throw new TRPCError({ code: "NOT_FOUND", message: "Instructor not found" });

      const stripe = getStripeInstance();

      let accountId = targetInstructor.stripeAccountId;

      if (!accountId) {
        const account = await stripe.accounts.create(
          {
            type: "express",
            country: "GB",
            email: targetInstructor.email ?? undefined,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: "individual",
            metadata: { instructorId: targetInstructor.id, organizationId: ctx.orgId },
          },
          { idempotencyKey: `connect_account_${targetInstructor.id}` }
        );
        accountId = account.id;

        await db
          .update(instructor)
          .set({
            stripeAccountId: accountId,
            stripeAccountStatus: "pending_onboarding",
            updatedAt: new Date(),
          })
          .where(eq(instructor.id, targetInstructor.id));
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${APP_URL}/settings/instructors/${targetInstructor.id}/connect/refresh`,
        return_url: `${APP_URL}/settings/instructors/${targetInstructor.id}/connect/complete`,
        type: "account_onboarding",
      });

      return { url: link.url };
    }),

  getAccountStatus: protectedProcedure
    .input(z.object({ instructorId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const targetInstructor = await db.query.instructor.findFirst({
        where: and(eq(instructor.id, input.instructorId), eq(instructor.organizationId, ctx.orgId)),
        columns: {
          id: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
          stripeAccountStatus: true,
        },
      });
      if (!targetInstructor) throw new TRPCError({ code: "NOT_FOUND", message: "Instructor not found" });

      if (!targetInstructor.stripeAccountId) {
        return { connected: false, chargesEnabled: false, payoutsEnabled: false };
      }

      const stripe = getStripeInstance();
      const account = await stripe.accounts.retrieve(targetInstructor.stripeAccountId);

      const status = {
        connected: true,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
        stripeAccountId: targetInstructor.stripeAccountId,
      };

      if (status.chargesEnabled && status.payoutsEnabled && !targetInstructor.stripeOnboardingComplete) {
        await db
          .update(instructor)
          .set({
            stripeOnboardingComplete: true,
            stripeAccountStatus: "active",
            updatedAt: new Date(),
          })
          .where(eq(instructor.id, targetInstructor.id));
      }

      return status;
    }),

  createDashboardLink: protectedProcedure
    .input(z.object({ instructorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const targetInstructor = await db.query.instructor.findFirst({
        where: and(eq(instructor.id, input.instructorId), eq(instructor.organizationId, ctx.orgId)),
        columns: { stripeAccountId: true, stripeOnboardingComplete: true },
      });
      if (!targetInstructor) throw new TRPCError({ code: "NOT_FOUND", message: "Instructor not found" });
      if (!targetInstructor.stripeAccountId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Instructor has not connected Stripe" });
      }
      if (!targetInstructor.stripeOnboardingComplete) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Instructor onboarding not complete" });
      }

      const stripe = getStripeInstance();
      const loginLink = await stripe.accounts.createLoginLink(targetInstructor.stripeAccountId);
      return { url: loginLink.url };
    }),

  transferPayout: protectedProcedure
    .input(
      z.object({
        instructorId: z.string(),
        amountPence: z.number().int().positive(),
        periodStart: z.string().datetime(),
        periodEnd: z.string().datetime(),
        classesCount: z.number().int().min(0).default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const targetInstructor = await db.query.instructor.findFirst({
        where: and(eq(instructor.id, input.instructorId), eq(instructor.organizationId, ctx.orgId)),
        columns: {
          id: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
          stripeAccountStatus: true,
        },
      });
      if (!targetInstructor) throw new TRPCError({ code: "NOT_FOUND", message: "Instructor not found" });
      if (!targetInstructor.stripeAccountId || !targetInstructor.stripeOnboardingComplete) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Instructor payout account not ready. Complete Stripe onboarding first.",
        });
      }

      const stripe = getStripeInstance();
      const account = await stripe.accounts.retrieve(targetInstructor.stripeAccountId);
      if (!account.charges_enabled || !account.payouts_enabled) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Instructor Stripe account is not fully enabled for payouts",
        });
      }

      const transfer = await stripe.transfers.create(
        {
          amount: input.amountPence,
          currency: "gbp",
          destination: targetInstructor.stripeAccountId,
          metadata: {
            instructorId: targetInstructor.id,
            organizationId: ctx.orgId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
          },
        },
        { idempotencyKey: `payout_${targetInstructor.id}_${input.periodStart}_${input.periodEnd}` }
      );

      const [payout] = await db
        .insert(instructorPayout)
        .values({
          id: randomUUID(),
          instructorId: targetInstructor.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          stripeTransferId: transfer.id,
          amount: String(input.amountPence / 100),
          currency: "GBP",
          status: "PAID",
          periodStart: new Date(input.periodStart),
          periodEnd: new Date(input.periodEnd),
          classesCount: input.classesCount,
          notes: input.notes,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: instructorPayout.id });

      return { payoutId: payout.id, transferId: transfer.id };
    }),

  getPayoutHistory: protectedProcedure
    .input(
      z.object({
        instructorId: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const cursorPayout = input.cursor
        ? await db.query.instructorPayout.findFirst({
            where: and(eq(instructorPayout.id, input.cursor), eq(instructorPayout.organizationId, ctx.orgId)),
            columns: { createdAt: true },
          })
        : null;

      const payouts = await db.query.instructorPayout.findMany({
        where: and(
          eq(instructorPayout.organizationId, ctx.orgId),
          ctx.locationId ? eq(instructorPayout.locationId, ctx.locationId) : undefined,
          input.instructorId ? eq(instructorPayout.instructorId, input.instructorId) : undefined,
          isNull(instructorPayout.deletedAt),
          cursorPayout ? lt(instructorPayout.createdAt, cursorPayout.createdAt) : undefined
        ),
        with: {
          instructor: { columns: { id: true, name: true, email: true, stripeAccountId: true } },
        },
        orderBy: desc(instructorPayout.createdAt),
        limit: input.limit + 1,
      });

      let nextCursor: string | undefined;
      if (payouts.length > input.limit) {
        nextCursor = payouts.pop()!.id;
      }

      return { payouts, nextCursor };
    }),
});
