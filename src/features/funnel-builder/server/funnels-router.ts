import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import db from "@/lib/db";
import { FunnelStatus, FunnelBlockType, DeviceType, FunnelDomainType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

type InputJsonValue = Prisma.InputJsonValue;

const FUNNEL_PAGE_SIZE = 20;

export const funnelsRouter = createTRPCRouter({
  // ========================================
  // FUNNEL OPERATIONS
  // ========================================

  /**
   * List all funnels for current organization/subaccount
   */
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(FUNNEL_PAGE_SIZE),
        status: z.nativeEnum(FunnelStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const where = {
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
        ...(input.status && { status: input.status }),
      };

      const funnels = await db.funnel.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { funnelPage: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (funnels.length > input.limit) {
        const nextItem = funnels.pop();
        nextCursor = nextItem?.id;
      }

      return {
        funnels,
        nextCursor,
      };
    }),

  /**
   * Get a single funnel by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const funnel = await db.funnel.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
        include: {
          funnelPage: {
            orderBy: { order: "asc" },
          },
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      return funnel;
    }),

  /**
   * Create a new funnel
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const funnel = await db.funnel.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId,
          status: FunnelStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return funnel;
    }),

  /**
   * Update funnel metadata
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.nativeEnum(FunnelStatus).optional(),
        domainType: z.nativeEnum(FunnelDomainType).optional(),
        subdomain: z.string().nullable().optional(),
        customDomain: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const funnel = await db.funnel.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Check subdomain uniqueness if changing subdomain
      if (input.subdomain && input.subdomain !== funnel.subdomain) {
        const existingSubdomain = await db.funnel.findFirst({
          where: {
            subdomain: input.subdomain,
            id: { not: input.id },
          },
        });

        if (existingSubdomain) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This subdomain is already in use",
          });
        }
      }

      // Check custom domain uniqueness if changing custom domain
      if (input.customDomain && input.customDomain !== funnel.customDomain) {
        const existingCustomDomain = await db.funnel.findFirst({
          where: {
            customDomain: input.customDomain,
            id: { not: input.id },
          },
        });

        if (existingCustomDomain) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This custom domain is already in use",
          });
        }
      }

      const updated = await db.funnel.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.status && {
            status: input.status,
            ...(input.status === FunnelStatus.PUBLISHED && {
              publishedAt: new Date(),
            }),
          }),
          ...(input.domainType && { domainType: input.domainType }),
          ...(input.subdomain !== undefined && { subdomain: input.subdomain }),
          ...(input.customDomain !== undefined && {
            customDomain: input.customDomain,
            // Reset verification when custom domain changes
            ...(input.customDomain !== funnel.customDomain && {
              domainVerified: false,
            }),
          }),
        },
      });

      return updated;
    }),

  /**
   * Delete a funnel (cascade deletes pages and blocks)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const funnel = await db.funnel.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      await db.funnel.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ========================================
  // PAGE OPERATIONS
  // ========================================

  /**
   * List pages for a funnel
   */
  listPages: protectedProcedure
    .input(z.object({ funnelId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Verify funnel access
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      const pages = await db.funnelPage.findMany({
        where: { funnelId: input.funnelId },
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: { funnelBlock: true },
          },
        },
      });

      return pages;
    }),

  /**
   * Get a single page with all blocks
   */
  getPage: protectedProcedure
    .input(z.object({ pageId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const page = await db.funnelPage.findFirst({
        where: {
          id: input.pageId,
          funnel: {
            organizationId: ctx.orgId,
            subaccountId: ctx.subaccountId ?? null,
          },
        },
        include: {
          funnel: true,
          funnelBlock: {
            orderBy: { order: "asc" },
            include: {
              funnelBreakpoint: true,
              smartSectionInstance: {
                include: {
                  smartSection: true,
                },
              },
            },
          },
        },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      return page;
    }),

  /**
   * Create a new page
   */
  createPage: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(255),
        duplicateFromPageId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Verify funnel access
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Check for slug uniqueness within funnel
      const existingPage = await db.funnelPage.findFirst({
        where: {
          funnelId: input.funnelId,
          slug: input.slug,
        },
      });

      if (existingPage) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Page with this slug already exists",
        });
      }

      // Get the highest order number
      const highestOrder = await db.funnelPage.findFirst({
        where: { funnelId: input.funnelId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = (highestOrder?.order ?? -1) + 1;

      // If duplicating, copy blocks from source page
      if (input.duplicateFromPageId) {
        const sourcePage = await db.funnelPage.findFirst({
          where: {
            id: input.duplicateFromPageId,
            funnelId: input.funnelId,
          },
          include: {
            funnelBlock: {
              include: {
                funnelBreakpoint: true,
              },
            },
          },
        });

        if (!sourcePage) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Source page not found",
          });
        }

        // Create page with blocks in a transaction
        const page = await db.$transaction(async (tx) => {
          const newPage = await tx.funnelPage.create({
            data: {
              id: crypto.randomUUID(),
              funnelId: input.funnelId,
              name: input.name,
              slug: input.slug,
              order: newOrder,
              metaTitle: sourcePage.metaTitle,
              metaDescription: sourcePage.metaDescription,
              metaImage: sourcePage.metaImage,
              customCss: sourcePage.customCss,
              customJs: sourcePage.customJs,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Map old block IDs to new block IDs for maintaining parent relationships
          const blockIdMap = new Map<string, string>();

          // First pass: Create all blocks
          for (const block of sourcePage.funnelBlock) {
            const newBlock = await tx.funnelBlock.create({
              data: {
                id: crypto.randomUUID(),
                pageId: newPage.id,
                type: block.type,
                props: block.props as InputJsonValue,
                styles: block.styles as InputJsonValue,
                order: block.order,
                visible: block.visible,
                locked: block.locked,
                targetWorkflowId: block.targetWorkflowId,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            blockIdMap.set(block.id, newBlock.id);

            // Copy breakpoints
            for (const breakpoint of block.funnelBreakpoint) {
              await tx.funnelBreakpoint.create({
                data: {
                  id: crypto.randomUUID(),
                  blockId: newBlock.id,
                  device: breakpoint.device,
                  styles: breakpoint.styles as InputJsonValue,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
            }
          }

          // Second pass: Update parent relationships
          for (const block of sourcePage.funnelBlock) {
            if (block.parentBlockId) {
              const newBlockId = blockIdMap.get(block.id);
              const newParentId = blockIdMap.get(block.parentBlockId);

              if (newBlockId && newParentId) {
                await tx.funnelBlock.update({
                  where: { id: newBlockId },
                  data: { parentBlockId: newParentId },
                });
              }
            }
          }

          return newPage;
        });

        return page;
      }

      // Create empty page
      const page = await db.funnelPage.create({
        data: {
          id: crypto.randomUUID(),
          funnelId: input.funnelId,
          name: input.name,
          slug: input.slug,
          order: newOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return page;
    }),

  /**
   * Update page metadata
   */
  updatePage: protectedProcedure
    .input(
      z.object({
        pageId: z.string(),
        name: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(255).optional(),
        isPublished: z.boolean().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaImage: z.string().optional(),
        customCss: z.string().optional(),
        customJs: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const page = await db.funnelPage.findFirst({
        where: {
          id: input.pageId,
          funnel: {
            organizationId: ctx.orgId,
            subaccountId: ctx.subaccountId ?? null,
          },
        },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      // Check slug uniqueness if changing
      if (input.slug && input.slug !== page.slug) {
        const existingPage = await db.funnelPage.findFirst({
          where: {
            funnelId: page.funnelId,
            slug: input.slug,
            id: { not: input.pageId },
          },
        });

        if (existingPage) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Page with this slug already exists",
          });
        }
      }

      const updated = await db.funnelPage.update({
        where: { id: input.pageId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.slug && { slug: input.slug }),
          ...(input.isPublished !== undefined && {
            isPublished: input.isPublished,
          }),
          ...(input.metaTitle !== undefined && { metaTitle: input.metaTitle }),
          ...(input.metaDescription !== undefined && {
            metaDescription: input.metaDescription,
          }),
          ...(input.metaImage !== undefined && { metaImage: input.metaImage }),
          ...(input.customCss !== undefined && { customCss: input.customCss }),
          ...(input.customJs !== undefined && { customJs: input.customJs }),
        },
      });

      return updated;
    }),

  /**
   * Reorder pages
   */
  reorderPages: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        pageIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      await db.$transaction(
        input.pageIds.map((pageId, index) =>
          db.funnelPage.update({
            where: { id: pageId },
            data: { order: index },
          })
        )
      );

      return { success: true };
    }),

  /**
   * Delete a page
   */
  deletePage: protectedProcedure
    .input(z.object({ pageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const page = await db.funnelPage.findFirst({
        where: {
          id: input.pageId,
          funnel: {
            organizationId: ctx.orgId,
            subaccountId: ctx.subaccountId ?? null,
          },
        },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      await db.funnelPage.delete({
        where: { id: input.pageId },
      });

      return { success: true };
    }),

  // ========================================
  // BLOCK OPERATIONS
  // ========================================

  /**
   * Create a new block (supports both funnel pages and smart sections)
   */
  createBlock: protectedProcedure
    .input(
      z.object({
        pageId: z.string().optional(),
        smartSectionId: z.string().optional(),
        type: z.nativeEnum(FunnelBlockType),
        parentBlockId: z.string().optional(),
        props: z.record(z.any(), z.any()).optional(),
        styles: z.record(z.any(), z.any()).optional(),
        order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Must have either pageId or smartSectionId
      if (!input.pageId && !input.smartSectionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either pageId or smartSectionId is required",
        });
      }

      // Verify access
      if (input.pageId) {
        const page = await db.funnelPage.findFirst({
          where: {
            id: input.pageId,
            funnel: {
              organizationId: ctx.orgId,
              subaccountId: ctx.subaccountId ?? null,
            },
          },
        });

        if (!page) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Page not found",
          });
        }
      } else if (input.smartSectionId) {
        const section = await db.smartSection.findFirst({
          where: {
            id: input.smartSectionId,
            organizationId: ctx.orgId,
          },
        });

        if (!section) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Smart section not found",
          });
        }
      }

      // If no order specified, append to end
      let order = input.order;
      if (order === undefined) {
        const highestOrder = await db.funnelBlock.findFirst({
          where: {
            ...(input.pageId ? { pageId: input.pageId } : { smartSectionId: input.smartSectionId }),
            parentBlockId: input.parentBlockId ?? null,
          },
          orderBy: { order: "desc" },
          select: { order: true },
        });
        order = (highestOrder?.order ?? -1) + 1;
      }

      const block = await db.funnelBlock.create({
        data: {
          id: crypto.randomUUID(),
          pageId: input.pageId || null,
          smartSectionId: input.smartSectionId || null,
          type: input.type,
          parentBlockId: input.parentBlockId,
          props: input.props ?? {},
          styles: input.styles ?? {},
          order,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          funnelBreakpoint: true,
        },
      });

      return block;
    }),

  /**
   * Update a block
   */
  updateBlock: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
        props: z.record(z.any(), z.any()).optional(),
        styles: z.record(z.any(), z.any()).optional(),
        visible: z.boolean().optional(),
        locked: z.boolean().optional(),
        targetWorkflowId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Find block - could be in a funnel page OR a smart section
      const block = await db.funnelBlock.findFirst({
        where: {
          id: input.blockId,
          OR: [
            // Block in funnel page
            {
              funnelPage: {
                funnel: {
                  organizationId: ctx.orgId,
                  subaccountId: ctx.subaccountId ?? null,
                },
              },
            },
            // Block in smart section
            {
              smartSection: {
                organizationId: ctx.orgId,
                subaccountId: ctx.subaccountId ?? null,
              },
            },
          ],
        },
      });

      if (!block) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Block not found",
        });
      }

      const updated = await db.funnelBlock.update({
        where: { id: input.blockId },
        data: {
          ...(input.props && { props: input.props }),
          ...(input.styles && { styles: input.styles }),
          ...(input.visible !== undefined && { visible: input.visible }),
          ...(input.locked !== undefined && { locked: input.locked }),
          ...(input.targetWorkflowId !== undefined && {
            targetWorkflowId: input.targetWorkflowId,
          }),
        },
        include: {
          funnelBreakpoint: true,
        },
      });

      return updated;
    }),

  /**
   * Move block (change parent or reorder)
   */
  moveBlock: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
        newParentBlockId: z.string().optional().nullable(),
        newOrder: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Find block - could be in a funnel page OR a smart section
      const block = await db.funnelBlock.findFirst({
        where: {
          id: input.blockId,
          OR: [
            // Block in funnel page
            {
              funnelPage: {
                funnel: {
                  organizationId: ctx.orgId,
                  subaccountId: ctx.subaccountId ?? null,
                },
              },
            },
            // Block in smart section
            {
              smartSection: {
                organizationId: ctx.orgId,
                subaccountId: ctx.subaccountId ?? null,
              },
            },
          ],
        },
      });

      if (!block) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Block not found",
        });
      }

      const updated = await db.funnelBlock.update({
        where: { id: input.blockId },
        data: {
          parentBlockId: input.newParentBlockId,
          order: input.newOrder,
        },
        include: {
          funnelBreakpoint: true,
        },
      });

      return updated;
    }),

  /**
   * Delete a block
   */
  deleteBlock: protectedProcedure
    .input(z.object({ blockId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Find block - could be in a funnel page OR a smart section
      const block = await db.funnelBlock.findFirst({
        where: {
          id: input.blockId,
          OR: [
            // Block in funnel page
            {
              funnelPage: {
                funnel: {
                  organizationId: ctx.orgId,
                  subaccountId: ctx.subaccountId ?? null,
                },
              },
            },
            // Block in smart section
            {
              smartSection: {
                organizationId: ctx.orgId,
                subaccountId: ctx.subaccountId ?? null,
              },
            },
          ],
        },
      });

      if (!block) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Block not found",
        });
      }

      await db.funnelBlock.delete({
        where: { id: input.blockId },
      });

      return { success: true };
    }),

  /**
   * Duplicate a block (with all children and breakpoints)
   */
  duplicateBlock: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Find block - could be in a funnel page OR a smart section
      const originalBlock = await db.funnelBlock.findFirst({
        where: {
          id: input.blockId,
          OR: [
            // Block in funnel page
            {
              funnelPage: {
                funnel: {
                  organizationId: ctx.orgId,
                  subaccountId: ctx.subaccountId ?? null,
                },
              },
            },
            // Block in smart section
            {
              smartSection: {
                organizationId: ctx.orgId,
                subaccountId: ctx.subaccountId ?? null,
              },
            },
          ],
        },
        include: {
          funnelBreakpoint: true,
          funnelBlock: {
            include: {
              funnelBreakpoint: true,
            },
          },
        },
      });

      if (!originalBlock) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Block not found",
        });
      }

      // Helper function to recursively duplicate a block and its children
      const duplicateBlockRecursive = async (
        block: typeof originalBlock,
        newParentId: string | null,
        orderOffset: number = 0
      ): Promise<string> => {
        // Create the duplicated block
        const newBlock = await db.funnelBlock.create({
          data: {
            id: crypto.randomUUID(),
            pageId: block.pageId,
            smartSectionId: block.smartSectionId,
            parentBlockId: newParentId,
            type: block.type,
            props: block.props as InputJsonValue,
            styles: block.styles as InputJsonValue,
            order: block.order + orderOffset,
            visible: block.visible,
            locked: false, // Unlock duplicated blocks
            targetWorkflowId: block.targetWorkflowId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Duplicate breakpoints
        const breakpoints = (block as any).funnelBreakpoint || [];
        if (breakpoints.length > 0) {
          await db.funnelBreakpoint.createMany({
            data: breakpoints.map((bp: any) => ({
              id: crypto.randomUUID(),
              blockId: newBlock.id,
              device: bp.device,
              styles: bp.styles,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          });
        }

        // Recursively duplicate child blocks
        const childBlocks = (block as any).funnelBlock || [];
        if (childBlocks.length > 0) {
          for (const child of childBlocks) {
            await duplicateBlockRecursive(child, newBlock.id, 0);
          }
        }

        return newBlock.id;
      };

      // Duplicate the block (placed right after the original)
      const newBlockId = await duplicateBlockRecursive(
        originalBlock,
        originalBlock.parentBlockId,
        1 // Place right after the original
      );

      return { id: newBlockId };
    }),

  // ========================================
  // BREAKPOINT OPERATIONS
  // ========================================

  /**
   * Update or create breakpoint styles
   */
  updateBreakpoint: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
        device: z.nativeEnum(DeviceType),
        styles: z.record(z.any(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Find block - could be in a funnel page OR a smart section
      const block = await db.funnelBlock.findFirst({
        where: {
          id: input.blockId,
          OR: [
            // Block in funnel page
            {
              funnelPage: {
                funnel: {
                  organizationId: ctx.orgId,
                  subaccountId: ctx.subaccountId ?? null,
                },
              },
            },
            // Block in smart section
            {
              smartSection: {
                organizationId: ctx.orgId,
                subaccountId: ctx.subaccountId ?? null,
              },
            },
          ],
        },
      });

      if (!block) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Block not found",
        });
      }

      const breakpoint = await db.funnelBreakpoint.upsert({
        where: {
          blockId_device: {
            blockId: input.blockId,
            device: input.device,
          },
        },
        create: {
          id: crypto.randomUUID(),
          blockId: input.blockId,
          device: input.device,
          styles: input.styles ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          styles: input.styles,
        },
      });

      return breakpoint;
    }),
});
