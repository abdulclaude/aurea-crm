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
import {
  syncStripeConnectAccount,
  disconnectStripeConnectAccount,
} from "@/lib/stripe";

export const stripeConnectRouter = createTRPCRouter({
  // Get connection status for current location/organization
  getConnection: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.locationId && !ctx.orgId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization or location context required",
      });
    }

    const connection = await db.query.stripeConnection.findFirst({
      where: stripeConnectionScopeWhere(ctx.orgId, ctx.locationId),
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
      applicationFeePercent: connection.applicationFeePercent?.toString() || null,
      applicationFeeFixed: connection.applicationFeeFixed?.toString() || null,
      lastSyncedAt: connection.lastSyncedAt,
      createdAt: connection.createdAt,
    };
  }),

  // Sync account info from Stripe
  syncAccount: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.locationId && !ctx.orgId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization or location context required",
      });
    }

    const connection = await db.query.stripeConnection.findFirst({
      where: stripeConnectionScopeWhere(ctx.orgId, ctx.locationId),
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
    if (!ctx.locationId && !ctx.orgId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization or location context required",
      });
    }

    const connection = await db.query.stripeConnection.findFirst({
      where: stripeConnectionScopeWhere(ctx.orgId, ctx.locationId),
    });

    if (!connection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No Stripe Connect account found",
      });
    }

    // Disconnect from Stripe
    const result = await disconnectStripeConnectAccount(connection.stripeAccountId);

    if (!result.success) {
      console.error("Failed to disconnect from Stripe:", result.error);
      // Continue with local disconnect even if Stripe call fails
    }

    // Mark as inactive in database (don't delete to preserve history)
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.locationId && !ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization or location context required",
        });
      }

      const connection = await db.query.stripeConnection.findFirst({
        where: stripeConnectionScopeWhere(ctx.orgId, ctx.locationId),
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
          applicationFeePercent: input.applicationFeePercent === undefined ? null : String(input.applicationFeePercent),
          applicationFeeFixed: input.applicationFeeFixed === undefined ? null : String(input.applicationFeeFixed),
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
        applicationFeePercent: updated.applicationFeePercent?.toString() || null,
        applicationFeeFixed: updated.applicationFeeFixed?.toString() || null,
      };
    }),
});

function stripeConnectionScopeWhere(organizationId: string | null, locationId: string | null): SQL | undefined {
  return locationId
    ? eq(stripeConnection.locationId, locationId)
    : and(eq(stripeConnection.organizationId, organizationId ?? ""), isNull(stripeConnection.locationId));
}
