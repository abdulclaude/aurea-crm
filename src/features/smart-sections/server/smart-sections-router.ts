/**
 * Smart Sections tRPC Router
 *
 * Handles reusable block groups that can be inserted into funnels and forms
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import db from "@/lib/db";

export const smartSectionsRouter = createTRPCRouter({
  /**
   * List all smart sections for the current organization/subaccount
   */
  list: protectedProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return await db.smartSection.findMany({
        where: {
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
          ...(input?.category && { category: input.category }),
        },
        include: {
          _count: {
            select: { smartSectionInstance: true },
          },
        },
        orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
      });
    }),

  /**
   * Get a specific smart section with full structure
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const section = await db.smartSection.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
        },
        include: {
          smartSectionInstance: {
            include: {
              funnelPage: {
                select: {
                  id: true,
                  name: true,
                  funnel: { select: { id: true, name: true } },
                },
              },
              form: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: { smartSectionInstance: true },
          },
        },
      });

      if (!section) {
        throw new Error("Smart section not found");
      }

      return section;
    }),

  /**
   * Get blocks for a smart section (for visual editor)
   */
  getBlocks: protectedProcedure
    .input(z.object({ sectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const section = await db.smartSection.findFirst({
        where: {
          id: input.sectionId,
          organizationId: ctx.orgId!,
        },
      });

      if (!section) {
        throw new Error("Smart section not found");
      }

      // Get all blocks for this section
      const blocks = await db.funnelBlock.findMany({
        where: {
          smartSectionId: input.sectionId,
        },
        include: {
          funnelBreakpoint: true,
        },
        orderBy: [{ order: "asc" }],
      });

      return blocks;
    }),

  /**
   * Create a new smart section from blocks
   */
  createFromBlocks: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        thumbnail: z.string().optional(),
        blockStructure: z.array(z.record(z.any(), z.any())), // Array of block objects
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.smartSection.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description,
          category: input.category,
          thumbnail: input.thumbnail,
          blockStructure: input.blockStructure,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }),

  /**
   * Update a smart section
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        thumbnail: z.string().optional(),
        blockStructure: z.array(z.record(z.any(), z.any())).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const section = await db.smartSection.findFirst({
        where: {
          id,
          organizationId: ctx.orgId!,
        },
      });

      if (!section) {
        throw new Error("Smart section not found");
      }

      return await db.smartSection.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete a smart section (will also delete all instances in funnels/forms)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const section = await db.smartSection.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
        },
      });

      if (!section) {
        throw new Error("Smart section not found");
      }

      // Delete section - CASCADE will automatically delete all instances and container blocks
      return await db.smartSection.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Insert a smart section instance into a funnel page or form
   * Creates a container block that references the smart section
   */
  insertInstance: protectedProcedure
    .input(
      z.object({
        sectionId: z.string(),
        funnelPageId: z.string().optional(),
        formId: z.string().optional(),
        order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify section exists and belongs to org
      const section = await db.smartSection.findFirst({
        where: {
          id: input.sectionId,
          organizationId: ctx.orgId!,
        },
      });

      if (!section) {
        throw new Error("Smart section not found");
      }

      // Determine order if not provided
      let order = input.order;
      if (order === undefined && input.funnelPageId) {
        const highestOrder = await db.funnelBlock.findFirst({
          where: {
            pageId: input.funnelPageId,
            parentBlockId: null,
          },
          orderBy: { order: "desc" },
          select: { order: true },
        });
        order = (highestOrder?.order ?? -1) + 1;
      }

      // Create instance and container block in a transaction
      const result = await db.$transaction(async (tx) => {
        // Create the instance
        const instance = await tx.smartSectionInstance.create({
          data: {
            id: crypto.randomUUID(),
            sectionId: input.sectionId,
            funnelPageId: input.funnelPageId,
            formId: input.formId,
            order: order || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create a container block that represents this instance
        const containerBlock = await tx.funnelBlock.create({
          data: {
            id: crypto.randomUUID(),
            pageId: input.funnelPageId,
            smartSectionInstanceId: instance.id,
            type: "CONTAINER", // Use CONTAINER as the wrapper type
            props: {
              smartSectionRef: true, // Mark as a smart section reference
              sectionName: section.name,
            },
            styles: {
              width: "100%",
            },
            order: order || 0,
            visible: true,
            locked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Increment usage count
        await tx.smartSection.update({
          where: { id: input.sectionId },
          data: { usageCount: { increment: 1 } },
        });

        return { instance, containerBlock };
      });

      return result;
    }),

  /**
   * Remove a smart section instance
   */
  removeInstance: protectedProcedure
    .input(z.object({ instanceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const instance = await db.smartSectionInstance.findUnique({
        where: { id: input.instanceId },
        include: {
          smartSection: true,
        },
      });

      if (!instance) {
        throw new Error("Instance not found");
      }

      // Verify ownership
      if (instance.smartSection.organizationId !== ctx.orgId) {
        throw new Error("Unauthorized");
      }

      // Decrement usage count
      await db.smartSection.update({
        where: { id: instance.smartSection.id },
        data: { usageCount: { decrement: 1 } },
      });

      return await db.smartSectionInstance.delete({
        where: { id: input.instanceId },
      });
    }),

  /**
   * Get all categories
   */
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const sections = await db.smartSection.findMany({
      where: {
        organizationId: ctx.orgId!,
        subaccountId: ctx.subaccountId ?? null,
      },
      select: { category: true },
      distinct: ["category"],
    });

    return sections
      .map((s) => s.category)
      .filter((c): c is string => c !== null);
  }),
});
