import { TRPCError } from "@trpc/server";
import z from "zod";

import { CRM_PAGE_SIZE } from "@/features/crm/constants";
import { convertToUSD } from "@/features/crm/lib/currency";
import { db } from "@/db";
import {
  deal as dealTable,
  dealAssignee,
  dealClient,
  locationMember,
  pipeline as pipelineTable,
  pipelineStage,
} from "@/db/schema";
import { getUsersActivityStatus } from "@/lib/activity-tracker";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { createNotification } from "@/lib/notifications";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { ActivityAction } from "@/db/enums";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  max,
  min,
  or,
  type SQL,
} from "drizzle-orm";

type DealResult = NonNullable<Awaited<ReturnType<typeof getDealWithRelations>>>;

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
    members: deal.dealAssignees.map((member) => {
      const userId = member.locationMember.user?.id;
      const activity =
        userId && activityStatus ? activityStatus.get(userId) : undefined;

      return {
        id: member.locationMember.user?.id ?? member.locationMemberId,
        userId: userId ?? null,
        name: member.locationMember.user?.name ?? "Unknown",
        email: member.locationMember.user?.email ?? null,
        image: member.locationMember.user?.image ?? null,
        role: member.locationMember.role,
        isOnline: activity?.isOnline ?? false,
        lastActivityAt: activity?.lastActivityAt ?? null,
        lastLoginAt: activity?.lastLoginAt ?? null,
        status: activity?.status ?? "OFFLINE",
        statusMessage: activity?.statusMessage ?? null,
      };
    }),
    clients: deal.dealClients.map((link) => ({
      id: link.client.id,
      name: link.client.name,
      companyName: link.client.companyName,
      email: link.client.email,
      type: link.client.type,
    })),
  };
};

async function getDealWithRelations(id: string) {
  return db.query.deal.findFirst({
    where: eq(dealTable.id, id),
    with: {
      pipeline: true,
      pipelineStage: true,
      dealAssignees: {
        with: {
          locationMember: {
            with: {
              user: true,
            },
          },
        },
      },
      dealClients: {
        with: {
          client: true,
        },
      },
    },
  });
}

function scopedDealConditions(
  orgId: string,
  locationId: string | null,
  includeAllClients?: boolean
) {
  const conditions: SQL[] = [eq(dealTable.organizationId, orgId)];

  if (!includeAllClients) {
    conditions.push(locationId ? eq(dealTable.locationId, locationId) : isNull(dealTable.locationId));
  }

  return conditions;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export const dealsRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const locationId = ctx.locationId;

    if (!orgId) {
      return {
        minValue: 0,
        maxValue: 100000,
        maxValueCurrency: "GBP",
        count: 0,
        currencies: [],
      };
    }

    // Fetch all deals with their values and currencies
    const deals = await db.query.deal.findMany({
      where: and(
        eq(dealTable.organizationId, orgId),
        locationId ? eq(dealTable.locationId, locationId) : undefined
      ),
      columns: {
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
    const locationId = ctx.locationId;

    if (!orgId) {
      return {
        minDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        maxDate: new Date(),
      };
    }

    const [result] = await db
      .select({
        minDeadline: min(dealTable.deadline),
        minUpdatedAt: min(dealTable.updatedAt),
        maxDeadline: max(dealTable.deadline),
        maxUpdatedAt: max(dealTable.updatedAt),
      })
      .from(dealTable)
      .where(
        and(
          eq(dealTable.organizationId, orgId),
          locationId ? eq(dealTable.locationId, locationId) : undefined
        )
      );

    const allDates = [
      result?.minDeadline,
      result?.minUpdatedAt,
      result?.maxDeadline,
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
          pipelineId: z.string().optional(),
          pipelineStageId: z.string().optional(),
          pipelineStageIds: z.array(z.string()).optional(),
          search: z.string().optional(),
          cursor: z.number().optional(),
          limit: z.number().optional(),
          clients: z.array(z.string()).optional(),
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
          locationId: z.string().optional(), // Override for "all-clients" view
          includeAllClients: z.boolean().optional(), // Flag to include all clients
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      // Use input locationId if provided, otherwise use context locationId
      const locationId =
        input?.locationId !== undefined
          ? input.locationId || null
          : ctx.locationId;

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

      const conditions = scopedDealConditions(
        orgId,
        locationId,
        input?.includeAllClients
      );

      if (input?.pipelineId) {
        conditions.push(eq(dealTable.pipelineId, input.pipelineId));
      }

      // Support both single stage (backward compatibility) and multiple stages
      if (input?.pipelineStageIds && input.pipelineStageIds.length > 0) {
        conditions.push(inArray(dealTable.pipelineStageId, input.pipelineStageIds));
      } else if (input?.pipelineStageId) {
        conditions.push(eq(dealTable.pipelineStageId, input.pipelineStageId));
      }

      if (input?.search?.trim()) {
        const search = input.search.trim();
        const pattern = `%${search}%`;
        conditions.push(
          or(ilike(dealTable.name, pattern), ilike(dealTable.source, pattern))!
        );
      }

      // Filter by clients
      if (input?.clients && input.clients.length > 0) {
        conditions.push(
          exists(
            db
              .select({ id: dealClient.id })
              .from(dealClient)
              .where(
                and(
                  eq(dealClient.dealId, dealTable.id),
                  inArray(dealClient.clientId, input.clients)
                )
              )
          )
        );
      }

      // Filter by members
      if (input?.members && input.members.length > 0) {
        conditions.push(
          exists(
            db
              .select({ id: dealAssignee.id })
              .from(dealAssignee)
              .where(
                and(
                  eq(dealAssignee.dealId, dealTable.id),
                  inArray(dealAssignee.locationMemberId, input.members)
                )
              )
          )
        );
      }

      // Filter by probability
      if (
        input?.probabilityMin !== undefined ||
        input?.probabilityMax !== undefined
      ) {
        conditions.push(
          exists(
            db
              .select({ id: pipelineStage.id })
              .from(pipelineStage)
              .where(
                and(
                  eq(pipelineStage.id, dealTable.pipelineStageId),
                  input.probabilityMin !== undefined
                    ? gte(pipelineStage.probability, input.probabilityMin)
                    : undefined,
                  input.probabilityMax !== undefined
                    ? lte(pipelineStage.probability, input.probabilityMax)
                    : undefined
                )
              )
          )
        );
      }

      // Filter by deadline
      if (input?.deadlineStart || input?.deadlineEnd) {
        if (input.deadlineStart) {
          conditions.push(gte(dealTable.deadline, input.deadlineStart));
        }
        if (input.deadlineEnd) {
          conditions.push(lte(dealTable.deadline, endOfDay(input.deadlineEnd)));
        }
      }

      // Filter by updated date
      if (input?.updatedAtStart || input?.updatedAtEnd) {
        if (input.updatedAtStart) {
          conditions.push(gte(dealTable.updatedAt, input.updatedAtStart));
        }
        if (input.updatedAtEnd) {
          conditions.push(lte(dealTable.updatedAt, endOfDay(input.updatedAtEnd)));
        }
      }

      // Filter by currency
      if (input?.valueCurrency) {
        conditions.push(eq(dealTable.currency, input.valueCurrency));
      }

      // Filter by value range
      if (input?.valueMin !== undefined || input?.valueMax !== undefined) {
        if (input.valueMin !== undefined) {
          conditions.push(gte(dealTable.value, input.valueMin.toString()));
        }
        if (input.valueMax !== undefined) {
          conditions.push(lte(dealTable.value, input.valueMax.toString()));
        }
      }

      const where = and(...conditions);
      const [items, totalResult] = await Promise.all([
        db.query.deal.findMany({
          where,
          with: {
            pipeline: true,
            pipelineStage: true,
            dealAssignees: {
              with: {
                locationMember: {
                  with: {
                    user: true,
                  },
                },
              },
            },
            dealClients: {
              with: {
                client: true,
              },
            },
          },
          orderBy: [desc(dealTable.updatedAt), desc(dealTable.createdAt)],
          offset: skip,
          limit: pageSize,
        }),
        db.select({ total: count() }).from(dealTable).where(where),
      ]);
      const totalItems = totalResult[0]?.total ?? 0;

      // Collect all unique user IDs from members
      const userIds = new Set<string>();
      for (const deal of items) {
        for (const member of deal.dealAssignees) {
          const userId = member.locationMember.user?.id;
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

      const nextCursor = skip + items.length < totalItems ? skip + take : null;
      const totalPages = Math.ceil(totalItems / pageSize);

      // Map deals
      const mappedItems = items.map((deal) => mapDeal(deal, activityStatus));

      return {
        items: mappedItems,
        nextCursor,
        total: totalItems,
        pagination: {
          currentPage: page,
          totalPages,
          pageSize,
          totalItems,
        },
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
        clientIds: z
          .array(z.string())
          .min(1, "At least one client is required"),
        memberIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

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
        const defaultPipeline = await db.query.pipeline.findFirst({
          where: and(
            eq(pipelineTable.organizationId, orgId),
            locationId ? eq(pipelineTable.locationId, locationId) : undefined,
            eq(pipelineTable.isDefault, true)
          ),
          with: {
            pipelineStages: {
              orderBy: asc(pipelineStage.position),
              limit: 1,
            },
          },
        });

        if (defaultPipeline) {
          pipelineId = defaultPipeline.id;
          if (!pipelineStageId && defaultPipeline.pipelineStages[0]) {
            pipelineStageId = defaultPipeline.pipelineStages[0].id;
          }
        }
      }

      const dealId = crypto.randomUUID();
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(dealTable).values({
          id: dealId,
          organizationId: orgId,
          locationId: locationId ?? null,
          name: input.name,
          pipelineId,
          pipelineStageId,
          value: input.value?.toString(),
          currency: input.currency ?? "USD",
          deadline: input.deadline,
          source: input.source,
          tags: input.tags ?? [],
          description: input.description,
          createdAt: now,
          updatedAt: now,
        });

        await tx.insert(dealClient).values(
          input.clientIds.map((clientId) => ({
            id: crypto.randomUUID(),
            dealId,
            clientId,
          }))
        );

        if (input.memberIds && input.memberIds.length > 0) {
          await tx.insert(dealAssignee).values(
            input.memberIds.map((memberId) => ({
              id: crypto.randomUUID(),
              dealId,
              locationMemberId: memberId,
              assignedAt: now,
            }))
          );
        }
      });

      const deal = await getDealWithRelations(dealId);

      if (!deal) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Deal was created but could not be loaded.",
        });
      }

      // Send notification
      await createNotification({
        type: "DEAL_CREATED",
        title: "Deal created",
        message: `${ctx.auth.user.name} created a new deal: ${deal.name}`,
        actorId: ctx.auth.user.id,
        entityType: "deal",
        entityId: deal.id,
        organizationId: orgId,
        locationId: locationId ?? undefined,
      });

      // Log activity and PostHog analytics
      await logAnalytics({
        organizationId: orgId,
        locationId: locationId ?? null,
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
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      const deal = await db.query.deal.findFirst({
        where: and(
          eq(dealTable.id, input.id),
          eq(dealTable.organizationId, orgId),
          locationId ? eq(dealTable.locationId, locationId) : undefined
        ),
        with: {
          pipeline: true,
          pipelineStage: true,
          dealAssignees: {
            with: {
              locationMember: {
                with: {
                  user: true,
                },
              },
            },
          },
          dealClients: {
            with: {
              client: true,
            },
          },
        },
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
        clientIds: z.array(z.string()).optional(),
        memberIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to update deals",
        });
      }

      const { id, clientIds, memberIds, ...data } = input;

      // First verify the deal exists and belongs to the org
      const existing = await db.query.deal.findFirst({
        where: and(
          eq(dealTable.id, id),
          eq(dealTable.organizationId, orgId),
          locationId ? eq(dealTable.locationId, locationId) : undefined
        ),
        columns: {
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

      const updateData: Partial<typeof dealTable.$inferInsert> = {
        updatedAt: new Date(),
        ...(data.name && { name: data.name }),
        ...(data.pipelineId !== undefined && { pipelineId: data.pipelineId }),
        ...(data.pipelineStageId !== undefined && {
          pipelineStageId: data.pipelineStageId,
        }),
        ...(data.value !== undefined && { value: data.value.toString() }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.deadline !== undefined && { deadline: data.deadline }),
        ...(data.source !== undefined && { source: data.source || null }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
      };

      await db.transaction(async (tx) => {
        const [updatedDeal] = await tx
          .update(dealTable)
          .set(updateData)
          .where(
            and(
              eq(dealTable.id, id),
              eq(dealTable.organizationId, orgId),
              locationId ? eq(dealTable.locationId, locationId) : undefined
            )
          )
          .returning({ id: dealTable.id });

        if (!updatedDeal) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deal not found",
          });
        }

        if (clientIds) {
          await tx.delete(dealClient).where(eq(dealClient.dealId, id));
          if (clientIds.length > 0) {
            await tx.insert(dealClient).values(
              clientIds.map((clientId) => ({
                id: crypto.randomUUID(),
                dealId: id,
                clientId,
              }))
            );
          }
        }

        if (memberIds) {
          await tx.delete(dealAssignee).where(eq(dealAssignee.dealId, id));
          if (memberIds.length > 0) {
            await tx.insert(dealAssignee).values(
              memberIds.map((memberId) => ({
                id: crypto.randomUUID(),
                dealId: id,
                locationMemberId: memberId,
              }))
            );
          }
        }
      });

      const deal = await getDealWithRelations(id);

      if (!deal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      // Log activity with changes (convert Decimal to number for comparison)
      const existingForComparison = {
        ...existing,
        value: existing.value ? Number(existing.value) : existing.value,
      };
      const changes = getChangedFields(existingForComparison, data);

      // Determine if this is a stage change
      const isStageChange =
        data.pipelineStageId !== undefined &&
        data.pipelineStageId !== existing.pipelineStageId;

      await logAnalytics({
        organizationId: orgId,
        locationId: locationId ?? null,
        userId: ctx.auth.user.id,
        action: isStageChange
          ? ActivityAction.STAGE_CHANGED
          : ActivityAction.UPDATED,
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

      if (changes && !isStageChange) {
        await createNotification({
          type: "DEAL_UPDATED",
          title: "Deal updated",
          message: `${ctx.auth.user.name} updated deal ${deal.name}`,
          actorId: ctx.auth.user.id,
          entityType: "deal",
          entityId: deal.id,
          organizationId: orgId,
          locationId: locationId ?? undefined,
          data: {
            fieldsChanged: Object.keys(changes),
          },
        });
      }

      if (isStageChange) {
        let previousStageName: string | null = null;
        let previousStageProbability: number | null = null;

        if (existing.pipelineStageId) {
          const previousStage = await db.query.pipelineStage.findFirst({
            where: eq(pipelineStage.id, existing.pipelineStageId),
            columns: { name: true, probability: true },
          });
          previousStageName = previousStage?.name ?? null;
          previousStageProbability = previousStage?.probability ?? null;
        }

        const nextStageName = deal.pipelineStage?.name ?? null;
        const nextStageProbability = deal.pipelineStage?.probability ?? null;

        await createNotification({
          type: "DEAL_STAGE_CHANGED",
          title: "Deal stage updated",
          message: `${ctx.auth.user.name} moved ${deal.name}${
            nextStageName ? ` to ${nextStageName}` : ""
          }`,
          actorId: ctx.auth.user.id,
          entityType: "deal",
          entityId: deal.id,
          organizationId: orgId,
          locationId: locationId ?? undefined,
          data: {
            previousStage: previousStageName,
            nextStage: nextStageName,
          },
        });

        if (
          nextStageProbability === 100 &&
          previousStageProbability !== 100
        ) {
          await createNotification({
            type: "DEAL_CLOSED",
            title: "Deal closed",
            message: `${ctx.auth.user.name} closed ${deal.name}`,
            actorId: ctx.auth.user.id,
            entityType: "deal",
            entityId: deal.id,
            organizationId: orgId,
            locationId: locationId ?? undefined,
            data: {
              previousStage: previousStageName,
              nextStage: nextStageName,
            },
          });
        }
      }

      return mapDeal(deal);
    }),

  /**
   * Search deals by name for a specific client and pipeline
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        clientId: z.string().optional(),
        pipelineId: z.string().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId || !locationId) {
        return [];
      }

      const conditions: SQL[] = [
        eq(dealTable.organizationId, orgId),
        eq(dealTable.locationId, locationId),
        ilike(dealTable.name, `%${input.query}%`),
      ];

      if (input.clientId) {
        conditions.push(
          exists(
            db
              .select({ id: dealClient.id })
              .from(dealClient)
              .where(
                and(
                  eq(dealClient.dealId, dealTable.id),
                  eq(dealClient.clientId, input.clientId)
                )
              )
          )
        );
      }

      if (input.pipelineId) {
        conditions.push(eq(dealTable.pipelineId, input.pipelineId));
      }

      const deals = await db.query.deal.findMany({
        where: and(...conditions),
        with: {
          pipeline: true,
          pipelineStage: true,
          dealClients: {
            with: {
              client: true,
            },
          },
        },
        orderBy: desc(dealTable.updatedAt),
        limit: input.limit,
      });

      return deals.map((deal) => ({
        id: deal.id,
        name: deal.name,
        value: deal.value ? Number(deal.value) : null,
        currency: deal.currency,
        pipeline: deal.pipeline?.name ?? "",
        stage: deal.pipelineStage?.name ?? "",
        clients: deal.dealClients.map((dc) => ({
          id: dc.client.id,
          name: dc.client.name,
        })),
      }));
    }),
});
