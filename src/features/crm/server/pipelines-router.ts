import { TRPCError } from "@trpc/server";
import z from "zod";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  max,
  min,
  ne,
  or,
  type SQL,
} from "drizzle-orm";

import { CRM_PAGE_SIZE } from "@/features/crm/constants";
import { convertCurrency } from "@/features/crm/lib/currency";
import { db } from "@/db";
import { deal, dealClient, pipeline, pipelineStage } from "@/db/schema";
import { ActivityAction } from "@/db/enums";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { createNotification } from "@/lib/notifications";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";

type PipelineResult = NonNullable<
  Awaited<ReturnType<typeof getPipelineWithStages>>
>;
type PipelineListResult = Awaited<ReturnType<typeof getPipelineListItems>>[number];

const scopedPipelineWhere = (
  organizationId: string,
  locationId: string | null | undefined,
  includeAllClients = false,
): SQL<unknown> => {
  const filters = [eq(pipeline.organizationId, organizationId)];
  if (!includeAllClients && locationId) {
    filters.push(eq(pipeline.locationId, locationId));
  }
  return and(...filters) ?? eq(pipeline.organizationId, organizationId);
};

async function getPipelineWithStages(
  id: string,
  organizationId: string,
  locationId: string | null | undefined,
) {
  return await db.query.pipeline.findFirst({
    where: and(
      eq(pipeline.id, id),
      scopedPipelineWhere(organizationId, locationId),
    ),
    with: {
      pipelineStages: {
        orderBy: [asc(pipelineStage.position)],
      },
    },
  });
}

async function getPipelineListItems(
  where: SQL<unknown>,
  offset: number,
  limit: number,
) {
  return await db.query.pipeline.findMany({
    where,
    with: {
      pipelineStages: {
        orderBy: [asc(pipelineStage.position)],
      },
      deals: {
        with: {
          dealClients: {
            with: {
              client: true,
            },
          },
        },
      },
    },
    orderBy: [desc(pipeline.isDefault), desc(pipeline.updatedAt), desc(pipeline.createdAt)],
    offset,
    limit,
  });
}

const mapPipeline = (pipeline: PipelineResult) => {
  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    isActive: pipeline.isActive,
    isDefault: pipeline.isDefault,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
    stages: pipeline.pipelineStages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      position: stage.position,
      probability: stage.probability,
      rottingDays: stage.rottingDays,
      color: stage.color,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
    })),
  };
};

const mapPipelineWithStats = (
  pipeline: PipelineListResult,
  targetCurrency?: string
) => {
  // Get unique clients from all deals
  const clientsMap = new Map<string, { id: string; name: string; email: string | null; logo: string | null }>();
  let totalValue = 0;

  // Convert all deal values to target currency and sum them
  for (const dealItem of pipeline.deals) {
    // Convert and add to total value
    if (dealItem.value) {
      const convertedValue = targetCurrency
        ? convertCurrency(Number(dealItem.value), dealItem.currency ?? "USD", targetCurrency)
        : Number(dealItem.value);
      totalValue += convertedValue;
    }

    // Collect unique clients
    for (const dc of dealItem.dealClients) {
      if (!clientsMap.has(dc.client.id)) {
        clientsMap.set(dc.client.id, {
          id: dc.client.id,
          name: dc.client.name,
          email: dc.client.email,
          logo: dc.client.logo,
        });
      }
    }
  }

  const uniqueClients = Array.from(clientsMap.values());

  // Calculate win rate - deals in the last stage vs total deals
  const sortedStages = [...pipeline.pipelineStages].sort(
    (a, b) => a.position - b.position
  );
  const lastStage = sortedStages[sortedStages.length - 1];
  const dealsInLastStage = lastStage
    ? pipeline.deals.filter((dealItem) => dealItem.pipelineStageId === lastStage.id)
        .length
    : 0;
  const winRate =
    pipeline.deals.length > 0
      ? (dealsInLastStage / pipeline.deals.length) * 100
      : 0;

  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    isActive: pipeline.isActive,
    isDefault: pipeline.isDefault,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
    stages: pipeline.pipelineStages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      position: stage.position,
      probability: stage.probability,
      rottingDays: stage.rottingDays,
      color: stage.color,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
    })),
    dealsCount: pipeline.deals.length,
    dealsValue: totalValue, // Total value with all deals converted to target currency
    clients: uniqueClients,
    winRate,
  };
};

export const pipelinesRouter = createTRPCRouter({
  count: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const locationId = ctx.locationId;

    if (!orgId) {
      return 0;
    }

    const [result] = await db
      .select({ count: count() })
      .from(pipeline)
      .where(scopedPipelineWhere(orgId, locationId));
    return result?.count ?? 0;
  }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const locationId = ctx.locationId;

    if (!orgId) {
      return {
        minDealsCount: 0,
        maxDealsCount: 100,
        minDealsValue: 0,
        maxDealsValue: 100000,
        currencies: [],
      };
    }

    // Fetch all pipelines with their deals
    const pipelines = await db.query.pipeline.findMany({
      where: scopedPipelineWhere(orgId, locationId),
      with: {
        deals: true,
      },
    });

    // Calculate statistics
    const dealsCounts = pipelines.map((p) => p.deals.length);

    // Get unique currencies and calculate max values per currency
    const currencyMaxValues = new Map<string, number>();

    for (const pipeline of pipelines) {
      for (const pipelineDeal of pipeline.deals) {
        if (pipelineDeal.value && pipelineDeal.currency) {
          const value = Number(pipelineDeal.value);
          const currency = pipelineDeal.currency;
          const currentMax = currencyMaxValues.get(currency) || 0;
          currencyMaxValues.set(currency, Math.max(currentMax, value));
        }
      }
    }

    // Get the overall max value across all currencies (for default display)
    const allValues = Array.from(currencyMaxValues.values());

    return {
      minDealsCount: 0, // Always start from 0
      maxDealsCount: dealsCounts.length > 0 ? Math.max(...dealsCounts) : 100,
      minDealsValue: 0, // Always start from 0
      maxDealsValue: allValues.length > 0 ? Math.max(...allValues) : 100000,
      currencies: Array.from(currencyMaxValues.keys()),
    };
  }),

  dateRange: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const locationId = ctx.locationId;

    if (!orgId) {
      return {
        minDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        maxDate: new Date(),
      };
    }

    const [result] = await db
      .select({
        minCreatedAt: min(pipeline.createdAt),
        minUpdatedAt: min(pipeline.updatedAt),
        maxCreatedAt: max(pipeline.createdAt),
        maxUpdatedAt: max(pipeline.updatedAt),
      })
      .from(pipeline)
      .where(scopedPipelineWhere(orgId, locationId));

    const allDates = [
      result?.minCreatedAt,
      result?.minUpdatedAt,
      result?.maxCreatedAt,
      result?.maxUpdatedAt,
    ].filter((d): d is Date => d !== null);

    if (allDates.length === 0) {
      return {
        minDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        maxDate: new Date(),
      };
    }

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    return { minDate, maxDate };
  }),

  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(20),
          search: z.string().optional(),
          isActive: z.boolean().optional(),
          cursor: z.number().optional(),
          limit: z.number().optional(),
          stages: z.array(z.string()).optional(),
          clients: z.array(z.string()).optional(),
          dealsCountMin: z.number().optional(),
          dealsCountMax: z.number().optional(),
          dealsValueCurrency: z.string().optional(),
          dealsValueMin: z.number().optional(),
          dealsValueMax: z.number().optional(),
          winRateMin: z.number().optional(),
          winRateMax: z.number().optional(),
          createdAtStart: z.date().optional(),
          createdAtEnd: z.date().optional(),
          updatedAtStart: z.date().optional(),
          updatedAtEnd: z.date().optional(),
          locationId: z.string().optional(), // Override for "all-clients" view
          includeAllClients: z.boolean().optional(), // Flag to include all clients
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      // Use input locationId if provided, otherwise use context locationId
      const locationId = input?.locationId ?? ctx.locationId;

      if (!orgId) {
        return {
          items: [],
          nextCursor: null,
          total: 0,
          pagination: {
            currentPage: 1,
            totalPages: 0,
            pageSize: input?.pageSize ?? 20,
            totalItems: 0,
          },
        };
      }

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const take = Math.min(input?.limit ?? CRM_PAGE_SIZE, CRM_PAGE_SIZE);
      const skip = input?.cursor ?? (page - 1) * pageSize;

      const whereClauses: SQL<unknown>[] = [
        scopedPipelineWhere(orgId, locationId, input?.includeAllClients),
      ];

      if (input?.isActive !== undefined) {
        whereClauses.push(eq(pipeline.isActive, input.isActive));
      }

      if (input?.search?.trim()) {
        const search = input.search.trim();
        whereClauses.push(
          or(ilike(pipeline.name, `%${search}%`), ilike(pipeline.description, `%${search}%`)) ??
            ilike(pipeline.name, `%${search}%`),
        );
      }

      // Filter by stages
      if (input?.stages && input.stages.length > 0) {
        const matchingStages = await db
          .select({ pipelineId: pipelineStage.pipelineId })
          .from(pipelineStage)
          .where(inArray(pipelineStage.name, input.stages));
        const pipelineIds = matchingStages.map((stage) => stage.pipelineId);
        whereClauses.push(pipelineIds.length > 0 ? inArray(pipeline.id, pipelineIds) : eq(pipeline.id, "__none__"));
      }

      // Filter by clients
      if (input?.clients && input.clients.length > 0) {
        const matchingDealClients = await db
          .select({ dealId: dealClient.dealId })
          .from(dealClient)
          .where(inArray(dealClient.clientId, input.clients));
        const dealIds = matchingDealClients.map((item) => item.dealId);
        if (dealIds.length === 0) {
          whereClauses.push(eq(pipeline.id, "__none__"));
        } else {
          const matchingDeals = await db
            .select({ pipelineId: deal.pipelineId })
            .from(deal)
            .where(inArray(deal.id, dealIds));
          const pipelineIds = matchingDeals
            .map((item) => item.pipelineId)
            .filter((id): id is string => id !== null);
          whereClauses.push(pipelineIds.length > 0 ? inArray(pipeline.id, pipelineIds) : eq(pipeline.id, "__none__"));
        }
      }

      // Filter by created date
      if (input?.createdAtStart || input?.createdAtEnd) {
        if (input.createdAtStart) {
          whereClauses.push(gte(pipeline.createdAt, input.createdAtStart));
        }
        if (input.createdAtEnd) {
          const endOfDay = new Date(input.createdAtEnd);
          endOfDay.setHours(23, 59, 59, 999);
          whereClauses.push(lte(pipeline.createdAt, endOfDay));
        }
      }

      // Filter by updated date
      if (input?.updatedAtStart || input?.updatedAtEnd) {
        if (input.updatedAtStart) {
          whereClauses.push(gte(pipeline.updatedAt, input.updatedAtStart));
        }
        if (input.updatedAtEnd) {
          const endOfDay = new Date(input.updatedAtEnd);
          endOfDay.setHours(23, 59, 59, 999);
          whereClauses.push(lte(pipeline.updatedAt, endOfDay));
        }
      }

      const where = and(...whereClauses) ?? scopedPipelineWhere(orgId, locationId);
      const [items, totalItems] = await Promise.all([
        getPipelineListItems(where, skip, pageSize),
        db.select({ count: count() }).from(pipeline).where(where),
      ]);

      const totalCount = totalItems[0]?.count ?? 0;
      const nextCursor = skip + items.length < totalCount ? skip + take : null;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Map pipelines with stats and then filter by numeric criteria
      // Pass target currency to mapPipelineWithStats to convert all deal values
      let mappedItems = items.map((item) =>
        mapPipelineWithStats(item, input?.dealsValueCurrency)
      );

      // Filter by deals count
      if (
        input?.dealsCountMin !== undefined ||
        input?.dealsCountMax !== undefined
      ) {
        mappedItems = mappedItems.filter((pipeline) => {
          const count = pipeline.dealsCount;
          if (
            input.dealsCountMin !== undefined &&
            count < input.dealsCountMin
          ) {
            return false;
          }
          if (
            input.dealsCountMax !== undefined &&
            count > input.dealsCountMax
          ) {
            return false;
          }
          return true;
        });
      }

      // Filter by deals value (in selected currency)
      if (
        input?.dealsValueMin !== undefined ||
        input?.dealsValueMax !== undefined
      ) {
        mappedItems = mappedItems.filter((pipeline) => {
          const value = pipeline.dealsValue;
          if (
            input.dealsValueMin !== undefined &&
            value < input.dealsValueMin
          ) {
            return false;
          }
          if (
            input.dealsValueMax !== undefined &&
            value > input.dealsValueMax
          ) {
            return false;
          }
          return true;
        });
      }

      // Filter by win rate
      if (input?.winRateMin !== undefined || input?.winRateMax !== undefined) {
        mappedItems = mappedItems.filter((pipeline) => {
          const winRate = pipeline.winRate;
          if (input.winRateMin !== undefined && winRate < input.winRateMin) {
            return false;
          }
          if (input.winRateMax !== undefined && winRate > input.winRateMax) {
            return false;
          }
          return true;
        });
      }

      return {
        items: mappedItems,
        nextCursor,
        total: mappedItems.length, // Update total to reflect filtered count
        pagination: {
          currentPage: page,
          totalPages,
          pageSize,
          totalItems: totalCount,
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      const foundPipeline = await getPipelineWithStages(input.id, orgId, locationId);

      if (!foundPipeline) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      return mapPipeline(foundPipeline);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
        stages: z
          .array(
            z.object({
              name: z.string().min(1, "Stage name is required"),
              probability: z.number().min(0).max(100).optional(),
              rottingDays: z.number().min(1).optional(),
              color: z.string().optional(),
            })
          )
          .min(1, "At least one stage is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to create pipelines",
        });
      }

      const newPipeline = await db.transaction(async (tx) => {
        if (input.isDefault) {
          await tx
            .update(pipeline)
            .set({ isDefault: false })
            .where(and(scopedPipelineWhere(orgId, locationId), eq(pipeline.isDefault, true)));
        }

        const pipelineId = crypto.randomUUID();
        const now = new Date();
        const [createdPipeline] = await tx
          .insert(pipeline)
          .values({
            id: pipelineId,
            organizationId: orgId,
            locationId: locationId ?? null,
            name: input.name,
            description: input.description,
            isDefault: input.isDefault ?? false,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        await tx.insert(pipelineStage).values(
          input.stages.map((stage, index) => ({
            id: crypto.randomUUID(),
            pipelineId,
            name: stage.name,
            position: index,
            probability: stage.probability ?? 0,
            rottingDays: stage.rottingDays ?? null,
            color: stage.color,
            createdAt: now,
            updatedAt: now,
          })),
        );

        return createdPipeline;
      });

      const createdPipeline = await getPipelineWithStages(newPipeline.id, orgId, locationId);
      if (!createdPipeline) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load created pipeline",
        });
      }

      // Send notification
      await createNotification({
        type: "PIPELINE_CREATED",
        title: "Pipeline created",
        message: `${ctx.auth.user.name} created a new pipeline: ${createdPipeline.name}`,
        actorId: ctx.auth.user.id,
        entityType: "pipeline",
        entityId: createdPipeline.id,
        organizationId: orgId,
        locationId: locationId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: orgId,
        locationId: locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "pipeline",
        entityId: createdPipeline.id,
        entityName: createdPipeline.name,
        metadata: {
          isDefault: createdPipeline.isDefault,
          stagesCount: input.stages.length,
        },
        posthogProperties: {
          is_default: createdPipeline.isDefault,
          stages_count: input.stages.length,
          has_description: !!createdPipeline.description,
        },
      });

      return mapPipeline(createdPipeline);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required").optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
        stages: z
          .array(
            z.object({
              id: z.string().optional(), // If present, update; if not, create new
              name: z.string().min(1, "Stage name is required"),
              probability: z.number().min(0).max(100).optional(),
              rottingDays: z.number().min(1).optional(),
              color: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to update pipelines",
        });
      }

      const { id, stages, ...data } = input;

      // First verify the pipeline exists and belongs to the org
      const existing = await getPipelineWithStages(id, orgId, locationId);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      await db.transaction(async (tx) => {
        if (input.isDefault) {
          await tx
            .update(pipeline)
            .set({ isDefault: false })
            .where(
              and(
                scopedPipelineWhere(orgId, locationId),
                eq(pipeline.isDefault, true),
                ne(pipeline.id, id),
              ),
            );
        }

        await tx
          .update(pipeline)
          .set({
            name: data.name,
            description: data.description,
            isActive: data.isActive,
            isDefault: data.isDefault,
            updatedAt: new Date(),
          })
          .where(eq(pipeline.id, id));

        if (stages) {
          await tx.delete(pipelineStage).where(eq(pipelineStage.pipelineId, id));
          await tx.insert(pipelineStage).values(
            stages.map((stage, index) => ({
              id: crypto.randomUUID(),
              pipelineId: id,
              name: stage.name,
              position: index,
              probability: stage.probability ?? 0,
              rottingDays: stage.rottingDays ?? null,
              color: stage.color,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          );
        }
      });

      const updatedPipeline = await getPipelineWithStages(id, orgId, locationId);
      if (!updatedPipeline) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load updated pipeline",
        });
      }

      // Log analytics
      const changes = getChangedFields(existing, data);
      const hasStageUpdates = !!stages;
      if (changes || hasStageUpdates) {
        await createNotification({
          type: "PIPELINE_UPDATED",
          title: "Pipeline updated",
          message: `${ctx.auth.user.name} updated pipeline ${updatedPipeline.name}`,
          actorId: ctx.auth.user.id,
          entityType: "pipeline",
          entityId: updatedPipeline.id,
          organizationId: orgId,
          locationId: locationId ?? undefined,
          data: {
            fieldsChanged: changes ? Object.keys(changes) : [],
            stagesUpdated: hasStageUpdates,
          },
        });
      }
      await logAnalytics({
        organizationId: orgId,
        locationId: locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "pipeline",
        entityId: updatedPipeline.id,
        entityName: updatedPipeline.name,
        changes,
        metadata: {
          fieldsChanged: changes ? Object.keys(changes) : [],
          stagesUpdated: !!stages,
        },
        posthogProperties: {
          fields_changed: changes ? Object.keys(changes) : [],
          stages_updated: !!stages,
          is_default: updatedPipeline.isDefault,
        },
      });

      return mapPipeline(updatedPipeline);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to delete pipelines",
        });
      }

      // First verify the pipeline exists and belongs to the org
      const existing = await db.query.pipeline.findFirst({
        where: and(
          eq(pipeline.id, input.id),
          scopedPipelineWhere(orgId, locationId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      await db.delete(pipeline).where(eq(pipeline.id, input.id));

      await createNotification({
        type: "PIPELINE_DELETED",
        title: "Pipeline deleted",
        message: `${ctx.auth.user.name} deleted pipeline ${existing.name}`,
        actorId: ctx.auth.user.id,
        entityType: "pipeline",
        entityId: existing.id,
        organizationId: orgId,
        locationId: locationId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: orgId,
        locationId: locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        entityType: "pipeline",
        entityId: existing.id,
        entityName: existing.name,
        metadata: {
          wasDefault: existing.isDefault,
        },
        posthogProperties: {
          was_default: existing.isDefault,
        },
      });

      return { success: true };
    }),
});
