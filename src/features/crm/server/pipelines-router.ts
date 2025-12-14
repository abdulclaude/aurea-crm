import { TRPCError } from "@trpc/server";
import z from "zod";

import { CRM_PAGE_SIZE } from "@/features/crm/constants";
import { convertCurrency } from "@/features/crm/lib/currency";
import type { Prisma } from "@prisma/client";
import { ActivityAction } from "@prisma/client";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { createNotification } from "@/lib/notifications";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";

const pipelineInclude = {
  pipelineStage: {
    orderBy: {
      position: "asc",
    },
  },
} satisfies Prisma.PipelineInclude;

const pipelineListInclude = {
  pipelineStage: {
    orderBy: {
      position: "asc",
    },
  },
  deal: {
    select: {
      id: true,
      value: true,
      currency: true, // Need currency for USD conversion
      pipelineStageId: true,
      dealContact: {
        select: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              logo: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PipelineInclude;

type PipelineResult = Prisma.PipelineGetPayload<{
  include: typeof pipelineInclude;
}>;
type PipelineListResult = Prisma.PipelineGetPayload<{
  include: typeof pipelineListInclude;
}>;

const mapPipeline = (pipeline: PipelineResult) => {
  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    isActive: pipeline.isActive,
    isDefault: pipeline.isDefault,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
    stages: pipeline.pipelineStage.map((stage) => ({
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
  // Get unique contacts from all deals
  const contactsMap = new Map();
  let totalValue = 0;

  // Convert all deal values to target currency and sum them
  for (const deal of pipeline.deal) {
    // Convert and add to total value
    if (deal.value) {
      const convertedValue = targetCurrency
        ? convertCurrency(Number(deal.value), deal.currency, targetCurrency)
        : Number(deal.value);
      totalValue += convertedValue;
    }

    // Collect unique contacts
    for (const dc of deal.dealContact) {
      if (!contactsMap.has(dc.contact.id)) {
        contactsMap.set(dc.contact.id, dc.contact);
      }
    }
  }

  const uniqueContacts = Array.from(contactsMap.values());

  // Calculate win rate - deals in the last stage vs total deals
  const sortedStages = [...pipeline.pipelineStage].sort(
    (a, b) => a.position - b.position
  );
  const lastStage = sortedStages[sortedStages.length - 1];
  const dealsInLastStage = lastStage
    ? pipeline.deal.filter((deal) => deal.pipelineStageId === lastStage.id)
        .length
    : 0;
  const winRate =
    pipeline.deal.length > 0
      ? (dealsInLastStage / pipeline.deal.length) * 100
      : 0;

  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    isActive: pipeline.isActive,
    isDefault: pipeline.isDefault,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
    stages: pipeline.pipelineStage.map((stage) => ({
      id: stage.id,
      name: stage.name,
      position: stage.position,
      probability: stage.probability,
      rottingDays: stage.rottingDays,
      color: stage.color,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
    })),
    dealsCount: pipeline.deal.length,
    dealsValue: totalValue, // Total value with all deals converted to target currency
    contacts: uniqueContacts,
    winRate,
  };
};

export const pipelinesRouter = createTRPCRouter({
  count: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const subaccountId = ctx.subaccountId;

    if (!orgId) {
      return 0;
    }

    return await prisma.pipeline.count({
      where: {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
      },
    });
  }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const subaccountId = ctx.subaccountId;

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
    const pipelines = await prisma.pipeline.findMany({
      where: {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
      },
      include: {
        _count: {
          select: { deal: true },
        },
        deal: {
          select: {
            value: true,
            currency: true,
          },
        },
      },
    });

    // Calculate statistics
    const dealsCounts = pipelines.map((p) => p._count?.deal || 0);

    // Get unique currencies and calculate max values per currency
    const currencyMaxValues = new Map<string, number>();

    for (const pipeline of pipelines) {
      for (const deal of pipeline.deal) {
        if (deal.value && deal.currency) {
          const value = Number(deal.value);
          const currency = deal.currency;
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
    const subaccountId = ctx.subaccountId;

    if (!orgId) {
      return {
        minDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        maxDate: new Date(),
      };
    }

    const result = await prisma.pipeline.aggregate({
      where: {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
      },
      _min: {
        createdAt: true,
        updatedAt: true,
      },
      _max: {
        createdAt: true,
        updatedAt: true,
      },
    });

    const allDates = [
      result._min.createdAt,
      result._min.updatedAt,
      result._max.createdAt,
      result._max.updatedAt,
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
          contacts: z.array(z.string()).optional(),
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
          subaccountId: z.string().optional(), // Override for "all-clients" view
          includeAllClients: z.boolean().optional(), // Flag to include all clients
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      // Use input subaccountId if provided, otherwise use context subaccountId
      const subaccountId = input?.subaccountId ?? ctx.subaccountId;

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

      const where: Prisma.PipelineWhereInput = {
        organizationId: orgId,
        // Only filter by subaccount if not viewing all clients
        ...(input?.includeAllClients
          ? {}
          : subaccountId
            ? { subaccountId }
            : {}),
      };

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input?.search?.trim()) {
        const search = input.search.trim();
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      // Filter by stages
      if (input?.stages && input.stages.length > 0) {
        where.pipelineStage = {
          some: {
            name: { in: input.stages },
          },
        };
      }

      // Filter by contacts
      if (input?.contacts && input.contacts.length > 0) {
        where.deal = {
          some: {
            dealContact: {
              some: {
                contactId: { in: input.contacts },
              },
            },
          },
        };
      }

      // Filter by created date
      if (input?.createdAtStart || input?.createdAtEnd) {
        where.createdAt = {};
        if (input.createdAtStart) {
          where.createdAt.gte = input.createdAtStart;
        }
        if (input.createdAtEnd) {
          const endOfDay = new Date(input.createdAtEnd);
          endOfDay.setHours(23, 59, 59, 999);
          where.createdAt.lte = endOfDay;
        }
      }

      // Filter by updated date
      if (input?.updatedAtStart || input?.updatedAtEnd) {
        where.updatedAt = {};
        if (input.updatedAtStart) {
          where.updatedAt.gte = input.updatedAtStart;
        }
        if (input.updatedAtEnd) {
          const endOfDay = new Date(input.updatedAtEnd);
          endOfDay.setHours(23, 59, 59, 999);
          where.updatedAt.lte = endOfDay;
        }
      }

      const [items, totalItems] = await Promise.all([
        prisma.pipeline.findMany({
          where,
          include: pipelineListInclude,
          orderBy: [
            { isDefault: "desc" },
            { updatedAt: "desc" },
            { createdAt: "desc" },
          ],
          skip,
          take: pageSize,
        }),
        prisma.pipeline.count({ where }),
      ]);

      const nextCursor = skip + items.length < totalItems ? skip + take : null;
      const totalPages = Math.ceil(totalItems / pageSize);

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
          totalItems,
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      const pipeline = await prisma.pipeline.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
        include: pipelineInclude,
      });

      if (!pipeline) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      return mapPipeline(pipeline);
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
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to create pipelines",
        });
      }

      // If this is set as default, unset other defaults
      if (input.isDefault) {
        await prisma.pipeline.updateMany({
          where: {
            organizationId: orgId,
            ...(subaccountId && { subaccountId }),
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      const pipeline = await prisma.pipeline.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: orgId,
          subaccountId: subaccountId ?? null,
          name: input.name,
          description: input.description,
          isDefault: input.isDefault ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pipelineStage: {
            create: input.stages.map((stage, index) => ({
              id: crypto.randomUUID(),
              name: stage.name,
              position: index,
              probability: Number(stage.probability) ?? 0,
              rottingDays: Number(stage.rottingDays) ?? 0,
              color: stage.color,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          },
        },
        include: pipelineInclude,
      });

      // Send notification
      await createNotification({
        type: "PIPELINE_CREATED",
        title: "Pipeline created",
        message: `${ctx.auth.user.name} created a new pipeline: ${pipeline.name}`,
        actorId: ctx.auth.user.id,
        entityType: "pipeline",
        entityId: pipeline.id,
        organizationId: orgId,
        subaccountId: subaccountId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: orgId,
        subaccountId: subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "pipeline",
        entityId: pipeline.id,
        entityName: pipeline.name,
        metadata: {
          isDefault: pipeline.isDefault,
          stagesCount: input.stages.length,
        },
        posthogProperties: {
          is_default: pipeline.isDefault,
          stages_count: input.stages.length,
          has_description: !!pipeline.description,
        },
      });

      return mapPipeline(pipeline as PipelineResult);
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
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to update pipelines",
        });
      }

      const { id, stages, ...data } = input;

      // First verify the pipeline exists and belongs to the org
      const existing = await prisma.pipeline.findFirst({
        where: {
          id,
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      // If this is set as default, unset other defaults
      if (input.isDefault) {
        await prisma.pipeline.updateMany({
          where: {
            organizationId: orgId,
            ...(subaccountId && { subaccountId }),
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }

      // Handle stages update if provided
      const stagesUpdate = stages
        ? {
            stages: {
              deleteMany: {},
              create: stages.map((stage, index) => ({
                name: stage.name,
                position: index,
                probability: stage.probability ?? 0,
                rottingDays: stage.rottingDays,
                color: stage.color,
              })),
            },
          }
        : {};

      const pipeline = await prisma.pipeline.update({
        where: { id },
        data: {
          ...data,
          ...stagesUpdate,
        },
        include: pipelineInclude,
      });

      // Log analytics
      const changes = getChangedFields(existing, data);
      await logAnalytics({
        organizationId: orgId,
        subaccountId: subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "pipeline",
        entityId: pipeline.id,
        entityName: pipeline.name,
        changes,
        metadata: {
          fieldsChanged: changes ? Object.keys(changes) : [],
          stagesUpdated: !!stages,
        },
        posthogProperties: {
          fields_changed: changes ? Object.keys(changes) : [],
          stages_updated: !!stages,
          is_default: pipeline.isDefault,
        },
      });

      return mapPipeline(pipeline);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to delete pipelines",
        });
      }

      // First verify the pipeline exists and belongs to the org
      const existing = await prisma.pipeline.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      await prisma.pipeline.delete({
        where: { id: input.id },
      });

      // Log analytics
      await logAnalytics({
        organizationId: orgId,
        subaccountId: subaccountId ?? null,
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
