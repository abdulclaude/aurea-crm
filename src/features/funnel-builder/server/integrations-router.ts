/**
 * Funnel Integrations Router
 *
 * Handles pixel tracking integrations (Meta, Google Analytics, TikTok)
 * and block-level event tracking configuration.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { PixelProvider, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
type InputJsonValue = Prisma.InputJsonValue;

export const integrationsRouter = createTRPCRouter({
  /**
   * List all pixel integrations for a funnel
   */
  listPixelIntegrations: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify funnel access
      const funnel = await prisma.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId ?? undefined,
          subaccountId: ctx.subaccountId ?? undefined,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      return prisma.funnelPixelIntegration.findMany({
        where: {
          funnelId: input.funnelId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }),

  /**
   * Create or update a pixel integration
   */
  upsertPixelIntegration: protectedProcedure
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
      const funnel = await prisma.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId ?? undefined,
          subaccountId: ctx.subaccountId ?? undefined,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Upsert integration
      return prisma.funnelPixelIntegration.upsert({
        where: {
          funnelId_provider: {
            funnelId: input.funnelId,
            provider: input.provider,
          },
        },
        create: {
          id: crypto.randomUUID(),
          funnelId: input.funnelId,
          provider: input.provider,
          pixelId: input.pixelId,
          enabled: input.enabled,
          metadata: (input.metadata || {}) as InputJsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          pixelId: input.pixelId,
          enabled: input.enabled,
          metadata: input.metadata as InputJsonValue | undefined,
        },
      });
    }),

  /**
   * Toggle pixel integration enabled/disabled
   */
  togglePixelIntegration: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access via funnel
      const integration = await prisma.funnelPixelIntegration.findUnique({
        where: { id: input.id },
        include: { funnel: true },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (
        integration.funnel.organizationId !== ctx.orgId ||
        integration.funnel.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return prisma.funnelPixelIntegration.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      });
    }),

  /**
   * Delete a pixel integration
   */
  deletePixelIntegration: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access via funnel
      const integration = await prisma.funnelPixelIntegration.findUnique({
        where: { id: input.id },
        include: { funnel: true },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (
        integration.funnel.organizationId !== ctx.orgId ||
        integration.funnel.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return prisma.funnelPixelIntegration.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Get block tracking event
   */
  getBlockEvent: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return prisma.funnelBlockEvent.findUnique({
        where: { blockId: input.blockId },
      });
    }),

  /**
   * Set block tracking event
   */
  setBlockEvent: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
        eventType: z.string(),
        eventName: z.string().optional(),
        parameters: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify block access via page -> funnel
      const block = await prisma.funnelBlock.findUnique({
        where: { id: input.blockId },
        include: {
          funnelPage: {
            include: {
              funnel: true,
            },
          },
        },
      });

      if (!block || !block.funnelPage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Block not found",
        });
      }

      if (
        block.funnelPage.funnel.organizationId !== ctx.orgId ||
        block.funnelPage.funnel.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return prisma.funnelBlockEvent.upsert({
        where: { blockId: input.blockId },
        create: {
          id: crypto.randomUUID(),
          blockId: input.blockId,
          eventType: input.eventType,
          eventName: input.eventName,
          parameters: (input.parameters || {}) as InputJsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          eventType: input.eventType,
          eventName: input.eventName,
          parameters: input.parameters as InputJsonValue | undefined,
        },
      });
    }),

  /**
   * Delete block tracking event
   */
  deleteBlockEvent: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify block access via page -> funnel
      const block = await prisma.funnelBlock.findUnique({
        where: { id: input.blockId },
        include: {
          funnelPage: {
            include: {
              funnel: true,
            },
          },
        },
      });

      if (!block || !block.funnelPage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Block not found",
        });
      }

      if (
        block.funnelPage.funnel.organizationId !== ctx.orgId ||
        block.funnelPage.funnel.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Check if event exists
      const event = await prisma.funnelBlockEvent.findUnique({
        where: { blockId: input.blockId },
      });

      if (!event) {
        return null;
      }

      return prisma.funnelBlockEvent.delete({
        where: { blockId: input.blockId },
      });
    }),
});
