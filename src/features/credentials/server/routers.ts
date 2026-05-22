import { PAGINATION } from "@/config/constants";
import { db } from "@/db";
import { CredentialType } from "@/db/enums";
import { credential as credentialTable } from "@/db/schema";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import z from "zod";
import {
  configureTelegramWebhook,
  removeTelegramWebhook,
} from "@/features/telegram/server/webhook-manager";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, isNull, type SQL } from "drizzle-orm";

type CredentialScopeContext = {
  auth: { user: { id: string } };
  locationId?: string | null;
};

type CredentialRow = typeof credentialTable.$inferSelect;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type SerializedCredential = Omit<CredentialRow, "metadata"> & {
  metadata: JsonValue;
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

const serializeCredential = (
  credential: CredentialRow
): SerializedCredential => ({
  ...credential,
  metadata: toJsonValue(credential.metadata),
});

const credentialScopeConditions = (ctx: CredentialScopeContext): SQL[] => [
  eq(credentialTable.userId, ctx.auth.user.id),
  ctx.locationId
    ? eq(credentialTable.locationId, ctx.locationId)
    : isNull(credentialTable.locationId),
];

const getScopedCredentialOrThrow = async (
  ctx: CredentialScopeContext,
  id: string
) => {
  const [credential] = await db
    .select()
    .from(credentialTable)
    .where(and(eq(credentialTable.id, id), ...credentialScopeConditions(ctx)))
    .limit(1);

  if (!credential) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Credential not found",
    });
  }

  return serializeCredential(credential);
};

export const credentialsRouter = createTRPCRouter({
  create: premiumProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        type: z.enum(CredentialType),
        value: z.string().min(1, "Value is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, value, type } = input;

      const [credential] = await db
        .insert(credentialTable)
        .values({
            id: crypto.randomUUID(),
            name,
            type,
            userId: ctx.auth.user.id,
            locationId: ctx.locationId ?? null,
            value: encrypt(value),
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning();

      if (type === CredentialType.TELEGRAM_BOT) {
        try {
          await configureTelegramWebhook({
            credential,
            token: value,
          });
        } catch (error) {
          await removeTelegramWebhook({ token: value });
          await db
            .delete(credentialTable)
            .where(eq(credentialTable.id, credential.id));
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to configure Telegram webhook",
            cause: error,
          });
        }
      }

      return serializeCredential(credential);
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const credential = await getScopedCredentialOrThrow(ctx, input.id);

      if (credential.type === CredentialType.TELEGRAM_BOT) {
        const token = decrypt(credential.value);
        await removeTelegramWebhook({ token });
      }

      const [deletedCredential] = await db
        .delete(credentialTable)
        .where(eq(credentialTable.id, credential.id))
        .returning();

      return serializeCredential(deletedCredential);
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required"),
        type: z.enum(CredentialType),
        value: z.string().min(1, "Value is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, type, value } = input;

      const existing = await getScopedCredentialOrThrow(ctx, id);

      const [updated] = await db
        .update(credentialTable)
        .set({
            name,
            type,
            value: encrypt(value),
            updatedAt: new Date(),
        })
        .where(eq(credentialTable.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credential not found",
        });
      }

      if (type === CredentialType.TELEGRAM_BOT) {
        try {
          await configureTelegramWebhook({
            credential: updated,
            token: value,
          });
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to configure Telegram webhook",
            cause: error,
          });
        }
      } else if (existing.type === CredentialType.TELEGRAM_BOT) {
        const token = decrypt(existing.value);
        await removeTelegramWebhook({ token });
      }

      return serializeCredential(updated);
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return getScopedCredentialOrThrow(ctx, input.id);
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
      const conditions = credentialScopeConditions(ctx);
      if (search) {
        conditions.push(ilike(credentialTable.name, `%${search}%`));
      }
      const where = and(...conditions);

      const [items, totalCount] = await Promise.all([
        db
          .select()
          .from(credentialTable)
          .where(where)
          .orderBy(desc(credentialTable.updatedAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ totalCount: count() })
          .from(credentialTable)
          .where(where)
          .then(([row]) => row?.totalCount ?? 0),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items: items.map(serializeCredential),
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
  getByType: protectedProcedure
    .input(z.object({ type: z.enum(CredentialType) }))
    .query(async ({ input, ctx }) => {
      const { type } = input;

      const credentials = await db
        .select()
        .from(credentialTable)
        .where(and(eq(credentialTable.type, type), ...credentialScopeConditions(ctx)))
        .orderBy(desc(credentialTable.updatedAt));

      return credentials.map(serializeCredential);
    }),
});
