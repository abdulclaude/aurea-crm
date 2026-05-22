import { z } from "zod";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import { db } from "@/db";
import { AILogStatus } from "@/db/enums";
import { aiLog } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import {
  and,
  desc,
  eq,
  isNull,
  lt,
  or,
  type SQL,
} from "drizzle-orm";

const nullableEq = (
  column: typeof aiLog.organizationId | typeof aiLog.locationId,
  value: string | null
): SQL => (value ? eq(column, value) : isNull(column));

type AILogRow = typeof aiLog.$inferSelect;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type SerializedAILog = Omit<AILogRow, "result"> & {
  result: JsonValue;
};

const toJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (typeof value === "object") {
    const result: { [key: string]: JsonValue } = {};
    const record = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(record)) {
      result[key] = toJsonValue(item);
    }
    return result;
  }

  return null;
};

const serializeLog = (log: AILogRow): SerializedAILog => ({
  ...log,
  result: toJsonValue(log.result),
});

export const aiRouter = createTRPCRouter({
  getLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions: SQL[] = [eq(aiLog.userId, ctx.auth.user.id)];
      const contextCondition = or(
        nullableEq(aiLog.organizationId, ctx.orgId),
        nullableEq(aiLog.locationId, ctx.locationId)
      );
      if (contextCondition) {
        conditions.push(contextCondition);
      }

      if (input.cursor) {
        const [cursorLog] = await db
          .select({ id: aiLog.id, createdAt: aiLog.createdAt })
          .from(aiLog)
          .where(and(eq(aiLog.id, input.cursor), eq(aiLog.userId, ctx.auth.user.id)))
          .limit(1);

        if (cursorLog) {
          const cursorCondition = or(
            lt(aiLog.createdAt, cursorLog.createdAt),
            and(eq(aiLog.createdAt, cursorLog.createdAt), lt(aiLog.id, cursorLog.id))
          );

          if (cursorCondition) {
            conditions.push(cursorCondition);
          }
        }
      }

      const logs = await db
        .select()
        .from(aiLog)
        .where(and(...conditions))
        .orderBy(desc(aiLog.createdAt), desc(aiLog.id))
        .limit(input.limit + 1);

      let nextCursor: string | undefined;
      if (logs.length > input.limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: logs.map(serializeLog),
        nextCursor,
      };
    }),

  createLog: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        intent: z.string().optional(),
        userMessage: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [log] = await db
        .insert(aiLog)
        .values({
          id: crypto.randomUUID(),
          title: input.title,
          description: input.description,
          intent: input.intent,
          userMessage: input.userMessage,
          status: AILogStatus.RUNNING,
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
          createdAt: new Date(),
        })
        .returning();

      return serializeLog(log);
    }),

  updateLog: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(AILogStatus),
        error: z.string().optional(),
        result: z.unknown().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [log] = await db
        .update(aiLog)
        .set({
          status: input.status,
          error: input.error,
          result: input.result,
          completedAt:
            input.status === "COMPLETED" || input.status === "FAILED"
            ? new Date()
            : undefined,
        })
        .where(and(eq(aiLog.id, input.id), eq(aiLog.userId, ctx.auth.user.id)))
        .returning();

      if (!log) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AI log not found",
        });
      }

      return serializeLog(log);
    }),

  deleteLog: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [log] = await db
        .delete(aiLog)
        .where(and(eq(aiLog.id, input.id), eq(aiLog.userId, ctx.auth.user.id)))
        .returning();

      if (!log) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AI log not found",
        });
      }

      return serializeLog(log);
    }),
});
