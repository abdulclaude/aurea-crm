import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, inArray, isNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { ActivityAction, DeviceType, FunnelBlockType, FunnelDomainType, FunnelStatus } from "@/db/enums";
import {
  funnel,
  funnelBlock,
  funnelBreakpoint,
  funnelPage,
  smartSection,
} from "@/db/schema";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { createNotification } from "@/lib/notifications";
import {
  publicationManageProcedure,
  publicationViewProcedure,
} from "@/features/permissions/server/publication-procedures";
import { createTRPCRouter } from "@/trpc/init";

const FUNNEL_PAGE_SIZE = 20;
const jsonObjectSchema = z.record(z.string(), z.unknown());

type FunnelRow = typeof funnel.$inferSelect;
type FunnelPageRow = typeof funnelPage.$inferSelect;
type FunnelBlockRow = typeof funnelBlock.$inferSelect;
type FunnelBreakpointRow = typeof funnelBreakpoint.$inferSelect;

type FunnelScope = {
  orgId: string;
  locationId: string | null;
};

type BlockWithRelations = FunnelBlockRow & {
  funnelPage?: (FunnelPageRow & { funnel?: FunnelRow | null }) | null;
  smartSection?: (typeof smartSection.$inferSelect) | null;
  funnelBreakpoints?: FunnelBreakpointRow[];
  funnelBlocks?: Array<FunnelBlockRow & { funnelBreakpoints?: FunnelBreakpointRow[] }>;
};

const locationScope = (
  column: typeof funnel.locationId | typeof smartSection.locationId,
  locationId: string | null
): SQL => (locationId === null ? isNull(column) : eq(column, locationId));

const funnelScope = (id: string, scope: FunnelScope): SQL =>
  and(eq(funnel.id, id), eq(funnel.organizationId, scope.orgId), locationScope(funnel.locationId, scope.locationId))!;

const smartSectionScope = (id: string, scope: FunnelScope): SQL =>
  and(eq(smartSection.id, id), eq(smartSection.organizationId, scope.orgId), locationScope(smartSection.locationId, scope.locationId))!;

const ensureFunnel = async (id: string, scope: FunnelScope): Promise<FunnelRow> => {
  const found = await db.query.funnel.findFirst({
    where: funnelScope(id, scope),
  });

  if (!found) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Funnel not found",
    });
  }

  return found;
};

const pageBelongsToScope = <T extends FunnelPageRow & { funnel?: FunnelRow | null }>(
  page: T | null | undefined,
  scope: FunnelScope
): page is T & { funnel: FunnelRow } =>
  !!page?.funnel &&
  page.funnel.organizationId === scope.orgId &&
  page.funnel.locationId === scope.locationId;

const blockBelongsToScope = (block: BlockWithRelations | null | undefined, scope: FunnelScope): block is BlockWithRelations => {
  if (!block) return false;
  if (pageBelongsToScope(block.funnelPage, scope)) return true;
  if (block.smartSection?.organizationId === scope.orgId && block.smartSection.locationId === scope.locationId) return true;
  return false;
};

const ensureBlock = async (blockId: string, scope: FunnelScope): Promise<BlockWithRelations> => {
  const block = await db.query.funnelBlock.findFirst({
    where: eq(funnelBlock.id, blockId),
    with: {
      funnelPage: {
        with: {
          funnel: true,
        },
      },
      smartSection: true,
    },
  });

  if (!blockBelongsToScope(block, scope)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Block not found",
    });
  }

  return block;
};

const mapPageForClient = <T extends FunnelPageRow & { funnelBlocks?: unknown[] }>(page: T) => ({
  ...page,
  funnelBlock: page.funnelBlocks ?? [],
  _count: {
    funnelBlock: page.funnelBlocks?.length ?? 0,
  },
});

const mapBlockForClient = <T extends FunnelBlockRow & { funnelBreakpoints?: FunnelBreakpointRow[] }>(block: T) => ({
  ...block,
  funnelBreakpoint: block.funnelBreakpoints ?? [],
});

export const funnelsRouter = createTRPCRouter({
  list: publicationViewProcedure
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

      const scope = { orgId: ctx.orgId, locationId: ctx.locationId ?? null };
      const filters: SQL[] = [eq(funnel.organizationId, scope.orgId), locationScope(funnel.locationId, scope.locationId)];

      if (input.status) filters.push(eq(funnel.status, input.status));

      if (input.cursor) {
        const cursorRow = await db.query.funnel.findFirst({
          where: funnelScope(input.cursor, scope),
          columns: { id: true, updatedAt: true },
        });

        if (cursorRow) {
          filters.push(
            or(
              lt(funnel.updatedAt, cursorRow.updatedAt),
              and(eq(funnel.updatedAt, cursorRow.updatedAt), lt(funnel.id, cursorRow.id))
            )!
          );
        }
      }

      const rows = await db.query.funnel.findMany({
        where: and(...filters),
        limit: input.limit + 1,
        orderBy: [desc(funnel.updatedAt), desc(funnel.id)],
        columns: {
          id: true,
          name: true,
          description: true,
          status: true,
          funnelType: true,
          externalUrl: true,
          createdAt: true,
          updatedAt: true,
          organizationId: true,
          locationId: true,
        },
        with: {
          funnelPages: {
            columns: { id: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (rows.length > input.limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem?.id;
      }

      return {
        funnels: rows.map((row) => ({
          ...row,
          _count: { funnelPage: row.funnelPages.length },
        })),
        nextCursor,
      };
    }),

  getById: publicationViewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const row = await db.query.funnel.findFirst({
        where: funnelScope(input.id, { orgId: ctx.orgId, locationId: ctx.locationId ?? null }),
        with: {
          funnelPages: {
            orderBy: asc(funnelPage.order),
          },
        },
      });

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      return { ...row, funnelPage: row.funnelPages };
    }),

  create: publicationManageProcedure
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

      const [created] = await db
        .insert(funnel)
        .values({
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
          status: FunnelStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await createNotification({
        type: "FUNNEL_CREATED",
        title: "Funnel created",
        message: `${ctx.auth.user.name} created funnel ${created.name}`,
        actorId: ctx.auth.user.id,
        entityType: "funnel",
        entityId: created.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
      });

      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "funnel",
        entityId: created.id,
        entityName: created.name,
        metadata: { status: created.status },
        posthogProperties: {
          status: created.status,
          has_description: !!created.description,
        },
      });

      return created;
    }),

  update: publicationManageProcedure
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

      const scope = { orgId: ctx.orgId, locationId: ctx.locationId ?? null };
      const existing = await ensureFunnel(input.id, scope);

      if (input.subdomain && input.subdomain !== existing.subdomain) {
        const existingSubdomain = await db.query.funnel.findFirst({
          where: and(eq(funnel.subdomain, input.subdomain), ne(funnel.id, input.id)),
          columns: { id: true },
        });

        if (existingSubdomain) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This subdomain is already in use",
          });
        }
      }

      if (input.customDomain && input.customDomain !== existing.customDomain) {
        const existingCustomDomain = await db.query.funnel.findFirst({
          where: and(eq(funnel.customDomain, input.customDomain), ne(funnel.id, input.id)),
          columns: { id: true },
        });

        if (existingCustomDomain) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This custom domain is already in use",
          });
        }
      }

      const changes = getChangedFields(
        {
          name: existing.name,
          description: existing.description,
          status: existing.status,
          domainType: existing.domainType,
          subdomain: existing.subdomain,
          customDomain: existing.customDomain,
        },
        {
          name: input.name,
          description: input.description,
          status: input.status,
          domainType: input.domainType,
          subdomain: input.subdomain,
          customDomain: input.customDomain,
        }
      );

      const [updated] = await db
        .update(funnel)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.status && {
            status: input.status,
            ...(input.status === FunnelStatus.PUBLISHED && { publishedAt: new Date() }),
          }),
          ...(input.domainType && { domainType: input.domainType }),
          ...(input.subdomain !== undefined && { subdomain: input.subdomain }),
          ...(input.customDomain !== undefined && {
            customDomain: input.customDomain,
            ...(input.customDomain !== existing.customDomain && { domainVerified: false }),
          }),
          updatedAt: new Date(),
        })
        .where(eq(funnel.id, input.id))
        .returning();

      const isStatusChange = input.status !== undefined && input.status !== existing.status;

      if (isStatusChange && input.status === FunnelStatus.PUBLISHED) {
        await createNotification({
          type: "FUNNEL_PUBLISHED",
          title: "Funnel published",
          message: `${ctx.auth.user.name} published funnel ${updated.name}`,
          actorId: ctx.auth.user.id,
          entityType: "funnel",
          entityId: updated.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? undefined,
        });
      } else if (changes) {
        await createNotification({
          type: "FUNNEL_UPDATED",
          title: "Funnel updated",
          message: `${ctx.auth.user.name} updated funnel ${updated.name}`,
          actorId: ctx.auth.user.id,
          entityType: "funnel",
          entityId: updated.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? undefined,
        });
      }

      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: isStatusChange ? ActivityAction.STATUS_CHANGED : ActivityAction.UPDATED,
        entityType: "funnel",
        entityId: updated.id,
        entityName: updated.name,
        changes,
        metadata: { status: updated.status },
        posthogProperties: {
          status: updated.status,
          fields_changed: changes ? Object.keys(changes) : [],
          is_status_change: isStatusChange,
        },
      });

      return updated;
    }),

  delete: publicationManageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const scope = { orgId: ctx.orgId, locationId: ctx.locationId ?? null };
      const existing = await ensureFunnel(input.id, scope);

      await db.delete(funnel).where(eq(funnel.id, input.id));

      await createNotification({
        type: "FUNNEL_DELETED",
        title: "Funnel deleted",
        message: `${ctx.auth.user.name} deleted funnel ${existing.name}`,
        actorId: ctx.auth.user.id,
        entityType: "funnel",
        entityId: existing.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
        data: {
          funnelId: existing.id,
          funnelName: existing.name,
        },
      });

      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        entityType: "funnel",
        entityId: existing.id,
        entityName: existing.name,
      });

      return { success: true };
    }),

  listPages: publicationViewProcedure
    .input(z.object({ funnelId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      await ensureFunnel(input.funnelId, { orgId: ctx.orgId, locationId: ctx.locationId ?? null });

      const pages = await db.query.funnelPage.findMany({
        where: eq(funnelPage.funnelId, input.funnelId),
        orderBy: asc(funnelPage.order),
        with: {
          funnelBlocks: {
            columns: { id: true },
          },
        },
      });

      return pages.map(mapPageForClient);
    }),

  getPage: publicationViewProcedure
    .input(z.object({ pageId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const scope = { orgId: ctx.orgId, locationId: ctx.locationId ?? null };
      const page = await db.query.funnelPage.findFirst({
        where: eq(funnelPage.id, input.pageId),
        with: {
          funnel: true,
          funnelBlocks: {
            orderBy: asc(funnelBlock.order),
            with: {
              funnelBreakpoints: true,
              smartSectionInstance: {
                with: { smartSection: true },
              },
            },
          },
        },
      });

      if (!pageBelongsToScope(page, scope)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      return {
        ...page,
        funnelBlock: page.funnelBlocks.map(mapBlockForClient),
      };
    }),

  createPage: publicationManageProcedure
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

      const scope = { orgId: ctx.orgId, locationId: ctx.locationId ?? null };
      const existingFunnel = await ensureFunnel(input.funnelId, scope);

      const existingPage = await db.query.funnelPage.findFirst({
        where: and(eq(funnelPage.funnelId, input.funnelId), eq(funnelPage.slug, input.slug)),
        columns: { id: true },
      });

      if (existingPage) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Page with this slug already exists",
        });
      }

      const highestOrder = await db.query.funnelPage.findFirst({
        where: eq(funnelPage.funnelId, input.funnelId),
        orderBy: desc(funnelPage.order),
        columns: { order: true },
      });
      const newOrder = (highestOrder?.order ?? -1) + 1;

      if (input.duplicateFromPageId) {
        const sourcePage = await db.query.funnelPage.findFirst({
          where: and(eq(funnelPage.id, input.duplicateFromPageId), eq(funnelPage.funnelId, input.funnelId)),
          with: {
            funnelBlocks: {
              with: {
                funnelBreakpoints: true,
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

        return await db.transaction(async (tx) => {
          const [newPage] = await tx
            .insert(funnelPage)
            .values({
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
            })
            .returning();

          const blockIdMap = new Map<string, string>();

          for (const block of sourcePage.funnelBlocks) {
            const [newBlock] = await tx
              .insert(funnelBlock)
              .values({
                id: crypto.randomUUID(),
                pageId: newPage.id,
                type: block.type,
                props: block.props,
                styles: block.styles,
                order: block.order,
                visible: block.visible,
                locked: block.locked,
                targetWorkflowId: block.targetWorkflowId,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();

            blockIdMap.set(block.id, newBlock.id);

            if (block.funnelBreakpoints.length > 0) {
              await tx.insert(funnelBreakpoint).values(
                block.funnelBreakpoints.map((breakpoint) => ({
                  id: crypto.randomUUID(),
                  blockId: newBlock.id,
                  device: breakpoint.device,
                  styles: breakpoint.styles,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }))
              );
            }
          }

          for (const block of sourcePage.funnelBlocks) {
            if (!block.parentBlockId) continue;
            const newBlockId = blockIdMap.get(block.id);
            const newParentId = blockIdMap.get(block.parentBlockId);

            if (newBlockId && newParentId) {
              await tx.update(funnelBlock).set({ parentBlockId: newParentId, updatedAt: new Date() }).where(eq(funnelBlock.id, newBlockId));
            }
          }

          return newPage;
        });
      }

      const [createdPage] = await db
        .insert(funnelPage)
        .values({
          id: crypto.randomUUID(),
          funnelId: input.funnelId,
          name: input.name,
          slug: input.slug,
          order: newOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await createNotification({
        type: "FUNNEL_UPDATED",
        title: "Funnel page created",
        message: `${ctx.auth.user.name} added page ${createdPage.name} to ${existingFunnel.name}`,
        actorId: ctx.auth.user.id,
        entityType: "funnel",
        entityId: existingFunnel.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
        data: {
          pageId: createdPage.id,
          pageName: createdPage.name,
          pageSlug: createdPage.slug,
        },
      });

      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "funnel",
        entityId: existingFunnel.id,
        entityName: existingFunnel.name,
        metadata: {
          pageId: createdPage.id,
          pageName: createdPage.name,
          pageSlug: createdPage.slug,
        },
        posthogProperties: {
          page_id: createdPage.id,
          page_name: createdPage.name,
          page_slug: createdPage.slug,
        },
      });

      return createdPage;
    }),

  updatePage: publicationManageProcedure
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

      const scope = { orgId: ctx.orgId, locationId: ctx.locationId ?? null };
      const page = await db.query.funnelPage.findFirst({
        where: eq(funnelPage.id, input.pageId),
        with: { funnel: true },
      });

      if (!pageBelongsToScope(page, scope)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      if (input.slug && input.slug !== page.slug) {
        const existingPage = await db.query.funnelPage.findFirst({
          where: and(eq(funnelPage.funnelId, page.funnelId), eq(funnelPage.slug, input.slug), ne(funnelPage.id, input.pageId)),
          columns: { id: true },
        });

        if (existingPage) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Page with this slug already exists",
          });
        }
      }

      const [updated] = await db
        .update(funnelPage)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.slug && { slug: input.slug }),
          ...(input.isPublished !== undefined && { isPublished: input.isPublished }),
          ...(input.metaTitle !== undefined && { metaTitle: input.metaTitle }),
          ...(input.metaDescription !== undefined && { metaDescription: input.metaDescription }),
          ...(input.metaImage !== undefined && { metaImage: input.metaImage }),
          ...(input.customCss !== undefined && { customCss: input.customCss }),
          ...(input.customJs !== undefined && { customJs: input.customJs }),
          updatedAt: new Date(),
        })
        .where(eq(funnelPage.id, input.pageId))
        .returning();

      const changes = getChangedFields(
        {
          name: page.name,
          slug: page.slug,
          isPublished: page.isPublished,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          metaImage: page.metaImage,
          customCss: page.customCss,
          customJs: page.customJs,
        },
        {
          name: input.name,
          slug: input.slug,
          isPublished: input.isPublished,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          metaImage: input.metaImage,
          customCss: input.customCss,
          customJs: input.customJs,
        }
      );

      if (changes) {
        await createNotification({
          type: "FUNNEL_UPDATED",
          title: "Funnel page updated",
          message: `${ctx.auth.user.name} updated page ${updated.name} in ${page.funnel.name}`,
          actorId: ctx.auth.user.id,
          entityType: "funnel",
          entityId: page.funnel.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? undefined,
          data: {
            pageId: updated.id,
            pageName: updated.name,
            pageSlug: updated.slug,
            fieldsChanged: Object.keys(changes),
          },
        });
      }

      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "funnel",
        entityId: page.funnel.id,
        entityName: page.funnel.name,
        changes,
        metadata: {
          pageId: updated.id,
          pageName: updated.name,
          pageSlug: updated.slug,
        },
        posthogProperties: {
          page_id: updated.id,
          page_name: updated.name,
          page_slug: updated.slug,
          fields_changed: changes ? Object.keys(changes) : [],
        },
      });

      return updated;
    }),

  reorderPages: publicationManageProcedure
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

      await ensureFunnel(input.funnelId, { orgId: ctx.orgId, locationId: ctx.locationId ?? null });

      if (new Set(input.pageIds).size !== input.pageIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Page order cannot contain duplicate pages",
        });
      }

      const scopedPages = await db
        .select({ id: funnelPage.id })
        .from(funnelPage)
        .where(eq(funnelPage.funnelId, input.funnelId));
      const requestedPageIds = new Set(input.pageIds);
      if (
        scopedPages.length !== input.pageIds.length ||
        scopedPages.some((page) => !requestedPageIds.has(page.id))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Page order must include every page in this funnel",
        });
      }

      if (input.pageIds.length) {
        const orderCases = input.pageIds.map(
          (pageId, index) => sql`when ${pageId} then ${index}`,
        );
        await db
          .update(funnelPage)
          .set({
            order: sql`case ${funnelPage.id} ${sql.join(orderCases, sql` `)} end`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(funnelPage.funnelId, input.funnelId),
              inArray(funnelPage.id, input.pageIds),
            ),
          );
      }

      return { success: true };
    }),

  deletePage: publicationManageProcedure
    .input(z.object({ pageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const scope = { orgId: ctx.orgId, locationId: ctx.locationId ?? null };
      const page = await db.query.funnelPage.findFirst({
        where: eq(funnelPage.id, input.pageId),
        with: { funnel: true },
      });

      if (!pageBelongsToScope(page, scope)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      await db.delete(funnelPage).where(eq(funnelPage.id, input.pageId));

      await createNotification({
        type: "FUNNEL_UPDATED",
        title: "Funnel page deleted",
        message: `${ctx.auth.user.name} removed page ${page.name} from ${page.funnel.name}`,
        actorId: ctx.auth.user.id,
        entityType: "funnel",
        entityId: page.funnel.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
        data: {
          pageId: page.id,
          pageName: page.name,
          pageSlug: page.slug,
        },
      });

      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        entityType: "funnel",
        entityId: page.funnel.id,
        entityName: page.funnel.name,
        metadata: {
          pageId: page.id,
          pageName: page.name,
          pageSlug: page.slug,
        },
        posthogProperties: {
          page_id: page.id,
          page_name: page.name,
          page_slug: page.slug,
        },
      });

      return { success: true };
    }),

  createBlock: publicationManageProcedure
    .input(
      z.object({
        pageId: z.string().optional(),
        smartSectionId: z.string().optional(),
        type: z.nativeEnum(FunnelBlockType),
        parentBlockId: z.string().optional(),
        props: jsonObjectSchema.optional(),
        styles: jsonObjectSchema.optional(),
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

      if (!input.pageId && !input.smartSectionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either pageId or smartSectionId is required",
        });
      }

      const scope = { orgId: ctx.orgId, locationId: ctx.locationId ?? null };
      if (input.pageId) {
        const page = await db.query.funnelPage.findFirst({
          where: eq(funnelPage.id, input.pageId),
          with: { funnel: true },
        });

        if (!pageBelongsToScope(page, scope)) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Page not found",
          });
        }
      } else if (input.smartSectionId) {
        const section = await db.query.smartSection.findFirst({
          where: smartSectionScope(input.smartSectionId, scope),
          columns: { id: true },
        });

        if (!section) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Smart section not found",
          });
        }
      }

      let order = input.order;
      if (order === undefined) {
        const highestOrder = await db.query.funnelBlock.findFirst({
          where: and(
            input.pageId ? eq(funnelBlock.pageId, input.pageId) : eq(funnelBlock.smartSectionId, input.smartSectionId!),
            input.parentBlockId ? eq(funnelBlock.parentBlockId, input.parentBlockId) : isNull(funnelBlock.parentBlockId)
          ),
          orderBy: desc(funnelBlock.order),
          columns: { order: true },
        });
        order = (highestOrder?.order ?? -1) + 1;
      }

      const [created] = await db
        .insert(funnelBlock)
        .values({
          id: crypto.randomUUID(),
          pageId: input.pageId ?? null,
          smartSectionId: input.smartSectionId ?? null,
          type: input.type,
          parentBlockId: input.parentBlockId ?? null,
          props: input.props ?? {},
          styles: input.styles ?? {},
          order,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return mapBlockForClient(created);
    }),

  updateBlock: publicationManageProcedure
    .input(
      z.object({
        blockId: z.string(),
        props: jsonObjectSchema.optional(),
        styles: jsonObjectSchema.optional(),
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

      await ensureBlock(input.blockId, { orgId: ctx.orgId, locationId: ctx.locationId ?? null });

      const [updated] = await db
        .update(funnelBlock)
        .set({
          ...(input.props && { props: input.props }),
          ...(input.styles && { styles: input.styles }),
          ...(input.visible !== undefined && { visible: input.visible }),
          ...(input.locked !== undefined && { locked: input.locked }),
          ...(input.targetWorkflowId !== undefined && { targetWorkflowId: input.targetWorkflowId }),
          updatedAt: new Date(),
        })
        .where(eq(funnelBlock.id, input.blockId))
        .returning();

      const breakpoints = await db.query.funnelBreakpoint.findMany({
        where: eq(funnelBreakpoint.blockId, updated.id),
      });

      return mapBlockForClient({ ...updated, funnelBreakpoints: breakpoints });
    }),

  moveBlock: publicationManageProcedure
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

      await ensureBlock(input.blockId, { orgId: ctx.orgId, locationId: ctx.locationId ?? null });

      const [updated] = await db
        .update(funnelBlock)
        .set({
          parentBlockId: input.newParentBlockId,
          order: input.newOrder,
          updatedAt: new Date(),
        })
        .where(eq(funnelBlock.id, input.blockId))
        .returning();

      const breakpoints = await db.query.funnelBreakpoint.findMany({
        where: eq(funnelBreakpoint.blockId, updated.id),
      });

      return mapBlockForClient({ ...updated, funnelBreakpoints: breakpoints });
    }),

  deleteBlock: publicationManageProcedure
    .input(z.object({ blockId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      await ensureBlock(input.blockId, { orgId: ctx.orgId, locationId: ctx.locationId ?? null });
      await db.delete(funnelBlock).where(eq(funnelBlock.id, input.blockId));

      return { success: true };
    }),

  duplicateBlock: publicationManageProcedure
    .input(z.object({ blockId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const scope = { orgId: ctx.orgId, locationId: ctx.locationId ?? null };
      const originalBlock = await db.query.funnelBlock.findFirst({
        where: eq(funnelBlock.id, input.blockId),
        with: {
          funnelPage: { with: { funnel: true } },
          smartSection: true,
          funnelBreakpoints: true,
          funnelBlocks: {
            with: { funnelBreakpoints: true },
          },
        },
      });

      if (!blockBelongsToScope(originalBlock, scope)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Block not found",
        });
      }

      const duplicateBlockRecursive = async (
        block: NonNullable<typeof originalBlock>,
        newParentId: string | null,
        orderOffset = 0
      ): Promise<string> => {
        const [newBlock] = await db
          .insert(funnelBlock)
          .values({
            id: crypto.randomUUID(),
            pageId: block.pageId,
            smartSectionId: block.smartSectionId,
            parentBlockId: newParentId,
            type: block.type,
            props: block.props,
            styles: block.styles,
            order: block.order + orderOffset,
            visible: block.visible,
            locked: false,
            targetWorkflowId: block.targetWorkflowId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (block.funnelBreakpoints.length > 0) {
          await db.insert(funnelBreakpoint).values(
            block.funnelBreakpoints.map((breakpoint) => ({
              id: crypto.randomUUID(),
              blockId: newBlock.id,
              device: breakpoint.device,
              styles: breakpoint.styles,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          );
        }

        for (const child of block.funnelBlocks) {
          await duplicateBlockRecursive({ ...child, funnelPage: block.funnelPage, smartSection: block.smartSection, funnelBlocks: [] }, newBlock.id);
        }

        return newBlock.id;
      };

      const newBlockId = await duplicateBlockRecursive(originalBlock, originalBlock.parentBlockId, 1);

      return { id: newBlockId };
    }),

  updateBreakpoint: publicationManageProcedure
    .input(
      z.object({
        blockId: z.string(),
        device: z.nativeEnum(DeviceType),
        styles: jsonObjectSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      await ensureBlock(input.blockId, { orgId: ctx.orgId, locationId: ctx.locationId ?? null });

      const [breakpoint] = await db
        .insert(funnelBreakpoint)
        .values({
          id: crypto.randomUUID(),
          blockId: input.blockId,
          device: input.device,
          styles: input.styles ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [funnelBreakpoint.blockId, funnelBreakpoint.device],
          set: {
            styles: input.styles ?? {},
            updatedAt: new Date(),
          },
        })
        .returning();

      return breakpoint;
    }),
});
