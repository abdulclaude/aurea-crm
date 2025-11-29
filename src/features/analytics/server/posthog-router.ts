import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getPostHogClient } from "@/lib/posthog/server";
import { TRPCError } from "@trpc/server";

/**
 * PostHog Analytics Router
 * Fetches data directly from PostHog API for custom analytics views
 */
export const posthogRouter = createTRPCRouter({
  /**
   * Get workflow execution statistics from PostHog
   */
  getWorkflowStats: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.string().optional().default("-30d"), // Last 30 days by default
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      if (!orgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization required",
        });
      }

      const client = getPostHogClient();
      if (!client) {
        return null;
      }

      try {
        // Note: This is a placeholder. PostHog Node SDK doesn't have a built-in query method.
        // You'll need to use PostHog's REST API directly or use their insights API
        // For now, return null and we'll fetch this data client-side or build custom aggregations
        return null;
      } catch (error) {
        console.error("Failed to fetch workflow stats from PostHog:", error);
        return null;
      }
    }),

  /**
   * Get contact analytics from PostHog
   */
  getContactStats: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.string().optional().default("-30d"),
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      if (!orgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization required",
        });
      }

      const client = getPostHogClient();
      if (!client) {
        return null;
      }

      try {
        // Placeholder - see note above
        return null;
      } catch (error) {
        console.error("Failed to fetch contact stats from PostHog:", error);
        return null;
      }
    }),

  /**
   * Get deal analytics from PostHog
   */
  getDealStats: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.string().optional().default("-30d"),
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      if (!orgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization required",
        });
      }

      const client = getPostHogClient();
      if (!client) {
        return null;
      }

      try {
        // Placeholder - see note above
        return null;
      } catch (error) {
        console.error("Failed to fetch deal stats from PostHog:", error);
        return null;
      }
    }),

  /**
   * Get user behavior analytics from PostHog
   */
  getUserBehaviorStats: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.string().optional().default("-30d"),
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      if (!orgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization required",
        });
      }

      const client = getPostHogClient();
      if (!client) {
        return null;
      }

      try {
        // Placeholder - see note above
        return null;
      } catch (error) {
        console.error("Failed to fetch user behavior stats from PostHog:", error);
        return null;
      }
    }),

  /**
   * Get event counts for a specific event type
   */
  getEventCount: protectedProcedure
    .input(
      z.object({
        event: z.string(),
        dateFrom: z.string().optional().default("-30d"),
        dateTo: z.string().optional(),
        properties: z.record(z.unknown()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      if (!orgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization required",
        });
      }

      // This would need to be implemented using PostHog's REST API
      // The Node SDK doesn't support querying events directly
      return { count: 0 };
    }),
});
