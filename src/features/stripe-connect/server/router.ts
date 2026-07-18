/**
 * Stripe Connect tRPC Router
 * Manages Stripe Connect account connections and settings
 */

import { TRPCError } from "@trpc/server";
import z from "zod";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { stripeConnection } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { syncStripeConnectAccount } from "@/lib/stripe";
import {
  authorizeStripeConnectContext,
  type StripeConnectContext,
} from "./authorization";
import {
  createStripeConnectOnboardingLink,
  StripeConnectMigrationRequiredError,
} from "./onboarding";
import { StripeAccountAlreadyBoundError } from "./upsert-connection";

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function authorizeStripeMutation(ctx: {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
}): Promise<StripeConnectContext> {
  return authorizeStripeConnectContext({
    userId: ctx.auth.user.id,
    organizationId: ctx.orgId,
    locationId: ctx.locationId,
    capability: "provider.manage",
  });
}

async function authorizeStripeView(ctx: {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
}): Promise<StripeConnectContext> {
  return authorizeStripeConnectContext({
    userId: ctx.auth.user.id,
    organizationId: ctx.orgId,
    locationId: ctx.locationId,
    capability: "commerce.view",
  });
}

export const stripeConnectRouter = createTRPCRouter({
  createOnboardingLink: protectedProcedure
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      const context = await authorizeStripeMutation(ctx);

      try {
        const url = await createStripeConnectOnboardingLink(
          context,
          getAppUrl(),
        );
        return { url };
      } catch (error) {
        if (error instanceof StripeConnectMigrationRequiredError) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: error.message,
          });
        }
        if (error instanceof StripeAccountAlreadyBoundError) {
          throw new TRPCError({ code: "CONFLICT", message: error.message });
        }

        console.error("[stripe-connect.onboarding] Failed to create link", {
          organizationId: context.organizationId,
          locationId: context.locationId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to start Stripe onboarding",
        });
      }
    }),

  // Get connection status for current location/organization
  getConnection: protectedProcedure.query(async ({ ctx }) => {
    const scope = await authorizeStripeView(ctx);

    const connection = await db.query.stripeConnection.findFirst({
      where: stripeConnectionScopeWhere(scope.organizationId, scope.locationId),
    });

    if (!connection) {
      return null;
    }

    return {
      id: connection.id,
      stripeAccountId: connection.stripeAccountId,
      accountType: connection.accountType,
      isActive: connection.isActive,
      chargesEnabled: connection.chargesEnabled,
      payoutsEnabled: connection.payoutsEnabled,
      detailsSubmitted: connection.detailsSubmitted,
      email: connection.email,
      businessName: connection.businessName,
      country: connection.country,
      currency: connection.currency,
      applicationFeePercent:
        connection.applicationFeePercent?.toString() || null,
      applicationFeeFixed: connection.applicationFeeFixed?.toString() || null,
      lastSyncedAt: connection.lastSyncedAt,
      createdAt: connection.createdAt,
    };
  }),

  // Sync account info from Stripe
  syncAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const scope = await authorizeStripeMutation(ctx);

    const connection = await db.query.stripeConnection.findFirst({
      where: stripeConnectionScopeWhere(scope.organizationId, scope.locationId),
    });

    if (!connection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No Stripe Connect account found",
      });
    }

    // Fetch latest info from Stripe
    const result = await syncStripeConnectAccount(connection.stripeAccountId);

    if (!result.success || !result.account) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result.error || "Failed to sync account",
      });
    }

    // Update database
    const [updated] = await db
      .update(stripeConnection)
      .set({
        chargesEnabled: result.account.chargesEnabled,
        payoutsEnabled: result.account.payoutsEnabled,
        detailsSubmitted: result.account.detailsSubmitted,
        email: result.account.email,
        businessName: result.account.businessName,
        country: result.account.country,
        currency: result.account.currency,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stripeConnection.id, connection.id))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update Stripe Connect account",
      });
    }

    return {
      success: true,
      connection: {
        id: updated.id,
        chargesEnabled: updated.chargesEnabled,
        payoutsEnabled: updated.payoutsEnabled,
        detailsSubmitted: updated.detailsSubmitted,
        lastSyncedAt: updated.lastSyncedAt,
      },
    };
  }),

  // Disconnect Stripe account
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const scope = await authorizeStripeMutation(ctx);

    const connection = await db.query.stripeConnection.findFirst({
      where: stripeConnectionScopeWhere(scope.organizationId, scope.locationId),
    });

    if (!connection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No Stripe Connect account found",
      });
    }

    // Keep the Express account and financial history intact. Reconnecting
    // creates a fresh hosted onboarding link for this same account.
    await db
      .update(stripeConnection)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(stripeConnection.id, connection.id));

    return { success: true };
  }),

  // Update application fee settings
  updateFeeSettings: protectedProcedure
    .input(
      z.object({
        applicationFeePercent: z.number().min(0).max(100).optional(),
        applicationFeeFixed: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await authorizeStripeMutation(ctx);

      const connection = await db.query.stripeConnection.findFirst({
        where: stripeConnectionScopeWhere(
          scope.organizationId,
          scope.locationId,
        ),
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No Stripe Connect account found",
        });
      }

      // Update fee settings
      const [updated] = await db
        .update(stripeConnection)
        .set({
          applicationFeePercent:
            input.applicationFeePercent === undefined
              ? null
              : String(input.applicationFeePercent),
          applicationFeeFixed:
            input.applicationFeeFixed === undefined
              ? null
              : String(input.applicationFeeFixed),
          updatedAt: new Date(),
        })
        .where(eq(stripeConnection.id, connection.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update fee settings",
        });
      }

      return {
        success: true,
        applicationFeePercent:
          updated.applicationFeePercent?.toString() || null,
        applicationFeeFixed: updated.applicationFeeFixed?.toString() || null,
      };
    }),
});

function stripeConnectionScopeWhere(
  organizationId: string,
  locationId: string | null,
): SQL {
  return locationId
    ? and(
        eq(stripeConnection.organizationId, organizationId),
        eq(stripeConnection.locationId, locationId),
        eq(stripeConnection.isActive, true),
      )!
    : and(
        eq(stripeConnection.organizationId, organizationId),
        isNull(stripeConnection.locationId),
        eq(stripeConnection.isActive, true),
      )!;
}
