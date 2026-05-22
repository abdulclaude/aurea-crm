import { PAGINATION } from "@/config/constants";
import { db } from "@/db";
import { WebhookProvider } from "@/db/enums";
import { webhook as webhookTable } from "@/db/schema";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, isNull, type SQL } from "drizzle-orm";
import z from "zod";

type WebhookScopeContext = {
  auth: { user: { id: string } };
  locationId?: string | null;
};

type WebhookRow = typeof webhookTable.$inferSelect;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type SerializedWebhook = Omit<WebhookRow, "metadata" | "signingSecret"> & {
  metadata: JsonValue;
  signingSecret: string | null;
};

const webhookScopeConditions = (ctx: WebhookScopeContext): SQL[] => [
  eq(webhookTable.userId, ctx.auth.user.id),
  ctx.locationId
    ? eq(webhookTable.locationId, ctx.locationId)
    : isNull(webhookTable.locationId),
];

const scopedWebhookWhere = (ctx: WebhookScopeContext, id: string) =>
  and(eq(webhookTable.id, id), ...webhookScopeConditions(ctx));

const webhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.enum(WebhookProvider),
  url: z.string().url("Webhook URL must be a valid URL"),
  description: z.string().max(500).optional().or(z.literal("")),
  signingSecret: z.string().optional().or(z.literal("")),
});

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

const serializeWebhook = (webhook: WebhookRow): SerializedWebhook => ({
  ...webhook,
  metadata: toJsonValue(webhook.metadata),
  signingSecret: webhook.signingSecret ? decrypt(webhook.signingSecret) : null,
});

const getScopedWebhookOrThrow = async (
  ctx: WebhookScopeContext,
  id: string
): Promise<WebhookRow> => {
  const [webhook] = await db
    .select()
    .from(webhookTable)
    .where(scopedWebhookWhere(ctx, id))
    .limit(1);

  if (!webhook) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Webhook not found",
    });
  }

  return webhook;
};

export const webhooksRouter = createTRPCRouter({
  create: premiumProcedure
    .input(webhookSchema)
    .mutation(async ({ ctx, input }) => {
      const [webhook] = await db
        .insert(webhookTable)
        .values({
          id: crypto.randomUUID(),
          name: input.name,
          provider: input.provider,
          url: input.url,
          description: input.description || null,
          signingSecret: input.signingSecret
            ? encrypt(input.signingSecret)
            : null,
          userId: ctx.auth.user.id,
          locationId: ctx.locationId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return serializeWebhook(webhook);
    }),
  update: protectedProcedure
    .input(webhookSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      await getScopedWebhookOrThrow(ctx, id);

      const [webhook] = await db
        .update(webhookTable)
        .set({
          name: rest.name,
          provider: rest.provider,
          url: rest.url,
          description: rest.description || undefined,
          signingSecret: rest.signingSecret ? encrypt(rest.signingSecret) : null,
          updatedAt: new Date(),
        })
        .where(eq(webhookTable.id, id))
        .returning();

      if (!webhook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook not found",
        });
      }

      return serializeWebhook(webhook);
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [webhook] = await db
        .delete(webhookTable)
        .where(scopedWebhookWhere(ctx, input.id))
        .returning();

      if (!webhook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook not found",
        });
      }

      return webhook;
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const webhook = await getScopedWebhookOrThrow(ctx, input.id);

      return serializeWebhook(webhook);
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const conditions = webhookScopeConditions(ctx);
      if (search) {
        conditions.push(ilike(webhookTable.name, `%${search}%`));
      }
      const where = and(...conditions);

      const [items, totalCount] = await Promise.all([
        db
          .select()
          .from(webhookTable)
          .where(where)
          .orderBy(desc(webhookTable.updatedAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ totalCount: count() })
          .from(webhookTable)
          .where(where)
          .then(([row]) => row?.totalCount ?? 0),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items: items.map(serializeWebhook),
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),
  getByProvider: protectedProcedure
    .input(z.object({ provider: z.enum(WebhookProvider) }))
    .query(async ({ ctx, input }) => {
      const items = await db
        .select()
        .from(webhookTable)
        .where(
          and(
            eq(webhookTable.provider, input.provider),
            ...webhookScopeConditions(ctx)
          )
        )
        .orderBy(desc(webhookTable.updatedAt));

      return items.map(serializeWebhook);
    }),
});
