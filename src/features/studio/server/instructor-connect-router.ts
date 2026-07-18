import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { instructor, instructorPayout } from "@/db/schema";
import { getStripePlatformClient } from "@/lib/stripe";
import type { Capability } from "@/features/permissions/capabilities";
import { requireCapability } from "@/features/permissions/server/authorization";

const APP_URL = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function authorizeInstructorConnect(input: {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
  capability: Capability;
}): Promise<string> {
  if (!input.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing Stripe Connect.",
    });
  }
  await requireCapability({
    actor: {
      userId: input.userId,
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
    capability: input.capability,
    resource: {
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
  });
  return input.organizationId;
}

export const instructorConnectRouter = createTRPCRouter({
  createOnboardingLink: protectedProcedure
    .input(z.object({ instructorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeInstructorConnect({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "provider.manage",
      });

      const targetInstructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructor.id, input.instructorId),
          eq(instructor.organizationId, organizationId),
          ctx.locationId
            ? eq(instructor.locationId, ctx.locationId)
            : isNull(instructor.locationId),
        ),
        columns: {
          id: true,
          name: true,
          email: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
        },
      });
      if (!targetInstructor) throw new TRPCError({ code: "NOT_FOUND", message: "Instructor not found" });

      const stripe = getStripePlatformClient();

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
            metadata: {
              instructorId: targetInstructor.id,
              organizationId,
              ...(ctx.locationId ? { locationId: ctx.locationId } : {}),
            },
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
      const organizationId = await authorizeInstructorConnect({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "provider.manage",
      });

      const targetInstructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructor.id, input.instructorId),
          eq(instructor.organizationId, organizationId),
          ctx.locationId
            ? eq(instructor.locationId, ctx.locationId)
            : isNull(instructor.locationId),
        ),
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

      const stripe = getStripePlatformClient();
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
      const organizationId = await authorizeInstructorConnect({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "provider.manage",
      });

      const targetInstructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructor.id, input.instructorId),
          eq(instructor.organizationId, organizationId),
          ctx.locationId
            ? eq(instructor.locationId, ctx.locationId)
            : isNull(instructor.locationId),
        ),
        columns: { stripeAccountId: true, stripeOnboardingComplete: true },
      });
      if (!targetInstructor) throw new TRPCError({ code: "NOT_FOUND", message: "Instructor not found" });
      if (!targetInstructor.stripeAccountId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Instructor has not connected Stripe" });
      }
      if (!targetInstructor.stripeOnboardingComplete) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Instructor onboarding not complete" });
      }

      const stripe = getStripePlatformClient();
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
    .mutation(() => {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Manual transfers are disabled. Stripe Express pays out destination-charge earnings using the connected account's payout schedule.",
      });
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
      const organizationId = await authorizeInstructorConnect({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "commerce.view",
      });

      const cursorPayout = input.cursor
        ? await db.query.instructorPayout.findFirst({
            where: and(
              eq(instructorPayout.id, input.cursor),
              eq(instructorPayout.organizationId, organizationId),
              ctx.locationId
                ? eq(instructorPayout.locationId, ctx.locationId)
                : isNull(instructorPayout.locationId),
            ),
            columns: { createdAt: true },
          })
        : null;

      const payouts = await db.query.instructorPayout.findMany({
        where: and(
          eq(instructorPayout.organizationId, organizationId),
          ctx.locationId
            ? eq(instructorPayout.locationId, ctx.locationId)
            : isNull(instructorPayout.locationId),
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
