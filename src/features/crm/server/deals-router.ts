import { TRPCError } from "@trpc/server";
import z from "zod";

import { CRM_PAGE_SIZE } from "@/features/crm/constants";
import { convertToUSD } from "@/features/crm/lib/currency";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { getUsersActivityStatus } from "@/lib/activity-tracker";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { createNotification } from "@/lib/notifications";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { ActivityAction } from "@prisma/client";

const dealInclude = {
  pipeline: true,
  pipelineStage: true,
  members: {
    include: {
      subaccountMember: {
        include: {
          user: true,
        },
      },
    },
  },
  contacts: {
    include: {
      contact: true,
    },
  },
} satisfies Prisma.DealInclude;

type DealResult = Prisma.DealGetPayload<{ include: typeof dealInclude }>;

const mapDeal = (
  deal: DealResult,
  activityStatus?: Map<
    string,
    {
      isOnline: boolean;
      lastActivityAt: Date | null;
      lastLoginAt: Date;
      status: string;
      statusMessage: string | null;
    }
  >
) => {
  return {
    id: deal.id,
    name: deal.name,
    pipelineId: deal.pipelineId,
    pipelineStageId: deal.pipelineStageId,
    pipeline: deal.pipeline
      ? {
          id: deal.pipeline.id,
          name: deal.pipeline.name,
          isDefault: deal.pipeline.isDefault,
        }
      : null,
    pipelineStage: deal.pipelineStage
      ? {
          id: deal.pipelineStage.id,
          name: deal.pipelineStage.name,
          position: deal.pipelineStage.position,
          probability: deal.pipelineStage.probability,
          color: deal.pipelineStage.color,
        }
      : null,
    value: deal.value,
    currency: deal.currency,
    // Add valueUSD for filtering and aggregation purposes
    valueUSD: convertToUSD(
      deal.value ? Number(deal.value) : null,
      deal.currency
    ),
    deadline: deal.deadline,
    source: deal.source,
    tags: deal.tags,
    description: deal.description,
    lastActivityAt: deal.lastActivityAt,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    members: deal.members.map((member) => {
      const userId = member.subaccountMember.user?.id;
      const activity =
        userId && activityStatus ? activityStatus.get(userId) : undefined;

      return {
        id: member.subaccountMember.user?.id ?? member.subaccountMemberId,
        userId: userId ?? null,
        name: member.subaccountMember.user?.name ?? "Unknown",
        email: member.subaccountMember.user?.email ?? null,
        image: member.subaccountMember.user?.image ?? null,
        role: member.subaccountMember.role,
        isOnline: activity?.isOnline ?? false,
        lastActivityAt: activity?.lastActivityAt ?? null,
        lastLoginAt: activity?.lastLoginAt ?? null,
        status: activity?.status ?? "OFFLINE",
        statusMessage: activity?.statusMessage ?? null,
      };
    }),
    contacts: deal.contacts.map((link) => ({
      id: link.contact.id,
      name: link.contact.name,
      companyName: link.contact.companyName,
      email: link.contact.email,
      type: link.contact.type,
    })),
  };
};

export const dealsRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const subaccountId = ctx.subaccountId;

    if (!orgId) {
      return {
        minValue: 0,
        maxValue: 100000,
        maxValueCurrency: "USD",
        count: 0,
        currencies: [],
      };
    }

    // Fetch all deals with their values and currencies
    const deals = await prisma.deal.findMany({
      where: {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
      },
      select: {
        value: true,
        currency: true,
      },
    });

    // Get unique currencies and their max values
    const currencyMaxValues = new Map<string, number>();

    for (const deal of deals) {
      if (deal.value && deal.currency) {
        const value = Number(deal.value);
        const currency = deal.currency;
        const currentMax = currencyMaxValues.get(currency) || 0;
        currencyMaxValues.set(currency, Math.max(currentMax, value));
      }
    }

    // Get the overall max value across all currencies and which currency it belongs to
    let maxValue = 0;
    let maxValueCurrency = "USD";

    for (const [currency, value] of currencyMaxValues.entries()) {
      if (value > maxValue) {
        maxValue = value;
        maxValueCurrency = currency;
      }
    }

    return {
      minValue: 0, // Always start from 0
      maxValue: maxValue > 0 ? maxValue : 100000,
      maxValueCurrency: maxValue > 0 ? maxValueCurrency : "USD",
      count: deals.length,
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

    const result = await prisma.deal.aggregate({
      where: {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
      },
      _min: {
        deadline: true,
        updatedAt: true,
      },
      _max: {
        deadline: true,
        updatedAt: true,
      },
    });

    const allDates = [
      result._min.deadline,
      result._min.updatedAt,
      result._max.deadline,
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
          pipelineId: z.string().optional(),
          pipelineStageId: z.string().optional(),
          pipelineStageIds: z.array(z.string()).optional(),
          search: z.string().optional(),
          cursor: z.number().optional(),
          limit: z.number().optional(),
          contacts: z.array(z.string()).optional(),
          members: z.array(z.string()).optional(),
          valueCurrency: z.string().optional(),
          valueMin: z.number().optional(),
          valueMax: z.number().optional(),
          probabilityMin: z.number().optional(),
          probabilityMax: z.number().optional(),
          deadlineStart: z.date().optional(),
          deadlineEnd: z.date().optional(),
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
      const subaccountId = input?.subaccountId !== undefined
        ? (input.subaccountId || null)
        : ctx.subaccountId;

      if (!orgId) {
        return { items: [], nextCursor: null, total: 0 };
      }

      const take = Math.min(input?.limit ?? CRM_PAGE_SIZE, CRM_PAGE_SIZE);
      const skip = input?.cursor ?? 0;

      const where: Prisma.DealWhereInput = {
        organizationId: orgId,
        // Only filter by subaccount if not viewing all clients
        ...(input?.includeAllClients
          ? {}
          : subaccountId
            ? { subaccountId }
            : { subaccountId: null }
        ),
      };

      if (input?.pipelineId) {
        where.pipelineId = input.pipelineId;
      }

      // Support both single stage (backward compatibility) and multiple stages
      if (input?.pipelineStageIds && input.pipelineStageIds.length > 0) {
        where.pipelineStageId = { in: input.pipelineStageIds };
      } else if (input?.pipelineStageId) {
        where.pipelineStageId = input.pipelineStageId;
      }

      if (input?.search?.trim()) {
        const search = input.search.trim();
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { source: { contains: search, mode: "insensitive" } },
        ];
      }

      // Filter by contacts
      if (input?.contacts && input.contacts.length > 0) {
        where.contacts = {
          some: {
            contactId: { in: input.contacts },
          },
        };
      }

      // Filter by members
      if (input?.members && input.members.length > 0) {
        where.members = {
          some: {
            subaccountMemberId: { in: input.members },
          },
        };
      }

      // Filter by probability
      if (
        input?.probabilityMin !== undefined ||
        input?.probabilityMax !== undefined
      ) {
        where.pipelineStage = {
          probability: {
            ...(input.probabilityMin !== undefined && {
              gte: input.probabilityMin,
            }),
            ...(input.probabilityMax !== undefined && {
              lte: input.probabilityMax,
            }),
          },
        };
      }

      // Filter by deadline
      if (input?.deadlineStart || input?.deadlineEnd) {
        where.deadline = {};
        if (input.deadlineStart) {
          where.deadline.gte = input.deadlineStart;
        }
        if (input.deadlineEnd) {
          const endOfDay = new Date(input.deadlineEnd);
          endOfDay.setHours(23, 59, 59, 999);
          where.deadline.lte = endOfDay;
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

      // Filter by currency
      if (input?.valueCurrency) {
        where.currency = input.valueCurrency;
      }

      // Filter by value range
      if (input?.valueMin !== undefined || input?.valueMax !== undefined) {
        where.value = {};
        if (input.valueMin !== undefined) {
          where.value.gte = input.valueMin;
        }
        if (input.valueMax !== undefined) {
          where.value.lte = input.valueMax;
        }
      }

      const [items, total] = await Promise.all([
        prisma.deal.findMany({
          where,
          include: dealInclude,
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          skip,
          take,
        }),
        prisma.deal.count({ where }),
      ]);

      // Collect all unique user IDs from members
      const userIds = new Set<string>();
      for (const deal of items) {
        for (const member of deal.members) {
          const userId = member.subaccountMember.user?.id;
          if (userId) {
            userIds.add(userId);
          }
        }
      }

      // Fetch activity status for all users
      const activityStatus =
        userIds.size > 0
          ? await getUsersActivityStatus(Array.from(userIds))
          : new Map();

      const nextCursor = skip + items.length < total ? skip + take : null;

      // Map deals
      const mappedItems = items.map((deal) => mapDeal(deal, activityStatus));

      return {
        items: mappedItems,
        nextCursor,
        total,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        pipelineId: z.string().optional(),
        pipelineStageId: z.string().optional(),
        value: z.number().optional(),
        currency: z.string().optional(),
        deadline: z.date().optional(),
        source: z.string().optional(),
        tags: z.array(z.string()).optional(),
        description: z.string().optional(),
        contactIds: z
          .array(z.string())
          .min(1, "At least one contact is required"),
        memberIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to create deals",
        });
      }

      // If no pipeline specified, get the default pipeline and its first stage
      let pipelineId = input.pipelineId;
      let pipelineStageId = input.pipelineStageId;

      if (!pipelineId) {
        const defaultPipeline = await prisma.pipeline.findFirst({
          where: {
            organizationId: orgId,
            ...(subaccountId && { subaccountId }),
            isDefault: true,
          },
          include: { stages: { orderBy: { position: "asc" }, take: 1 } },
        });

        if (defaultPipeline) {
          pipelineId = defaultPipeline.id;
          if (!pipelineStageId && defaultPipeline.stages[0]) {
            pipelineStageId = defaultPipeline.stages[0].id;
          }
        }
      }

      const deal = await prisma.deal.create({
        data: {
          organizationId: orgId,
          subaccountId: subaccountId ?? null,
          name: input.name,
          pipelineId,
          pipelineStageId,
          value: input.value,
          currency: input.currency ?? "USD",
          deadline: input.deadline,
          source: input.source,
          tags: input.tags ?? [],
          description: input.description,
          contacts: {
            create: input.contactIds.map((contactId) => ({
              contactId,
            })),
          },
          members: input.memberIds
            ? {
                create: input.memberIds.map((memberId) => ({
                  subaccountMemberId: memberId,
                })),
              }
            : undefined,
        },
        include: dealInclude,
      });

      // Send notification
      await createNotification({
        type: "DEAL_CREATED",
        title: "Deal created",
        message: `${ctx.auth.user.name} created a new deal: ${deal.name}`,
        actorId: ctx.auth.user.id,
        entityType: "deal",
        entityId: deal.id,
        organizationId: orgId,
        subaccountId: subaccountId ?? undefined,
      });

      // Log activity and PostHog analytics
      await logAnalytics({
        organizationId: orgId,
        subaccountId: subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "deal",
        entityId: deal.id,
        entityName: deal.name,
        metadata: {
          value: deal.value?.toString(),
          currency: deal.currency,
          pipelineId: deal.pipelineId,
          pipelineStageId: deal.pipelineStageId,
        },
        posthogProperties: {
          value: deal.value ? Number(deal.value) : null,
          currency: deal.currency,
          pipeline_id: deal.pipelineId,
          pipeline_stage_id: deal.pipelineStageId,
          has_deadline: !!deal.deadline,
        },
      });

      return mapDeal(deal);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      const deal = await prisma.deal.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
        include: dealInclude,
      });

      if (!deal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      return mapDeal(deal);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required").optional(),
        pipelineId: z.string().optional().nullable(),
        pipelineStageId: z.string().optional().nullable(),
        value: z.number().optional(),
        currency: z.string().optional(),
        deadline: z.date().optional().nullable(),
        source: z.string().optional(),
        tags: z.array(z.string()).optional(),
        description: z.string().optional(),
        contactIds: z.array(z.string()).optional(),
        memberIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to update deals",
        });
      }

      const { id, contactIds, memberIds, ...data } = input;

      // First verify the deal exists and belongs to the org
      const existing = await prisma.deal.findFirst({
        where: {
          id,
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
        select: {
          name: true,
          value: true,
          currency: true,
          pipelineId: true,
          pipelineStageId: true,
          deadline: true,
          description: true,
          tags: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      const deal = await prisma.deal.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.pipelineId !== undefined && { pipelineId: data.pipelineId }),
          ...(data.pipelineStageId !== undefined && {
            pipelineStageId: data.pipelineStageId,
          }),
          ...(data.value !== undefined && { value: data.value }),
          ...(data.currency !== undefined && { currency: data.currency }),
          ...(data.deadline !== undefined && { deadline: data.deadline }),
          ...(data.source !== undefined && { source: data.source || null }),
          ...(data.tags !== undefined && { tags: data.tags }),
          ...(data.description !== undefined && {
            description: data.description || null,
          }),
          ...(contactIds && {
            contacts: {
              deleteMany: {},
              create: contactIds.map((contactId) => ({
                contactId,
              })),
            },
          }),
          ...(memberIds && {
            members: {
              deleteMany: {},
              create: memberIds.map((memberId) => ({
                subaccountMemberId: memberId,
              })),
            },
          }),
        },
        include: dealInclude,
      });

      // Log activity with changes (convert Decimal to number for comparison)
      const existingForComparison = {
        ...existing,
        value: existing.value ? Number(existing.value) : existing.value,
      };
      const changes = getChangedFields(existingForComparison, data);

      // Determine if this is a stage change
      const isStageChange = data.pipelineStageId !== undefined &&
        data.pipelineStageId !== existing.pipelineStageId;

      await logAnalytics({
        organizationId: orgId,
        subaccountId: subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: isStageChange ? ActivityAction.STAGE_CHANGED : ActivityAction.UPDATED,
        entityType: "deal",
        entityId: deal.id,
        entityName: deal.name,
        changes,
        metadata: {
          fieldsChanged: changes ? Object.keys(changes) : [],
          ...(isStageChange && {
            oldStageId: existing.pipelineStageId,
            newStageId: data.pipelineStageId,
          }),
        },
        posthogProperties: {
          fields_changed: changes ? Object.keys(changes) : [],
          is_stage_change: isStageChange,
          ...(isStageChange && {
            old_stage_id: existing.pipelineStageId,
            new_stage_id: data.pipelineStageId,
          }),
          value: deal.value ? Number(deal.value) : null,
          currency: deal.currency,
        },
      });

      return mapDeal(deal);
    }),
});
