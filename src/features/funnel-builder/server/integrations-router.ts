/**
 * Funnel Integrations Router
 *
 * Handles pixel tracking integrations (Meta, Google Analytics, TikTok)
 * and block-level event tracking configuration.
 */

import { z } from "zod";
import { createTRPCRouter } from "@/trpc/init";
import {
  publicationManageProcedure,
  publicationViewProcedure,
} from "@/features/permissions/server/publication-procedures";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { funnel, funnelBlock, funnelBlockEvent, funnelPixelIntegration } from "@/db/schema";
import { PixelProvider } from "@/db/enums";
import { TRPCError } from "@trpc/server";
import type { JsonObject } from "@/db/json";

export const integrationsRouter = createTRPCRouter({
  /**
   * List all pixel integrations for a funnel
   */
  listPixelIntegrations: publicationViewProcedure
    .input(
      z.object({
        funnelId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify funnel access
      const selectedFunnel = await db.query.funnel.findFirst({
        where: funnelAccessWhere(input.funnelId, ctx.orgId, ctx.locationId),
      });

      if (!selectedFunnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      return db.query.funnelPixelIntegration.findMany({
        where: eq(funnelPixelIntegration.funnelId, input.funnelId),
        orderBy: [asc(funnelPixelIntegration.createdAt)],
      });
    }),

  /**
   * Create or update a pixel integration
   */
  upsertPixelIntegration: publicationManageProcedure
    .input(
      z.object({
        funnelId: z.string(),
        provider: z.nativeEnum(PixelProvider),
        pixelId: z.string().min(1, "Pixel ID is required"),
        enabled: z.boolean().default(true),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify funnel access
      const selectedFunnel = await db.query.funnel.findFirst({
        where: funnelAccessWhere(input.funnelId, ctx.orgId, ctx.locationId),
      });

      if (!selectedFunnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      const [integration] = await db
        .insert(funnelPixelIntegration)
        .values({
          id: createId(),
          funnelId: input.funnelId,
          provider: input.provider,
          pixelId: input.pixelId,
          enabled: input.enabled,
          metadata: (input.metadata || {}) as JsonObject,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [funnelPixelIntegration.funnelId, funnelPixelIntegration.provider],
          set: {
          pixelId: input.pixelId,
          enabled: input.enabled,
          metadata: input.metadata,
          updatedAt: new Date(),
          },
        })
        .returning();

      return integration;
    }),

  /**
   * Toggle pixel integration enabled/disabled
   */
  togglePixelIntegration: publicationManageProcedure
    .input(
      z.object({
        id: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access via funnel
      const integration = await db.query.funnelPixelIntegration.findFirst({
        where: eq(funnelPixelIntegration.id, input.id),
        with: { funnel: true },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (
        integration.funnel.organizationId !== ctx.orgId ||
        integration.funnel.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const [updated] = await db
        .update(funnelPixelIntegration)
        .set({ enabled: input.enabled, updatedAt: new Date() })
        .where(eq(funnelPixelIntegration.id, input.id))
        .returning();
      return updated;
    }),

  /**
   * Delete a pixel integration
   */
  deletePixelIntegration: publicationManageProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access via funnel
      const integration = await db.query.funnelPixelIntegration.findFirst({
        where: eq(funnelPixelIntegration.id, input.id),
        with: { funnel: true },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (
        integration.funnel.organizationId !== ctx.orgId ||
        integration.funnel.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const [deleted] = await db.delete(funnelPixelIntegration).where(eq(funnelPixelIntegration.id, input.id)).returning();
      return deleted;
    }),

  /**
   * Get block tracking event
   */
  getBlockEvent: publicationViewProcedure
    .input(
      z.object({
        blockId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      await requireScopedBlock(input.blockId, ctx.orgId, ctx.locationId);
      return db.query.funnelBlockEvent.findFirst({
        where: eq(funnelBlockEvent.blockId, input.blockId),
      });
    }),

  /**
   * Set block tracking event
   */
  setBlockEvent: publicationManageProcedure
    .input(
      z.object({
        blockId: z.string(),
        eventType: z.string(),
        eventName: z.string().optional(),
        parameters: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireScopedBlock(input.blockId, ctx.orgId, ctx.locationId);

      const [event] = await db
        .insert(funnelBlockEvent)
        .values({
          id: createId(),
          blockId: input.blockId,
          eventType: input.eventType,
          eventName: input.eventName,
          parameters: (input.parameters || {}) as JsonObject,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: funnelBlockEvent.blockId,
          set: {
          eventType: input.eventType,
          eventName: input.eventName,
          parameters: input.parameters,
          updatedAt: new Date(),
          },
        })
        .returning();

      return event;
    }),

  /**
   * Delete block tracking event
   */
  deleteBlockEvent: publicationManageProcedure
    .input(
      z.object({
        blockId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireScopedBlock(input.blockId, ctx.orgId, ctx.locationId);

      // Check if event exists
      const event = await db.query.funnelBlockEvent.findFirst({
        where: eq(funnelBlockEvent.blockId, input.blockId),
      });

      if (!event) {
        return null;
      }

      const [deleted] = await db.delete(funnelBlockEvent).where(eq(funnelBlockEvent.blockId, input.blockId)).returning();
      return deleted;
    }),
});

function funnelAccessWhere(funnelId: string, organizationId: string | null, locationId: string | null) {
  return and(
    eq(funnel.id, funnelId),
    eq(funnel.organizationId, organizationId ?? ""),
    locationId ? eq(funnel.locationId, locationId) : isNull(funnel.locationId),
  );
}

async function requireScopedBlock(
  blockId: string,
  organizationId: string | null,
  locationId: string | null,
): Promise<void> {
  const block = await db.query.funnelBlock.findFirst({
    where: eq(funnelBlock.id, blockId),
    with: { funnelPage: { with: { funnel: true } } },
  });
  if (
    !block?.funnelPage?.funnel ||
    block.funnelPage.funnel.organizationId !== organizationId ||
    block.funnelPage.funnel.locationId !== locationId
  ) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Block not found" });
  }
}
