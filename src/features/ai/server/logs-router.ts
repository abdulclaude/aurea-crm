import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import { AILogStatus } from "@/db/enums";
import { aiLog, user as userTable } from "@/db/schema";
import {
  and,
  count,
  desc,
  eq,
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

const nullableEq = (
  column: typeof aiLog.organizationId | typeof aiLog.locationId,
  value: string | null | undefined
): SQL => (value ? eq(column, value) : isNull(column));

const organizationCondition = (organizationId: string | null): SQL =>
  nullableEq(aiLog.organizationId, organizationId);

export const logsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        statuses: z.array(z.nativeEnum(AILogStatus)).optional(),
        intents: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        createdAtStart: z.date().optional(),
        createdAtEnd: z.date().optional(),
        completedAtStart: z.date().optional(),
        completedAtEnd: z.date().optional(),
        locationId: z.string().optional(), // Override for "all-clients" view
        includeAllClients: z.boolean().optional(), // Flag to include all clients
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;

      const locationId =
        input?.locationId !== undefined
          ? input.locationId || null
          : ctx.locationId;

      const conditions: SQL[] = [organizationCondition(ctx.orgId)];

      if (!input?.includeAllClients) {
        conditions.push(nullableEq(aiLog.locationId, locationId));
      }

      if (input.search) {
        const searchPattern = `%${input.search}%`;
        const searchCondition = or(
          ilike(aiLog.title, searchPattern),
          ilike(aiLog.description, searchPattern),
          ilike(aiLog.intent, searchPattern),
          ilike(aiLog.userMessage, searchPattern)
        );

        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      if (input.statuses && input.statuses.length > 0) {
        conditions.push(inArray(aiLog.status, input.statuses));
      }

      if (input.intents && input.intents.length > 0) {
        conditions.push(inArray(aiLog.intent, input.intents));
      }

      if (input.userIds && input.userIds.length > 0) {
        conditions.push(inArray(aiLog.userId, input.userIds));
      }

      if (input.createdAtStart) {
        conditions.push(gte(aiLog.createdAt, input.createdAtStart));
      }
      if (input.createdAtEnd) {
        conditions.push(lte(aiLog.createdAt, input.createdAtEnd));
      }

      if (input.completedAtStart) {
        conditions.push(gte(aiLog.completedAt, input.completedAtStart));
      }
      if (input.completedAtEnd) {
        conditions.push(lte(aiLog.completedAt, input.completedAtEnd));
      }

      const where = and(...conditions);

      const [totalItems, logs] = await Promise.all([
        db
          .select({ totalItems: count() })
          .from(aiLog)
          .where(where)
          .then(([row]) => row?.totalItems ?? 0),
        db
          .select({
            log: aiLog,
            user: {
              id: userTable.id,
              name: userTable.name,
              email: userTable.email,
              image: userTable.image,
            },
          })
          .from(aiLog)
          .innerJoin(userTable, eq(aiLog.userId, userTable.id))
          .where(where)
          .orderBy(desc(aiLog.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
      ]);

      const totalPages = Math.ceil(totalItems / pageSize);

      return {
        items: logs.map(({ log, user }) => ({
          ...log,
          user,
        })),
        pagination: {
          currentPage: page,
          totalPages,
          pageSize,
          totalItems,
        },
      };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        status: aiLog.status,
        total: count(),
      })
      .from(aiLog)
      .where(organizationCondition(ctx.orgId))
      .groupBy(aiLog.status);

    const statusCounts: Record<AILogStatus, number> = {
      PENDING: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
    };
    let total = 0;
    for (const row of rows) {
      statusCounts[row.status] = row.total;
      total += row.total;
    }

    return {
      total,
      statusCounts,
    };
  }),

  dateRange: protectedProcedure.query(async ({ ctx }) => {
    const [result] = await db
      .select({
        createdAtMin: min(aiLog.createdAt),
        createdAtMax: max(aiLog.createdAt),
        completedAtMin: min(aiLog.completedAt),
        completedAtMax: max(aiLog.completedAt),
      })
      .from(aiLog)
      .where(organizationCondition(ctx.orgId));

    return {
      createdAtMin: result?.createdAtMin ?? null,
      createdAtMax: result?.createdAtMax ?? null,
      completedAtMin: result?.completedAtMin ?? null,
      completedAtMax: result?.completedAtMax ?? null,
    };
  }),

  filterOptions: protectedProcedure.query(async ({ ctx }) => {
    const logs = await db
      .select({
        intent: aiLog.intent,
        user: {
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          image: userTable.image,
        },
      })
      .from(aiLog)
      .innerJoin(userTable, eq(aiLog.userId, userTable.id))
      .where(organizationCondition(ctx.orgId));

    // Get unique intents (filter out null/empty)
    const intents = Array.from(
      new Set(
        logs
          .map((log) => log.intent)
          .filter((intent): intent is string => !!intent)
      )
    ).sort();

    // Get unique users
    type UserSummary = {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };

    const usersMap = new Map<string, UserSummary>();
    for (const log of logs) {
      if (log.user && !usersMap.has(log.user.id)) {
        usersMap.set(log.user.id, log.user);
      }
    }
    const users = Array.from(usersMap.values());

    return {
      intents,
      users,
    };
  }),
});
